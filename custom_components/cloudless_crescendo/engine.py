"""The runtime of one object: position, fades, slider, color, single lights and devices."""

from __future__ import annotations

import asyncio
from collections.abc import Callable, Iterable, Mapping
import contextlib
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging
import math
import time
from typing import Any

from homeassistant.const import (
    ATTR_ENTITY_ID,
    EVENT_CALL_SERVICE,
    STATE_OFF,
    STATE_ON,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import Context, Event, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util

from .const import (
    CONF_DEVICES,
    CONF_ON_MODE,
    CONF_ON_POSITION,
    CONF_SLIDER_RATE,
    DEFAULT_SLIDER_RATE,
    DEVICE_MIN_INTERVAL,
    DEVICE_RAMP,
    DEVICE_THRESHOLD,
    DIRECT_SLIDER_MANUFACTURERS,
    DOMAIN,
    MODE_CCT,
    MODE_DIM,
    MODE_ONOFF,
    ON_FIXED,
    PROGRESS_INTERVAL,
    SETTLE_TRANSITION,
    SLIDER_AUTO,
    SLIDER_DIRECT,
    SLIDER_GLIDE_FACTOR,
    SLIDER_SETTLE,
    VERIFY_DELAY,
)
from .curve import LightCurve, ObjectCurve, Target, curve_from_options, kelvin_to_xy
from .planner import OFF, Command, Step, minimum_command, on_command, plan_fade, settle
from .sender import Sender

_LOGGER = logging.getLogger(__name__)

NOT_FOLLOWING = Target(-1.0)
"""Stands for a light that left the curve, so it differs from every state on it."""


@dataclass(slots=True)
class Fade:
    """A running fade."""

    start: float
    target: float
    duration: float
    started: float
    started_at: datetime

    def position(self, now: float) -> float:
        """Return the position at a monotonic time."""
        if self.duration <= 0:
            return self.target
        return self.start + (self.target - self.start) * min(1.0, max(0.0, (now - self.started) / self.duration))


@dataclass(slots=True)
class DeviceStep:
    """A device action at a time after the fade's start."""

    time: float
    device: Mapping[str, Any]
    value: float | None = None
    action: str | None = None


def ramp_value(device: Mapping[str, Any], position: float) -> float:
    """Return a ramp device's value at a position."""
    start, end = float(device["from"]), float(device["to"])
    if position <= start or end <= start:
        return float(device["min"])
    t = min(1.0, (position - start) / (end - start))
    return float(device["min"]) + (float(device["max"]) - float(device["min"])) * t


def threshold_steps(
    devices: Iterable[Mapping[str, Any]], start: float, target: float, duration: float
) -> list[DeviceStep]:
    """Plan threshold actions and ramp values for a fade."""
    steps: list[DeviceStep] = []
    distance = abs(target - start)
    for device in devices:
        if device["kind"] == DEVICE_THRESHOLD:
            at = float(device["at"])
            if start < at <= target and device.get("action"):
                steps.append(DeviceStep(duration * (at - start) / distance, device, action=device["action"]))
            elif target < at <= start and device.get("back"):
                steps.append(DeviceStep(duration * (start - at) / distance, device, action=device["back"]))
        elif device["kind"] == DEVICE_RAMP:
            first, last = ramp_value(device, start), ramp_value(device, target)
            if abs(first - last) < 1e-6:
                continue
            count = max(1, min(math.ceil(abs(first - last)), math.floor(duration / DEVICE_MIN_INTERVAL)))
            steps.extend(
                DeviceStep(duration * i / count, device, value=ramp_value(device, start + (target - start) * i / count))
                for i in range(1, count + 1)
            )
    return steps


_RAMP_ACTIONS: dict[str, Callable[[float], tuple[str, dict[str, Any]]]] = {
    "media_player": lambda v: ("volume_set", {"volume_level": round(max(0.0, min(100.0, v)) / 100, 3)}),
    "climate": lambda v: ("set_temperature", {"temperature": round(v * 2) / 2}),
    "cover": lambda v: ("set_cover_position", {"position": round(v)}),
    "fan": lambda v: ("set_percentage", {"percentage": round(v)}),
    "number": lambda v: ("set_value", {"value": v}),
    "input_number": lambda v: ("set_value", {"value": v}),
    "light": lambda v: ("turn_on", {"brightness_pct": round(v)}),
}


class Engine:
    """Moves an object's lights and devices."""

    def __init__(self, hass: HomeAssistant, options: Mapping[str, Any], on_change: Callable[[], None]) -> None:
        """Initialize."""
        self.hass = hass
        self._on_change = on_change
        self.context = Context()
        self.sender = Sender(hass, self._network_of, self.context)
        self.options: Mapping[str, Any] = options
        self.base_curve: ObjectCurve = curve_from_options(options)
        self.position = 0.0
        self.last_on = 100.0
        self.external_on_position: float | None = None
        self.fade: Fade | None = None
        self.override: dict[str, Any] | None = None
        self.deviating: dict[str, float] = {}
        self.last_targets: dict[str, Target] = {}
        self._task: asyncio.Task | None = None
        self._slider_task: asyncio.Task | None = None
        self._slider_last = 0.0
        self._slider_start: float | None = None
        self._device_last: dict[str, float] = {}
        self._device_sent: dict[str, float] = {}
        self._network_cache: dict[str, str] = {}
        self._slider_cache: dict[str, bool] = {}
        self._unsubscribe: list[Callable[[], None]] = []

    # -- setup -------------------------------------------------------------------

    def start(self) -> None:
        """Start listening to the lights."""
        self.hass.data.setdefault(DOMAIN, {}).setdefault("engines", set()).add(self)
        self._unsubscribe.append(self.hass.bus.async_listen(EVENT_CALL_SERVICE, self._on_service_call))
        self._watch_lights()

    def _watch_lights(self) -> None:
        while len(self._unsubscribe) > 1:
            self._unsubscribe.pop()()
        if self.base_curve.lights:
            self._unsubscribe.append(
                async_track_state_change_event(self.hass, list(self.base_curve.lights), self._on_light_state)
            )

    async def async_shutdown(self) -> None:
        """Stop everything; the object is unloaded."""
        self.hass.data.get(DOMAIN, {}).get("engines", set()).discard(self)
        for unsubscribe in self._unsubscribe:
            unsubscribe()
        self._unsubscribe.clear()
        await self._cancel_tasks()
        await self.sender.async_close()

    def apply_options(self, options: Mapping[str, Any]) -> None:
        """Use new options without interrupting the object."""
        self.options = options
        self.base_curve = curve_from_options(options)
        for eid in list(self.last_targets):
            if eid not in self.base_curve.lights:
                del self.last_targets[eid]
        self._slider_cache.clear()
        self._watch_lights()
        if self.fade is None and self.position > 0:
            self.follow_curve()
        self._on_change()

    # -- helpers -----------------------------------------------------------------

    @property
    def curve(self) -> ObjectCurve:
        """Return the curve including a chosen color."""
        if self.override is None:
            return self.base_curve
        lights = {eid: _with_color(light, self.override) for eid, light in self.base_curve.lights.items()}
        return ObjectCurve(self.base_curve.positions, lights)

    def _network_of(self, entity_id: str) -> str:
        cached = self._network_cache.get(entity_id)
        if cached is None:
            entry = er.async_get(self.hass).async_get(entity_id)
            cached = entry.platform if entry is not None else "unknown"
            self._network_cache[entity_id] = cached
        return cached

    def _is_direct(self, light: LightCurve) -> bool:
        """Return True if a light follows the slider with direct steps instead of gliding."""
        if light.slider != SLIDER_AUTO:
            return light.slider == SLIDER_DIRECT
        cached = self._slider_cache.get(light.entity_id)
        if cached is None:
            cached = False
            entry = er.async_get(self.hass).async_get(light.entity_id)
            if entry is not None and entry.device_id:
                device = dr.async_get(self.hass).async_get(entry.device_id)
                cached = device is not None and device.manufacturer in DIRECT_SLIDER_MANUFACTURERS
            self._slider_cache[light.entity_id] = cached
        return cached

    def _lit(self) -> dict[str, bool]:
        """Return which lights are on, trusting what was just sent over a late report."""
        lit: dict[str, bool] = {}
        now = time.monotonic()
        for eid in self.base_curve.lights:
            sent = self.sender.last_send.get(eid)
            if sent is not None and now - sent < VERIFY_DELAY * 2 and eid in self.sender.expected_on:
                lit[eid] = self.sender.expected_on[eid]
                continue
            state = self.hass.states.get(eid)
            lit[eid] = state is not None and state.state == STATE_ON
        return lit

    def current_position(self) -> float:
        """Return the position, interpolated during a fade."""
        if self.fade is not None:
            return self.fade.position(time.monotonic())
        return self.position

    @property
    def remaining(self) -> float | None:
        """Return the seconds until the fade ends."""
        fade = self.fade
        if fade is None:
            return None
        return max(0.0, fade.started + fade.duration - time.monotonic())

    @property
    def ends_at(self) -> datetime | None:
        """Return when the fade ends."""
        fade = self.fade
        return None if fade is None else fade.started_at + timedelta(seconds=fade.duration)

    def on_position(self) -> float:
        """Return where the object goes when switched on without a position."""
        if self.external_on_position is not None:
            return self.external_on_position
        if self.options.get(CONF_ON_MODE) == ON_FIXED:
            return float(self.options.get(CONF_ON_POSITION, self.last_on))
        return self.last_on

    def _claim(self) -> None:
        """The last command wins: another object's fade over the same lights stops."""
        own = set(self.base_curve.lights)
        for other in self.hass.data.get(DOMAIN, {}).get("engines", ()):
            if other is not self and (other.fade is not None) and own & set(other.base_curve.lights):
                other.interrupted()

    @callback
    def interrupted(self) -> None:
        """Stop this object's fade without touching its lights."""
        self.position = self.current_position()
        self.fade = None
        if self._task is not None:
            self._task.cancel()
            self._task = None
        self._on_change()

    async def _cancel_tasks(self) -> None:
        for name in ("_task", "_slider_task"):
            task = getattr(self, name)
            setattr(self, name, None)
            if task is not None and not task.done():
                task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await task

    def _send_step(self, step: Step) -> None:
        self.sender.send(step.entity_id, step.commands, step.transition)
        if step.target is not None:
            self.last_targets[step.entity_id] = step.target

    def restore(self, position: float, last_on: float | None) -> None:
        """Set the position after a restart without sending anything."""
        self.position = max(0.0, min(100.0, position))
        if last_on:
            self.last_on = last_on

    # -- fades -------------------------------------------------------------------

    async def async_fade_to(self, target: float, duration: float) -> None:
        """Move to a position over a duration. Replaces whatever is running."""
        target = max(0.0, min(100.0, target))
        duration = max(0.0, duration)
        start = self.current_position()
        await self._cancel_tasks()
        self.fade = None
        self.position = start
        self._slider_start = None
        self._claim()
        last = dict(self.last_targets)
        for eid in self.deviating:
            last[eid] = NOT_FOLLOWING
        self.deviating.clear()
        if start > 0 and target == 0:
            self.last_on = start
        elif target > 0:
            self.last_on = target
        steps = plan_fade(self.curve, start, target, duration, lit=self._lit(), last=last)
        device_steps = threshold_steps(self.options.get(CONF_DEVICES, ()), start, target, duration)
        if duration <= 0 and not device_steps and not steps:
            self.position = target
            self._on_change()
            return
        self.fade = Fade(start, target, duration, time.monotonic(), dt_util.utcnow())
        self._task = self.hass.async_create_background_task(
            self._run_fade(self.fade, steps, device_steps), f"cloudless_crescendo fade to {target}"
        )
        self._on_change()
        await asyncio.sleep(0)

    async def _run_fade(self, fade: Fade, steps: list[Step], device_steps: list[DeviceStep]) -> None:
        timeline: list[tuple[float, int, Step | DeviceStep]] = [
            *((s.time, i, s) for i, s in enumerate(steps)),
            *((s.time, len(steps) + i, s) for i, s in enumerate(device_steps)),
        ]
        timeline.sort(key=lambda item: (item[0], item[1]))
        next_progress = fade.started + PROGRESS_INTERVAL
        for when, _order, step in timeline:
            due = fade.started + when
            while (wait := due - time.monotonic()) > 0:
                await asyncio.sleep(min(wait, max(0.05, next_progress - time.monotonic())))
                if time.monotonic() >= next_progress:
                    next_progress += PROGRESS_INTERVAL
                    self._on_change()
            if not isinstance(step, Step):
                self._run_device(step)
            elif step.entity_id not in self.deviating:
                # A light changed by hand since the fade began stays out until the next command.
                self._send_step(step)
        end = fade.started + fade.duration
        while (wait := end - time.monotonic()) > 0:
            await asyncio.sleep(min(wait, max(0.05, next_progress - time.monotonic())))
            if time.monotonic() >= next_progress:
                next_progress += PROGRESS_INTERVAL
                self._on_change()
        if self.fade is fade:
            self.position = fade.target
            self.fade = None
            if fade.target <= 0:
                self.override = None
            self._task = None
            self._on_change()

    async def async_stop(self) -> None:
        """Stop a fade and hold the lights where they are."""
        if self.fade is None:
            return
        position = self.current_position()
        await self._cancel_tasks()
        self.fade = None
        self.position = position
        if position > 0:
            self.last_on = position
        for step in settle(self.curve, position, self._lit(), SETTLE_TRANSITION, skip=self.deviating):
            self._send_step(step)
        self._on_change()

    def follow_curve(self) -> None:
        """Bring the lights to the current position, for changes that do not move it."""
        position = self.current_position()
        for step in settle(self.curve, position, self._lit(), SETTLE_TRANSITION, skip=self.deviating):
            self._send_step(step)

    # -- slider ------------------------------------------------------------------

    def set_position(self, position: float, *, final: bool = False) -> None:
        """Follow a hand on a slider."""
        position = max(0.0, min(100.0, position))
        if self._task is not None:
            self._task.cancel()
            self._task = None
        if self.fade is not None:
            self.position = self.current_position()
            self.fade = None
        if self._slider_start is None:
            self._slider_start = self.position
            self._claim()
            for eid in self.deviating:
                self.last_targets[eid] = NOT_FOLLOWING
            self.deviating.clear()
        self.position = position
        self._slider_last = time.monotonic()
        if final:
            if self._slider_task is not None:
                self._slider_task.cancel()
                self._slider_task = None
            self._finish_slider()
            return
        if self._slider_task is None or self._slider_task.done():
            self._slider_task = self.hass.async_create_background_task(self._run_slider(), "cloudless_crescendo slider")
        self._on_change()

    @property
    def _slider_interval(self) -> float:
        return 1.0 / max(1, int(self.options.get(CONF_SLIDER_RATE, DEFAULT_SLIDER_RATE)))

    async def _run_slider(self) -> None:
        while True:
            self._slider_tick(self._slider_interval)
            await asyncio.sleep(self._slider_interval)
            if time.monotonic() - self._slider_last > SLIDER_SETTLE:
                self._slider_task = None
                self._finish_slider()
                return

    def _slider_tick(self, interval: float) -> None:
        curve = self.curve
        lit = self._lit()
        for eid, light in curve.lights.items():
            if eid in self.deviating:
                continue
            state = light.at(self.position)
            if not state.is_on and not lit[eid]:
                self.last_targets[eid] = state
                continue
            before = self.last_targets.get(eid)
            if before is not None and _barely_differs(before, state) and lit[eid] == state.is_on:
                continue
            direct = self._is_direct(light) or interval <= 0
            transition = 0.0 if direct else interval * SLIDER_GLIDE_FACTOR
            self._send_step(_step_to(light, state, lit[eid], transition))
        self._ramp_devices(self.position, respect_interval=True)

    def _finish_slider(self) -> None:
        start = self._slider_start if self._slider_start is not None else self.position
        self._slider_start = None
        self._slider_tick(0.0)
        self._ramp_devices(self.position, respect_interval=False)
        for step in threshold_steps(
            [d for d in self.options.get(CONF_DEVICES, ()) if d["kind"] == DEVICE_THRESHOLD], start, self.position, 0.0
        ):
            self._run_device(step)
        if self.position > 0:
            self.last_on = self.position
        else:
            self.override = None
        self._on_change()

    # -- color and single lights -------------------------------------------------

    async def async_set_color(self, kelvin: float | None, xy: tuple[float, float] | None, transition: float) -> None:
        """Override the stops' colors until the object is switched off or reset."""
        self.override = {"kelvin": kelvin} if kelvin is not None else {"xy": xy}
        await self._recolor(transition)

    async def async_reset_color(self, transition: float = SETTLE_TRANSITION) -> None:
        """Return to the colors of the stops."""
        if self.override is None:
            return
        self.override = None
        await self._recolor(transition)

    async def _recolor(self, transition: float) -> None:
        fade = self.fade
        if fade is not None:
            await self.async_fade_to(fade.target, self.remaining or 0.0)
            return
        for step in settle(self.curve, self.position, self._lit(), transition, skip=self.deviating):
            self._send_step(step)
        self._on_change()

    def set_lights(self, entity_ids: Iterable[str], brightness: float) -> None:
        """Set single lights apart from the curve, until the next command to the object."""
        lit = self._lit()
        for eid in entity_ids:
            light = self.curve.lights.get(eid)
            if light is None:
                continue
            self.deviating[eid] = brightness
            state = light.at(self.position)
            target = Target(brightness, state.kelvin, state.xy)
            self._send_step(_step_to(light, target, lit[eid], 0.3))
        self._on_change()

    def reset_lights(self) -> None:
        """Bring single lights back to the curve."""
        if not self.deviating:
            return
        ids = list(self.deviating)
        self.deviating.clear()
        lit = self._lit()
        for eid in ids:
            light = self.curve.lights.get(eid)
            if light is not None:
                self._send_step(_step_to(light, light.at(self.current_position()), lit[eid], SETTLE_TRANSITION))
        self._on_change()

    # -- devices -----------------------------------------------------------------

    def _ramp_devices(self, position: float, *, respect_interval: bool) -> None:
        now = time.monotonic()
        for device in self.options.get(CONF_DEVICES, ()):
            if device["kind"] != DEVICE_RAMP:
                continue
            key = device.get("id") or device["entity_id"]
            if respect_interval and now - self._device_last.get(key, 0.0) < DEVICE_MIN_INTERVAL:
                continue
            value = ramp_value(device, position)
            if abs(self._device_sent.get(key, math.inf) - value) < 0.5:
                continue
            self._device_last[key] = now
            self._run_device(DeviceStep(0.0, device, value=value))

    def _run_device(self, step: DeviceStep) -> None:
        device = step.device
        entity_id = device["entity_id"]
        domain = entity_id.split(".", 1)[0]
        data: dict[str, Any] = {ATTR_ENTITY_ID: entity_id}
        if step.value is not None:
            action = _RAMP_ACTIONS.get(domain)
            if action is None:
                _LOGGER.warning("%s cannot follow a ramp", entity_id)
                return
            service, extra = action(step.value)
            data.update(extra)
            self._device_sent[device.get("id") or entity_id] = step.value
        else:
            service = step.action or ""
            if "." in service:
                domain, service = service.split(".", 1)
            data.update(device.get("data") or {})
        self.hass.async_create_background_task(self._call_device(domain, service, data), "cloudless_crescendo device")

    async def _call_device(self, domain: str, service: str, data: dict[str, Any]) -> None:
        try:
            await self.hass.services.async_call(domain, service, data, blocking=True, context=self.context)
        except Exception as err:
            _LOGGER.warning("%s.%s for %s failed: %s", domain, service, data.get(ATTR_ENTITY_ID), err)

    # -- other people and things touching the lights -----------------------------

    @callback
    def _on_service_call(self, event: Event) -> None:
        data = event.data
        if data.get("domain") != "light" or event.context.id == self.context.id:
            return
        if event.context.parent_id == self.context.id:
            return
        targets = (data.get("service_data") or {}).get(ATTR_ENTITY_ID)
        if not targets:
            return
        if isinstance(targets, str):
            targets = [targets]
        changed = False
        for eid in targets:
            if eid in self.base_curve.lights and self.position + (self.fade is not None) > 0:
                self._leave_curve(eid)
                changed = True
        if changed:
            self._on_change()

    def _leave_curve(self, entity_id: str) -> None:
        """A light was changed from outside: it stays out until the next command to the object."""
        self.deviating[entity_id] = -1.0
        self.last_targets[entity_id] = NOT_FOLLOWING
        self.sender.forget(entity_id)

    @callback
    def _on_light_state(self, event: Event) -> None:
        eid = event.data["entity_id"]
        new, old = event.data.get("new_state"), event.data.get("old_state")
        if new is None or old is None or eid in self.deviating:
            return
        if old.state in (STATE_UNAVAILABLE, STATE_UNKNOWN) and new.state in (STATE_ON, STATE_OFF):
            # A light came back: it catches up with where the object is now.
            light = self.curve.lights.get(eid)
            if light is not None:
                self.sender.expected_on[eid] = new.state == STATE_ON
                self._send_step(
                    _step_to(light, light.at(self.current_position()), new.state == STATE_ON, SETTLE_TRANSITION)
                )
            return
        sent = self.sender.last_send.get(eid)
        if (
            new.state == STATE_OFF
            and old.state == STATE_ON
            and self.sender.expected_on.get(eid)
            and (sent is None or time.monotonic() - sent > VERIFY_DELAY * 3)
        ):
            # Switched off by hand or at the wall.
            self._leave_curve(eid)
            self._on_change()

    # -- diagnostics -------------------------------------------------------------

    def diagnostics(self) -> dict[str, Any]:
        """Return what the sender has seen so far, per light."""
        lights = []
        for eid in self.base_curve.lights:
            stats = self.sender.stats_for(eid)
            state = self.hass.states.get(eid)
            lights.append(
                {
                    "entity_id": eid,
                    "network": self._network_of(eid),
                    "state": state.state if state is not None else None,
                    "answers": stats.answers,
                    "failures": stats.failures,
                    "repeats": stats.repeats,
                    "average_ms": round(stats.average_ms) if stats.average_ms is not None else None,
                    "last_ms": round(stats.last_ms) if stats.last_ms is not None else None,
                    "last_error": stats.last_error,
                    "following": eid not in self.deviating,
                    "rate": self.sender.rate(eid),
                }
            )
        return {"lights": lights}

    async def async_test_connection(self) -> list[dict[str, Any]]:
        """Switch every light briefly, measure its answer and restore it."""
        await self.async_stop()
        results = []
        for eid in self.base_curve.lights:
            state = self.hass.states.get(eid)
            if state is None or state.state not in (STATE_ON, STATE_OFF):
                results.append({"entity_id": eid, "ok": False, "ms": None, "error": "unavailable"})
                continue
            was_on = state.state == STATE_ON
            attrs = state.attributes
            restore: dict[str, Any] = {ATTR_ENTITY_ID: eid}
            if was_on:
                if attrs.get("brightness") is not None:
                    restore["brightness"] = attrs["brightness"]
                mode = attrs.get("color_mode")
                if mode == "color_temp" and attrs.get("color_temp_kelvin"):
                    restore["color_temp_kelvin"] = attrs["color_temp_kelvin"]
                elif attrs.get("xy_color"):
                    restore["xy_color"] = attrs["xy_color"]
            started = time.monotonic()
            error = None
            try:
                await self._test_call("turn_on", {ATTR_ENTITY_ID: eid, "brightness": 26 if was_on else 13})
                ms = round((time.monotonic() - started) * 1000)
                await asyncio.sleep(0.8)
                if was_on:
                    await self._test_call("turn_on", restore)
                else:
                    await self._test_call("turn_off", {ATTR_ENTITY_ID: eid})
            except Exception as err:
                error = f"{type(err).__name__}: {err}"
                ms = None
            results.append({"entity_id": eid, "ok": error is None, "ms": ms, "error": error})
            await asyncio.sleep(0.2)
        return results

    async def _test_call(self, service: str, data: dict[str, Any]) -> None:
        await asyncio.wait_for(
            self.hass.services.async_call("light", service, data, blocking=True, context=self.context), 10
        )


def _barely_differs(a: Target, b: Target) -> bool:
    if a.is_on != b.is_on:
        return False
    if not a.is_on:
        return True
    return abs(a.brightness - b.brightness) < 0.5 and a.same_color(b)


def _step_to(light: LightCurve, state: Target, lit: bool, transition: float) -> Step:
    eid = light.entity_id
    if light.mode == MODE_ONOFF:
        return Step(0.0, eid, (Command("turn_on") if state.is_on else OFF,), state)
    if not state.is_on:
        return Step(0.0, eid, (OFF,), state)
    if not lit:
        commands = (minimum_command(state), on_command(state, transition, color=False))
    else:
        commands = (on_command(state, transition),)
    return Step(0.0, eid, commands, state, transition)


def _with_color(light: LightCurve, override: Mapping[str, Any]) -> LightCurve:
    """Return a copy of a light's curve with a chosen color at every stop."""
    kelvin, xy = override.get("kelvin"), override.get("xy")
    if light.mode in (MODE_ONOFF, MODE_DIM):
        return light
    copy = LightCurve.__new__(LightCurve)
    copy.entity_id = light.entity_id
    copy.mode = light.mode
    copy.fade = light.fade
    copy.steps = light.steps
    copy.slider = light.slider
    copy.positions = light.positions
    if light.mode == MODE_CCT:
        if kelvin is None:
            return light
        copy._targets = [Target(t.brightness, kelvin=kelvin) for t in light._targets]
    elif kelvin is not None and light.mode == "rgb":
        copy._targets = [Target(t.brightness, xy=kelvin_to_xy(kelvin)) for t in light._targets]
    elif kelvin is not None:
        copy._targets = [Target(t.brightness, kelvin=kelvin) for t in light._targets]
    else:
        copy._targets = [Target(t.brightness, xy=tuple(xy)) for t in light._targets]
    return copy
