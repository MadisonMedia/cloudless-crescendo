"""The object as a normal light: its brightness is the position on the scale."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
import hashlib
import json
from typing import Any

from homeassistant.components.light import (
    ATTR_BRIGHTNESS,
    ATTR_COLOR_TEMP_KELVIN,
    ATTR_TRANSITION,
    ATTR_XY_COLOR,
    ColorMode,
    LightEntity,
    LightEntityFeature,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_ENTITY_ID
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.restore_state import ExtraStoredData, RestoreEntity
from homeassistant.helpers.start import async_at_started
from homeassistant.util import dt as dt_util

from .const import (
    ATTR_BUTTONS,
    ATTR_COLOR_OVERRIDE,
    ATTR_COMMAND,
    ATTR_COMMAND_AT,
    ATTR_COMMAND_SOURCE,
    ATTR_COMMAND_USER_ID,
    ATTR_CRESCENDO,
    ATTR_CRESCENDO_API,
    ATTR_CURVE_ID,
    ATTR_EXTERNAL_ON_POSITION,
    ATTR_FADE_ENDS,
    ATTR_FADE_FROM,
    ATTR_FADE_STARTED,
    ATTR_FADING,
    ATTR_LAST_ON,
    ATTR_ON_POSITION,
    ATTR_POSITION,
    ATTR_STOPS,
    ATTR_TARGET_POSITION,
    COMMAND_SWITCH_ON,
    CONF_BUTTONS,
    CONF_DEFAULT_TRANSITION,
    CRESCENDO_API,
    DEFAULT_TRANSITION,
    DOMAIN,
    MODE_CCT,
    MODE_DIM,
    MODE_ONOFF,
    PANEL_URL,
    SHORT_FADE,
)
from .engine import Engine, Origin


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up an object's light."""
    entity = CrescendoLight(hass, entry)
    entry.runtime_data = entity
    async_add_entities([entity])


@dataclass
class _ObjectMark(ExtraStoredData):
    """Marks saved state as this object's. A new object must not inherit from a deleted one of the same name.

    It also carries what survives a restart besides the position: the last command, a switch-on position set
    from outside, where devices were left behind, whether a running fade moves devices, and a chosen color.
    """

    entry_id: str
    saved: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        """Return what is stored."""
        return {"entry_id": self.entry_id, **self.saved}


class CrescendoLight(LightEntity, RestoreEntity):
    """One scale that moves all lights of an object."""

    _attr_should_poll = False
    _attr_has_entity_name = True
    _attr_name = None
    _attr_supported_features = LightEntityFeature.TRANSITION
    _attr_min_color_temp_kelvin = 2000
    _attr_max_color_temp_kelvin = 6500

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize."""
        self.engine = Engine(hass, dict(entry.options), self._engine_changed)
        self._entry = entry
        self._attr_unique_id = entry.unique_id or entry.entry_id
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title,
            manufacturer="Cloudless",
            model="Crescendo",
            entry_type=DeviceEntryType.SERVICE,
            configuration_url=f"homeassistant://{PANEL_URL}",
        )

    async def async_added_to_hass(self) -> None:
        """Restore the position and continue a fade that was running before a restart."""
        await super().async_added_to_hass()
        self.engine.start()
        last = await self.async_get_last_state()
        mark = await self.async_get_last_extra_data()
        if last is None or mark is None or mark.as_dict().get("entry_id") != self._entry.entry_id:
            return
        saved = mark.as_dict()
        attrs = last.attributes
        position = attrs.get(ATTR_POSITION)
        last_on = attrs.get(ATTR_LAST_ON)
        self.engine.restore(
            float(position) if isinstance(position, (int, float)) else 0.0,
            float(last_on) if isinstance(last_on, (int, float)) else None,
            saved,
        )
        devices = saved.get("fade_devices") is not False
        target = attrs.get(ATTR_TARGET_POSITION)
        start = attrs.get(ATTR_FADE_FROM)
        started = dt_util.parse_datetime(str(attrs.get(ATTR_FADE_STARTED) or ""))
        ends = dt_util.parse_datetime(str(attrs.get(ATTR_FADE_ENDS) or ""))
        if not (
            isinstance(target, (int, float))
            and isinstance(start, (int, float))
            and started is not None
            and ends is not None
            and ends > dt_util.utcnow()
        ):
            return
        total = (ends - started).total_seconds()
        done = (dt_util.utcnow() - started).total_seconds()
        self.engine.restore(start + (target - start) * min(1.0, max(0.0, done / total)) if total > 0 else target, None)

        @callback
        def _resume(_hass: HomeAssistant) -> None:
            remaining = (ends - dt_util.utcnow()).total_seconds()
            self.hass.async_create_task(self.engine.async_fade_to(float(target), max(0.0, remaining), devices=devices))

        self.async_on_remove(async_at_started(self.hass, _resume))

    @property
    def extra_restore_state_data(self) -> ExtraStoredData:
        """Store which object this state belongs to, and what else has to survive a restart."""
        return _ObjectMark(self._entry.entry_id, self.engine.saved_state())

    async def async_will_remove_from_hass(self) -> None:
        """Stop the engine."""
        await self.engine.async_shutdown()

    @callback
    def _engine_changed(self) -> None:
        if self.hass is not None and self.entity_id:
            # Home Assistant keeps a command's context for 5 seconds; a long fade keeps it to its end.
            command = self.engine.command
            if command is not None and command.context is not None:
                self.async_set_context(command.context)
            self.async_write_ha_state()

    def _origin(self, source: str | None = None) -> Origin:
        """Return who gave the command being handled, from the context Home Assistant set for it."""
        context = self._context
        return Origin(source, context.user_id if context is not None else None, context)

    @callback
    def options_changed(self) -> None:
        """Use the entry's new options."""
        self.engine.apply_options(dict(self._entry.options))

    # -- state -------------------------------------------------------------------

    @property
    def _display_position(self) -> float:
        fade = self.engine.fade
        if fade is not None and fade.duration <= SHORT_FADE:
            return fade.target
        return self.engine.current_position()

    @property
    def _color_lights(self) -> list[Any]:
        return [c for c in self.engine.base_curve.lights.values() if c.mode not in (MODE_ONOFF, MODE_DIM)]

    @property
    def supported_color_modes(self) -> set[ColorMode]:
        """Offer a color choice if the object has lights that can follow it."""
        lights = self._color_lights
        if not lights:
            return {ColorMode.BRIGHTNESS}
        if all(c.mode == MODE_CCT for c in lights):
            return {ColorMode.COLOR_TEMP}
        return {ColorMode.COLOR_TEMP, ColorMode.XY}

    def _room_color(self) -> tuple[float | None, tuple[float, float] | None]:
        """Return the room's current color, weighted by each light's brightness."""
        total = 0.0
        kelvin = 0.0
        kelvin_weight = 0.0
        x = 0.0
        y = 0.0
        xy_weight = 0.0
        for state in self.engine.curve.at(self.engine.current_position()).values():
            if not state.is_on:
                continue
            total += state.brightness
            if state.kelvin is not None:
                kelvin += state.kelvin * state.brightness
                kelvin_weight += state.brightness
            elif state.xy is not None:
                x += state.xy[0] * state.brightness
                y += state.xy[1] * state.brightness
                xy_weight += state.brightness
        if total <= 0:
            return None, None
        # A chosen color is the object's color, even where white lights outweigh the lights that follow it.
        override = self.engine.override
        if override is not None:
            if override.get("kelvin") is not None:
                return float(override["kelvin"]), None
            if ColorMode.XY in self.supported_color_modes:
                return None, tuple(override["xy"])
        if xy_weight > kelvin_weight:
            return None, (x / xy_weight, y / xy_weight)
        return (kelvin / kelvin_weight if kelvin_weight else None), None

    @property
    def color_mode(self) -> ColorMode:
        """Return the color mode that fits the current colors."""
        modes = self.supported_color_modes
        if ColorMode.BRIGHTNESS in modes:
            return ColorMode.BRIGHTNESS
        if ColorMode.XY not in modes:
            return ColorMode.COLOR_TEMP
        _, xy = self._room_color()
        return ColorMode.XY if xy is not None else ColorMode.COLOR_TEMP

    @property
    def color_temp_kelvin(self) -> int | None:
        """Return the room's color temperature."""
        kelvin, xy = self._room_color()
        if kelvin is not None:
            return round(kelvin)
        if xy is None and self._display_position > 0:
            return 3000
        return None

    @property
    def xy_color(self) -> tuple[float, float] | None:
        """Return the room's color."""
        return self._room_color()[1]

    @property
    def is_on(self) -> bool:
        """The object is on above position 0."""
        return self._display_position > 0

    @property
    def brightness(self) -> int | None:
        """Return the position as brightness."""
        position = self._display_position
        return None if position <= 0 else max(1, min(255, round(position * 255 / 100)))

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Position, progress, stops and buttons for the cards."""
        engine = self.engine
        options = engine.options
        attrs: dict[str, Any] = {
            ATTR_CRESCENDO: True,
            ATTR_ENTITY_ID: list(engine.base_curve.lights),
            ATTR_POSITION: round(engine.current_position(), 2),
            ATTR_FADING: engine.fade is not None,
            ATTR_LAST_ON: round(engine.last_on, 2),
            ATTR_ON_POSITION: round(engine.on_position(), 2),
            ATTR_STOPS: engine.base_curve.positions,
            ATTR_BUTTONS: [
                {"name": b["name"], "position": b["position"], "duration": b["duration"]}
                for b in options.get(CONF_BUTTONS, ())
            ],
            ATTR_CURVE_ID: hashlib.sha256(json.dumps(options, sort_keys=True).encode()).hexdigest()[:10],
            ATTR_COLOR_OVERRIDE: engine.override is not None,
            "deviating": list(engine.deviating),
            ATTR_EXTERNAL_ON_POSITION: engine.external_on_position,
            ATTR_CRESCENDO_API: CRESCENDO_API,
        }
        command = engine.command
        attrs[ATTR_COMMAND] = command.kind if command is not None else None
        attrs[ATTR_COMMAND_SOURCE] = command.source if command is not None else None
        attrs[ATTR_COMMAND_USER_ID] = command.user_id if command is not None else None
        attrs[ATTR_COMMAND_AT] = command.at.isoformat() if command is not None else None
        fade = engine.fade
        if fade is not None:
            attrs[ATTR_TARGET_POSITION] = round(fade.target, 2)
            attrs[ATTR_FADE_FROM] = round(fade.start, 2)
            attrs[ATTR_FADE_STARTED] = fade.started_at.isoformat()
            if (ends := engine.ends_at) is not None:
                attrs[ATTR_FADE_ENDS] = ends.isoformat()
        return attrs

    # -- commands ----------------------------------------------------------------

    def _transition(self, kwargs: dict[str, Any]) -> float:
        transition = kwargs.get(ATTR_TRANSITION)
        if transition is not None:
            return float(transition)
        return float(self.engine.options.get(CONF_DEFAULT_TRANSITION, DEFAULT_TRANSITION))

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Move to a position, choose a color, or both.

        A color alone changes no position, so it leaves the command shown to other integrations as it is.
        """
        engine = self.engine
        transition = self._transition(kwargs)
        kelvin = kwargs.get(ATTR_COLOR_TEMP_KELVIN)
        xy = kwargs.get(ATTR_XY_COLOR)
        brightness = kwargs.get(ATTR_BRIGHTNESS)
        # On, or on the way there. A fade down to off counts as off, so turn_on switches back on.
        heading_on = engine.fade.target > 0 if engine.fade is not None else engine.current_position() > 0
        if kelvin is not None or xy is not None:
            if xy is not None:
                engine.override = {"xy": tuple(xy)}
            else:
                engine.override = {"kelvin": float(kelvin)}
            if brightness is None:
                if not heading_on:
                    await engine.async_fade_to(
                        engine.on_position(), transition, origin=self._origin(), kind=COMMAND_SWITCH_ON
                    )
                else:
                    await engine.async_set_color(kelvin, tuple(xy) if xy is not None else None, min(transition, 2.0))
                return
        if brightness is not None:
            await engine.async_fade_to(brightness * 100 / 255, transition, origin=self._origin())
        elif not heading_on:
            await engine.async_fade_to(engine.on_position(), transition, origin=self._origin(), kind=COMMAND_SWITCH_ON)

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Run the sequence backward to off."""
        await self.engine.async_fade_to(0.0, self._transition(kwargs), origin=self._origin())

    async def async_fade_to(
        self, position: float, duration: timedelta | None = None, source: str | None = None, devices: bool = True
    ) -> None:
        """Handle the fade_to action, which has no limit on the duration."""
        seconds = duration.total_seconds() if duration is not None else self._transition({})
        await self.engine.async_fade_to(position, seconds, origin=self._origin(source), devices=devices)

    async def async_stop_fade(self, source: str | None = None) -> None:
        """Handle the stop action."""
        await self.engine.async_stop(origin=self._origin(source))

    async def async_press_button(self, button: str) -> None:
        """Run one of the object's buttons by name."""
        wanted = button.casefold()
        for candidate in self.engine.options.get(CONF_BUTTONS, ()):
            if candidate["name"].casefold() == wanted or candidate.get("id") == button:
                await self.engine.async_fade_to(
                    float(candidate["position"]), float(candidate["duration"]), origin=self._origin()
                )
                return
        raise ServiceValidationError(f"{self.entity_id} has no button named {button}")

    async def async_set_on_position(self, position: float | None = None) -> None:
        """Set from outside where a plain switch-on goes; empty returns to the object's own setting."""
        self.engine.external_on_position = position
        self.async_write_ha_state()

    async def async_reset_color(self) -> None:
        """Return to the colors of the stops."""
        await self.engine.async_reset_color()
