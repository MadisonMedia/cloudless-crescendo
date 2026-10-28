"""Fade engine: moves a room along its curve over time.

A fade is planned per light. Each light only gets a command at its own
keyframes (plus splits of very long legs), with a transition that matches the
time until its next keyframe. Three details keep fades smooth on real
hardware:

* **Fading out** never uses ``turn_off`` with a transition (several
  integrations, Matter among them, switch off instantly). The light fades to
  its minimum and is switched off when it arrives there.
* **Fading in** from off first sets the light to its minimum level in the
  target color, so it cannot flash up at its previous brightness or color.
* **Follow-up commands** are sent slightly early with a slightly longer
  transition, so a light never stalls while the next command travels through
  the network.

Lights without transition support get small software steps instead.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable, Mapping
import contextlib
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import itertools
import logging
from typing import Any

from homeassistant.components.light import (
    ATTR_BRIGHTNESS,
    ATTR_COLOR_TEMP_KELVIN,
    ATTR_MAX_COLOR_TEMP_KELVIN,
    ATTR_MIN_COLOR_TEMP_KELVIN,
    ATTR_SUPPORTED_COLOR_MODES,
    ATTR_TRANSITION,
    ATTR_XY_COLOR,
    DOMAIN as LIGHT_DOMAIN,
    ColorMode,
    LightEntityFeature,
)
from homeassistant.const import (
    ATTR_ENTITY_ID,
    ATTR_SUPPORTED_FEATURES,
    SERVICE_TURN_OFF,
    SERVICE_TURN_ON,
    STATE_OFF,
    STATE_ON,
)
from homeassistant.core import Context, HomeAssistant
from homeassistant.util import dt as dt_util

from .const import COMMAND_LEAD, PROGRESS_INTERVAL, SOFTWARE_STEP, STOP_TRANSITION
from .curve import SPACE_CT, Color, LightCurve, RoomCurve, split_duration, xy_to_kelvin

_LOGGER = logging.getLogger(__name__)

_EPSILON = 1e-6
_COLOR_MODES = {ColorMode.HS, ColorMode.XY, ColorMode.RGB, ColorMode.RGBW, ColorMode.RGBWW}
_MIN_BRIGHTNESS = 1


@dataclass(frozen=True, slots=True)
class Command:
    """One light service call."""

    service: str
    data: dict[str, Any]


@dataclass(order=True, slots=True)
class Event:
    """Commands for one light at a point in time (seconds after fade start)."""

    time: float
    order: int
    entity_id: str = field(compare=False)
    commands: list[Command] = field(compare=False)


def _color_data(color: Color | None, attributes: Mapping[str, Any] | None) -> dict[str, Any]:
    """Color part of a turn_on call, adapted to what the light can do."""
    if color is None:
        return {}
    attributes = attributes or {}
    modes = set(attributes.get(ATTR_SUPPORTED_COLOR_MODES) or ())
    ct_only = ColorMode.COLOR_TEMP in modes and not (modes & _COLOR_MODES)
    if color.space == SPACE_CT or ct_only:
        kelvin = color.kelvin if color.space == SPACE_CT else xy_to_kelvin(color.as_xy())
        assert kelvin is not None
        low = attributes.get(ATTR_MIN_COLOR_TEMP_KELVIN)
        high = attributes.get(ATTR_MAX_COLOR_TEMP_KELVIN)
        if ColorMode.COLOR_TEMP in modes and low and high:
            kelvin = max(low, min(high, kelvin))
        return {ATTR_COLOR_TEMP_KELVIN: round(kelvin)}
    x, y = color.as_xy()
    return {ATTR_XY_COLOR: (round(x, 4), round(y, 4))}


def turn_on_command(
    entity_id: str,
    brightness_pct: float | None,
    color: Color | None,
    transition: float,
    attributes: Mapping[str, Any] | None = None,
) -> Command:
    """Build a turn_on command. ``brightness_pct=None`` means minimum level."""
    data: dict[str, Any] = {ATTR_ENTITY_ID: entity_id}
    if brightness_pct is None:
        data[ATTR_BRIGHTNESS] = _MIN_BRIGHTNESS
    else:
        data[ATTR_BRIGHTNESS] = max(_MIN_BRIGHTNESS, min(255, round(brightness_pct * 255 / 100)))
    data.update(_color_data(color, attributes))
    transition = round(max(0.0, transition), 1)
    if transition > 0:
        data[ATTR_TRANSITION] = transition
    return Command(SERVICE_TURN_ON, data)


def turn_off_command(entity_id: str) -> Command:
    """Build an instant turn_off command."""
    return Command(SERVICE_TURN_OFF, {ATTR_ENTITY_ID: entity_id})


@dataclass(frozen=True, slots=True)
class LightInfo:
    """What the engine needs to know about a real light right now."""

    is_on: bool
    supports_transition: bool
    attributes: Mapping[str, Any] | None

    @classmethod
    def from_hass(cls, hass: HomeAssistant, entity_id: str) -> LightInfo:
        """Read the current state of a light."""
        state = hass.states.get(entity_id)
        if state is None:
            return cls(is_on=False, supports_transition=True, attributes=None)
        features = int(state.attributes.get(ATTR_SUPPORTED_FEATURES) or 0)
        return cls(
            is_on=state.state == STATE_ON,
            supports_transition=bool(features & LightEntityFeature.TRANSITION)
            or state.state not in (STATE_ON, STATE_OFF),
            attributes=state.attributes,
        )


Leg = tuple[float, float, float, float]
"""(start position, end position, start time, end time) of one light command."""


def _legs(
    light_curve: LightCurve,
    start: float,
    target: float,
    duration: float,
    piece: float,
) -> list[Leg]:
    """Legs between a light's own keyframes; long legs are split."""
    distance = abs(target - start)
    if distance < _EPSILON:
        return [(start, start, 0.0, duration)]

    def time_at(position: float) -> float:
        return duration * abs(position - start) / distance

    legs: list[Leg] = []
    points = [start, *light_curve.breakpoints_between(start, target), target]
    for a, b in itertools.pairwise(points):
        ta, tb = time_at(a), time_at(b)
        pieces = split_duration(tb - ta, piece)
        legs.extend(
            (
                a + (b - a) * i / pieces,
                a + (b - a) * (i + 1) / pieces,
                ta + (tb - ta) * i / pieces,
                ta + (tb - ta) * (i + 1) / pieces,
            )
            for i in range(pieces)
        )
    return legs


def _plan_light(
    light_curve: LightCurve, legs: list[Leg], info: LightInfo
) -> list[tuple[float, list[Command]]]:
    """Commands for one light as (time, commands)."""
    entity_id = light_curve.entity_id
    attributes = info.attributes
    planned: list[tuple[float, list[Command]]] = []
    lit = info.is_on
    moving_until: float | None = None  # end time of the running transition
    previous_leg = 0.0

    for index, (pa, pb, ta, tb) in enumerate(legs):
        sa = light_curve.state_at(pa)
        sb = light_curve.state_at(pb)
        leg = tb - ta
        if index > 0 and sa.is_close(sb) and lit == sb.is_on:
            moving_until = None
            continue

        if not info.supports_transition:
            if sb.is_on:
                planned.append(
                    (ta, [turn_on_command(entity_id, sb.brightness, sb.color, 0, attributes)])
                )
            elif lit:
                planned.append((ta, [turn_off_command(entity_id)]))
            lit = sb.is_on
            continue

        # Continue a running transition slightly early so the light never stalls.
        lead = 0.0
        if moving_until is not None and abs(moving_until - ta) < _EPSILON:
            lead = min(COMMAND_LEAD, previous_leg / 2)
        previous_leg = leg

        if sb.is_on:
            commands: list[Command] = []
            if not lit:
                # Start from the minimum in the right color, never from old values.
                commands.append(
                    turn_on_command(entity_id, None, sa.color or sb.color, 0, attributes)
                )
                lead = 0.0
                lit = True
            commands.append(
                turn_on_command(entity_id, sb.brightness, sb.color, leg + lead, attributes)
            )
            planned.append((ta - lead, commands))
            moving_until = tb
            continue

        if not lit:
            moving_until = None
            continue
        # Fade to the minimum, then switch off - unless the light comes right back up.
        next_on = index + 1 < len(legs) and light_curve.state_at(legs[index + 1][1]).is_on
        moving_until = None
        if leg >= 0.05:
            planned.append(
                (ta - lead, [turn_on_command(entity_id, None, sb.color, leg + lead, attributes)])
            )
            if next_on:
                moving_until = tb
        if not next_on:
            planned.append((tb, [turn_off_command(entity_id)]))
            lit = False

    return planned


def plan_fade(
    curve: RoomCurve,
    start: float,
    target: float,
    duration: float,
    *,
    lights: Mapping[str, LightInfo],
    max_segment: float,
) -> list[Event]:
    """Plan all commands for a fade from ``start`` to ``target``."""
    duration = max(0.0, duration)
    events: list[Event] = []
    for entity_id, light_curve in curve.curves.items():
        info = lights.get(entity_id) or LightInfo(False, True, None)
        piece = max_segment if info.supports_transition else SOFTWARE_STEP
        legs = _legs(light_curve, start, target, duration, piece)
        events.extend(
            Event(time, len(events) + i, entity_id, commands)
            for i, (time, commands) in enumerate(_plan_light(light_curve, legs, info))
        )
    events.sort()
    return events


def settle_commands(
    curve: RoomCurve,
    position: float,
    transition: float,
    lights: Mapping[str, LightInfo],
) -> dict[str, list[Command]]:
    """Commands that put every light directly at its state for ``position``."""
    result: dict[str, list[Command]] = {}
    for entity_id, state in curve.states_at(position).items():
        info = lights.get(entity_id) or LightInfo(False, True, None)
        if state.is_on:
            result[entity_id] = [
                turn_on_command(
                    entity_id, state.brightness, state.color, transition, info.attributes
                )
            ]
        elif info.is_on:
            result[entity_id] = [turn_off_command(entity_id)]
    return result


@dataclass(slots=True)
class FadeInfo:
    """A running fade."""

    start: float
    target: float
    duration: float
    started: float  # loop time
    started_at: datetime  # wall clock


class FadeEngine:
    """Runs fades for one room and tracks the current position."""

    def __init__(
        self,
        hass: HomeAssistant,
        curve: RoomCurve,
        max_segment: float,
        on_change: Callable[[], None],
    ) -> None:
        """Initialize the engine."""
        self.hass = hass
        self.curve = curve
        self.max_segment = max_segment
        self._on_change = on_change
        self._position = 0.0
        self._fade: FadeInfo | None = None
        self._task: asyncio.Task | None = None
        self._locks: dict[str, asyncio.Lock] = {}
        self.context: Context | None = None
        # Replaceable in tests.
        self.sleep: Callable[[float], Awaitable[None]] = asyncio.sleep
        self.now: Callable[[], float] = hass.loop.time

    # -- state -----------------------------------------------------------------

    @property
    def fade(self) -> FadeInfo | None:
        """The running fade, if any."""
        return self._fade

    @property
    def fading(self) -> bool:
        """Return True while a fade is running."""
        return self._fade is not None

    @property
    def position(self) -> float:
        """Current position, interpolated during a fade."""
        fade = self._fade
        if fade is None:
            return self._position
        if fade.duration <= 0:
            return fade.target
        fraction = min(1.0, max(0.0, (self.now() - fade.started) / fade.duration))
        return fade.start + (fade.target - fade.start) * fraction

    @property
    def target(self) -> float | None:
        """Target of the running fade."""
        return self._fade.target if self._fade else None

    @property
    def remaining(self) -> float | None:
        """Seconds until the running fade ends."""
        fade = self._fade
        if fade is None:
            return None
        return max(0.0, fade.started + fade.duration - self.now())

    @property
    def ends_at(self) -> datetime | None:
        """Wall clock time the running fade ends."""
        fade = self._fade
        if fade is None:
            return None
        return fade.started_at + timedelta(seconds=fade.duration)

    def restore(self, position: float) -> None:
        """Set the position without sending commands."""
        self._position = max(0.0, min(100.0, position))

    # -- control -----------------------------------------------------------------

    def light_infos(self, curve: RoomCurve | None = None) -> dict[str, LightInfo]:
        """Current info for all lights of a curve."""
        curve = curve or self.curve
        return {eid: LightInfo.from_hass(self.hass, eid) for eid in curve.entity_ids}

    async def async_fade_to(self, target: float, duration: float) -> None:
        """Start a fade to ``target``; a running fade is replaced."""
        target = max(0.0, min(100.0, target))
        duration = max(0.0, duration)
        await self._async_cancel()
        start = self._position
        events = plan_fade(
            self.curve,
            start,
            target,
            duration,
            lights=self.light_infos(),
            max_segment=self.max_segment,
        )
        self._fade = FadeInfo(start, target, duration, self.now(), dt_util.utcnow())
        self._task = self.hass.async_create_background_task(
            self._async_run(events), name=f"cloudless_crescendo fade to {target}"
        )
        await asyncio.sleep(0)

    async def async_stop(self) -> None:
        """Stop a running fade and hold the lights where they are."""
        if not self.fading:
            return
        await self._async_cancel()
        self.dispatch(
            settle_commands(self.curve, self._position, STOP_TRANSITION, self.light_infos())
        )
        self._on_change()

    async def async_shutdown(self) -> None:
        """Cancel everything (entity removed)."""
        await self._async_cancel()

    async def _async_cancel(self) -> None:
        if self._fade is not None:
            self._position = self.position
        self._fade = None
        task, self._task = self._task, None
        if task is not None and not task.done():
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task

    async def _async_run(self, events: list[Event]) -> None:
        fade = self._fade
        assert fade is not None
        next_progress = fade.started + PROGRESS_INTERVAL
        self._on_change()

        async def wait_until(deadline: float) -> None:
            nonlocal next_progress
            while (remaining := deadline - self.now()) > _EPSILON:
                await self.sleep(min(remaining, max(_EPSILON, next_progress - self.now())))
                if self.now() >= next_progress - _EPSILON:
                    next_progress += PROGRESS_INTERVAL
                    self._on_change()

        for event in events:
            await wait_until(fade.started + event.time)
            self.dispatch({event.entity_id: event.commands})
        await wait_until(fade.started + fade.duration)
        self._position = fade.target
        self._fade = None
        self._task = None
        self._on_change()

    def dispatch(self, commands: Mapping[str, list[Command]]) -> None:
        """Send commands; calls for the same light stay in order."""
        for entity_id, light_commands in commands.items():
            lock = self._locks.setdefault(entity_id, asyncio.Lock())
            self.hass.async_create_background_task(
                self._async_send(lock, light_commands),
                name=f"cloudless_crescendo {entity_id}",
            )

    async def _async_send(self, lock: asyncio.Lock, commands: list[Command]) -> None:
        async with lock:
            for command in commands:
                try:
                    await self.hass.services.async_call(
                        LIGHT_DOMAIN,
                        command.service,
                        command.data,
                        blocking=True,
                        context=self.context,
                    )
                except Exception:
                    _LOGGER.warning(
                        "light.%s for %s failed",
                        command.service,
                        command.data.get(ATTR_ENTITY_ID),
                        exc_info=True,
                    )
