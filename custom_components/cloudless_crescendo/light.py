"""Room light for Cloudless Crescendo."""

from __future__ import annotations

from datetime import timedelta
import hashlib
import json
import logging
from typing import Any

from homeassistant.components.light import (
    ATTR_BRIGHTNESS,
    ATTR_TRANSITION,
    PLATFORM_SCHEMA as LIGHT_PLATFORM_SCHEMA,
    ColorMode,
    LightEntity,
    LightEntityFeature,
)
from homeassistant.config_entries import SOURCE_IMPORT, ConfigEntry
from homeassistant.const import ATTR_ENTITY_ID, CONF_NAME, CONF_UNIQUE_ID
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv, issue_registry as ir
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.start import async_at_started
from homeassistant.helpers.typing import ConfigType, DiscoveryInfoType
from homeassistant.util import dt as dt_util
import voluptuous as vol

from .const import (
    ATTR_CURVE_ID,
    ATTR_FADE_ENDS,
    ATTR_FADE_FROM,
    ATTR_FADE_REMAINING,
    ATTR_FADE_STARTED,
    ATTR_FADING,
    ATTR_LAST_ON_POSITION,
    ATTR_POSITION,
    ATTR_STEPS,
    ATTR_TARGET_POSITION,
    COLOR_MODES,
    CONF_COLOR_MODE,
    CONF_DEFAULT_TRANSITION,
    CONF_LIGHTS,
    CONF_MAX_SEGMENT,
    CONF_STEPS,
    DEFAULT_MAX_SEGMENT,
    DEFAULT_TRANSITION,
    DOMAIN,
    SHORT_FADE,
)
from .curve import RoomCurve
from .engine import FadeEngine
from .model import LIGHT_ID, YAML_STEPS_SCHEMA, curve_from_options, yaml_to_options

_LOGGER = logging.getLogger(__name__)


def _validate_yaml(config: dict[str, Any]) -> dict[str, Any]:
    try:
        yaml_to_options(config)
    except vol.Invalid as err:
        raise vol.Invalid(str(err), path=[CONF_STEPS]) from err
    return config


PLATFORM_SCHEMA = vol.All(
    LIGHT_PLATFORM_SCHEMA.extend(
        {
            vol.Required(CONF_NAME): cv.string,
            vol.Optional(CONF_UNIQUE_ID): cv.string,
            vol.Optional(CONF_DEFAULT_TRANSITION, default=DEFAULT_TRANSITION): vol.All(
                vol.Coerce(float), vol.Range(min=0, max=3600)
            ),
            vol.Optional(CONF_MAX_SEGMENT, default=DEFAULT_MAX_SEGMENT): vol.All(
                vol.Coerce(float), vol.Range(min=1, max=600)
            ),
            vol.Optional(CONF_LIGHTS): {
                LIGHT_ID: vol.Schema({vol.Optional(CONF_COLOR_MODE): vol.In(COLOR_MODES)})
            },
            vol.Required(CONF_STEPS): YAML_STEPS_SCHEMA,
        }
    ),
    _validate_yaml,
)


async def async_setup_platform(
    hass: HomeAssistant,
    config: ConfigType,
    async_add_entities: Any,
    discovery_info: DiscoveryInfoType | None = None,
) -> None:
    """Import a YAML room into a config entry (once) and ask to remove the YAML."""
    unique_id = config.get(CONF_UNIQUE_ID) or f"yaml_{cv.slugify(config[CONF_NAME])}"
    hass.async_create_task(
        hass.config_entries.flow.async_init(
            DOMAIN,
            context={"source": SOURCE_IMPORT},
            data={
                CONF_NAME: config[CONF_NAME],
                CONF_UNIQUE_ID: unique_id,
                "options": yaml_to_options(config),
            },
        )
    )
    ir.async_create_issue(
        hass,
        DOMAIN,
        f"deprecated_yaml_{unique_id}",
        is_fixable=False,
        is_persistent=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key="deprecated_yaml",
        translation_placeholders={"name": config[CONF_NAME]},
    )


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the room light of a config entry."""
    async_add_entities([CrescendoLight(entry, curve_from_options(dict(entry.options)))])


class CrescendoLight(LightEntity, RestoreEntity):
    """One slider that moves a whole room along its curve."""

    _attr_color_mode = ColorMode.BRIGHTNESS
    _attr_supported_color_modes = {ColorMode.BRIGHTNESS}
    _attr_supported_features = LightEntityFeature.TRANSITION
    _attr_should_poll = False
    _attr_has_entity_name = True
    _attr_name = None
    _attr_translation_key = "room"

    def __init__(self, entry: ConfigEntry, curve: RoomCurve) -> None:
        """Initialize the light."""
        self._entry = entry
        self._curve = curve
        self._default_transition = float(
            entry.options.get(CONF_DEFAULT_TRANSITION, DEFAULT_TRANSITION)
        )
        self._max_segment = float(entry.options.get(CONF_MAX_SEGMENT, DEFAULT_MAX_SEGMENT))
        self._last_on_position = 100.0
        self._engine: FadeEngine | None = None
        self._curve_id = hashlib.sha256(
            json.dumps(dict(entry.options), sort_keys=True, default=str).encode()
        ).hexdigest()[:12]
        self._attr_unique_id = entry.unique_id or entry.entry_id
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title,
            manufacturer="Cloudless",
            model="Crescendo room",
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def engine(self) -> FadeEngine:
        """Return the fade engine."""
        assert self._engine is not None
        return self._engine

    @property
    def curve(self) -> RoomCurve:
        """Return the room curve."""
        return self._curve

    async def async_added_to_hass(self) -> None:
        """Restore position, and resume a fade that was running before a restart."""
        await super().async_added_to_hass()
        self._engine = FadeEngine(
            self.hass, self._curve, self._max_segment, self._async_engine_changed
        )
        last = await self.async_get_last_state()
        if last is None:
            return
        attrs = last.attributes
        if isinstance(last_on := attrs.get(ATTR_LAST_ON_POSITION), (int, float)) and last_on > 0:
            self._last_on_position = float(last_on)
        if isinstance(position := attrs.get(ATTR_POSITION), (int, float)):
            self._engine.restore(float(position))

        target = attrs.get(ATTR_TARGET_POSITION)
        start = attrs.get(ATTR_FADE_FROM)
        started = dt_util.parse_datetime(str(attrs.get(ATTR_FADE_STARTED) or ""))
        ends = dt_util.parse_datetime(str(attrs.get(ATTR_FADE_ENDS) or ""))
        if not (
            isinstance(target, (int, float))
            and isinstance(start, (int, float))
            and started
            and ends
            and ends > dt_util.utcnow()
        ):
            return
        total = (ends - started).total_seconds()
        done = (dt_util.utcnow() - started).total_seconds()
        fraction = min(1.0, max(0.0, done / total)) if total > 0 else 1.0
        self._engine.restore(start + (target - start) * fraction)

        @callback
        def _resume(_hass: HomeAssistant) -> None:
            remaining = (ends - dt_util.utcnow()).total_seconds()
            _LOGGER.debug("Resuming fade of %s to %s", self.entity_id, target)
            self.hass.async_create_task(self._async_fade(float(target), max(0.0, remaining)))

        self.async_on_remove(async_at_started(self.hass, _resume))

    async def async_will_remove_from_hass(self) -> None:
        """Stop running fades."""
        if self._engine is not None:
            await self._engine.async_shutdown()

    @callback
    def _async_engine_changed(self) -> None:
        if self.hass is not None and self.entity_id:
            self.async_write_ha_state()

    @property
    def _display_position(self) -> float:
        """Short fades show their target at once, long ones show progress."""
        engine = self._engine
        if engine is None:
            return 0.0
        fade = engine.fade
        if fade is not None and fade.duration <= SHORT_FADE:
            return fade.target
        return engine.position

    @property
    def is_on(self) -> bool:
        """The room is on above position 0."""
        return self._display_position > 0

    @property
    def brightness(self) -> int | None:
        """The position (0..100) as brightness (0..255)."""
        position = self._display_position
        if position <= 0:
            return None
        return max(1, min(255, round(position * 255 / 100)))

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Position, fade progress and steps (used by the dashboard card)."""
        attrs: dict[str, Any] = {
            ATTR_ENTITY_ID: self._curve.entity_ids,
            ATTR_STEPS: [
                {"position": step.position, "name": step.name}
                if step.name
                else {"position": step.position}
                for step in self._curve.steps
            ],
            ATTR_LAST_ON_POSITION: round(self._last_on_position, 2),
            ATTR_CURVE_ID: self._curve_id,
        }
        engine = self._engine
        if engine is None:
            return attrs
        attrs[ATTR_POSITION] = round(engine.position, 2)
        attrs[ATTR_FADING] = engine.fading
        fade = engine.fade
        if fade is not None:
            attrs[ATTR_FADE_FROM] = round(fade.start, 2)
            attrs[ATTR_TARGET_POSITION] = round(fade.target, 2)
            attrs[ATTR_FADE_REMAINING] = round(engine.remaining or 0.0, 2)
            attrs[ATTR_FADE_STARTED] = fade.started_at.isoformat()
            if (ends := engine.ends_at) is not None:
                attrs[ATTR_FADE_ENDS] = ends.isoformat()
        return attrs

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Move the room to the requested brightness (= position)."""
        if (brightness := kwargs.get(ATTR_BRIGHTNESS)) is not None:
            target = brightness * 100 / 255
        else:
            target = self._last_on_position
        await self._async_fade(target, kwargs.get(ATTR_TRANSITION))

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Fade the room to 0."""
        await self._async_fade(0.0, kwargs.get(ATTR_TRANSITION))

    async def async_fade_to(self, position: float, duration: timedelta | None = None) -> None:
        """Handle the fade_to action."""
        await self._async_fade(position, duration.total_seconds() if duration is not None else None)

    async def async_stop_fade(self) -> None:
        """Handle the stop action."""
        await self.engine.async_stop()
        if self.engine.position > 0:
            self._last_on_position = self.engine.position
        self.async_write_ha_state()

    async def _async_fade(self, target: float, duration: float | None) -> None:
        if duration is None:
            duration = self._default_transition
        if target > 0:
            self._last_on_position = target
        elif self.engine.position > 0:
            self._last_on_position = self.engine.position
        self.engine.context = self._context
        await self.engine.async_fade_to(target, duration)
        self.async_write_ha_state()
