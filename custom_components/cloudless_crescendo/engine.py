"""Fade engine: moves a room along its curve over time."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable, Mapping
import contextlib
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
)
from homeassistant.const import (
    ATTR_ENTITY_ID,
    SERVICE_TURN_OFF,
    SERVICE_TURN_ON,
    STATE_OFF,
)
from homeassistant.core import Context, HomeAssistant
from homeassistant.util import color as color_util

from .const import STOP_TRANSITION
from .curve import MODE_CT, LightState, RoomCurve, Segment

_LOGGER = logging.getLogger(__name__)

_COLOR_MODES = {ColorMode.HS, ColorMode.XY, ColorMode.RGB, ColorMode.RGBW, ColorMode.RGBWW}


def build_service_call(
    entity_id: str,
    state: LightState,
    transition: float,
    attributes: Mapping[str, Any] | None = None,
) -> tuple[str, dict[str, Any]]:
    """Translate a target light state into a light service call.

    Home Assistant converts colors into whatever the target light supports and
    drops them for brightness-only lights. The one case handled here is a
    warm/cold-only light: colors are converted to a color temperature and
    clamped to the light's range, so it never receives an impossible value.
    """
    data: dict[str, Any] = {ATTR_ENTITY_ID: entity_id}
    transition = round(transition, 1)
    if transition > 0:
        data[ATTR_TRANSITION] = transition

    if not state.is_on:
        return SERVICE_TURN_OFF, data

    data[ATTR_BRIGHTNESS] = max(1, min(255, round(state.brightness * 255 / 100)))
    if state.color is None:
        return SERVICE_TURN_ON, data

    modes = set((attributes or {}).get(ATTR_SUPPORTED_COLOR_MODES) or ())
    ct_only = ColorMode.COLOR_TEMP in modes and not (modes & _COLOR_MODES)
    if state.color.mode == MODE_CT or ct_only:
        if state.color.mode == MODE_CT:
            assert state.color.kelvin is not None
            kelvin = state.color.kelvin
        else:
            kelvin = color_util.color_xy_to_temperature(*state.color.as_xy())
        low = (attributes or {}).get(ATTR_MIN_COLOR_TEMP_KELVIN)
        high = (attributes or {}).get(ATTR_MAX_COLOR_TEMP_KELVIN)
        if ColorMode.COLOR_TEMP in modes and low and high:
            kelvin = max(low, min(high, kelvin))
        data[ATTR_COLOR_TEMP_KELVIN] = round(kelvin)
    else:
        x, y = state.color.as_xy()
        data[ATTR_XY_COLOR] = (round(x, 4), round(y, 4))
    return SERVICE_TURN_ON, data


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
        self._target: float | None = None
        self._fade_end: float | None = None
        self._segment: Segment | None = None
        self._segment_started = 0.0
        self._task: asyncio.Task | None = None
        self.context: Context | None = None
        # Replaceable in tests.
        self.sleep: Callable[[float], Awaitable[None]] = asyncio.sleep
        self.now: Callable[[], float] = hass.loop.time

    @property
    def position(self) -> float:
        """Current position, interpolated inside a running segment."""
        segment = self._segment
        if segment is None:
            return self._position
        if segment.duration <= 0:
            return segment.end
        fraction = min(1.0, max(0.0, (self.now() - self._segment_started) / segment.duration))
        return segment.start + (segment.end - segment.start) * fraction

    @property
    def target(self) -> float | None:
        """Target of the running fade, if any."""
        return self._target

    @property
    def fading(self) -> bool:
        """Return True while a fade is running."""
        return self._target is not None

    @property
    def remaining(self) -> float | None:
        """Seconds until the running fade ends."""
        if not self.fading or self._fade_end is None:
            return None
        return max(0.0, self._fade_end - self.now())

    def restore(self, position: float) -> None:
        """Set the position without sending commands (after a restart)."""
        self._position = max(0.0, min(100.0, position))

    async def async_fade_to(self, target: float, duration: float) -> None:
        """Start a fade to ``target``; a running fade is replaced."""
        target = max(0.0, min(100.0, target))
        await self._async_cancel()
        self._target = target
        self._fade_end = self.now() + max(0.0, duration)
        self._task = self.hass.async_create_background_task(
            self._async_run(target, duration),
            name=f"cloudless_crescendo fade to {target}",
        )
        # Give the first segment a chance to start before returning.
        await asyncio.sleep(0)

    async def async_stop(self) -> None:
        """Stop a running fade and hold the lights where they are."""
        if not self.fading:
            return
        await self._async_cancel()
        self._send_states(self.position, None, STOP_TRANSITION, force=True)
        self._on_change()

    async def async_shutdown(self) -> None:
        """Cancel everything (entity removed)."""
        await self._async_cancel()

    async def _async_cancel(self) -> None:
        task = self._task
        if task is None or task.done():
            self._task = None
            return
        position = self.position
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
        self._task = None
        self._segment = None
        self._position = position
        self._target = None
        self._fade_end = None

    async def _async_run(self, target: float, duration: float) -> None:
        segments = self.curve.plan(self._position, target, duration, self.max_segment)
        first = True
        try:
            for segment in segments:
                self._segment = segment
                self._segment_started = self.now()
                self._send_states(segment.end, segment.start, segment.duration, force=first)
                first = False
                self._on_change()
                await self.sleep(segment.duration)
                self._position = segment.end
                self._segment = None
            self._target = None
            self._fade_end = None
        finally:
            if self._segment is None:
                self._on_change()

    def _send_states(
        self,
        position: float,
        previous: float | None,
        transition: float,
        *,
        force: bool,
    ) -> None:
        """Send every light that changes the state it should have at ``position``."""
        states = self.curve.states_at(position)
        previous_states = self.curve.states_at(previous) if previous is not None else {}
        for entity_id, state in states.items():
            if (
                not force
                and entity_id in previous_states
                and state.is_close(previous_states[entity_id])
            ):
                continue
            current = self.hass.states.get(entity_id)
            if not state.is_on and current is not None and current.state == STATE_OFF:
                continue
            service, data = build_service_call(
                entity_id, state, transition, current.attributes if current else None
            )
            self.hass.async_create_background_task(
                self._async_call(service, data),
                name=f"cloudless_crescendo {service} {entity_id}",
            )

    async def _async_call(self, service: str, data: dict[str, Any]) -> None:
        try:
            await self.hass.services.async_call(
                LIGHT_DOMAIN, service, data, blocking=True, context=self.context
            )
        except Exception:
            _LOGGER.warning(
                "Calling light.%s for %s failed", service, data.get(ATTR_ENTITY_ID), exc_info=True
            )
