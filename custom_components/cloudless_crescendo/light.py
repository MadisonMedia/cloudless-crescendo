"""Virtual room light for Cloudless Crescendo."""

from __future__ import annotations

from datetime import timedelta
import logging
from typing import Any

from homeassistant.components.light import (
    ATTR_BRIGHTNESS,
    ATTR_TRANSITION,
    DOMAIN as LIGHT_DOMAIN,
    PLATFORM_SCHEMA as LIGHT_PLATFORM_SCHEMA,
    ColorMode,
    LightEntity,
    LightEntityFeature,
)
from homeassistant.const import ATTR_ENTITY_ID, CONF_NAME, CONF_UNIQUE_ID, Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv, entity_platform
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.reload import async_setup_reload_service
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.typing import ConfigType, DiscoveryInfoType
import voluptuous as vol

from .const import (
    ATTR_DURATION,
    ATTR_FADE_END,
    ATTR_FADING,
    ATTR_LAST_ON_POSITION,
    ATTR_POSITION,
    ATTR_TARGET_POSITION,
    CONF_DEFAULT_TRANSITION,
    CONF_MAX_SEGMENT,
    CONF_STEPS,
    DEFAULT_MAX_SEGMENT,
    DEFAULT_TRANSITION,
    DOMAIN,
    POINT_BRIGHTNESS,
    POINT_KELVIN,
    POINT_RGB,
    POINT_XY,
    SERVICE_FADE_TO,
    SERVICE_STOP,
)
from .curve import RoomCurve, build_room_curve
from .engine import FadeEngine

_LOGGER = logging.getLogger(__name__)

PERCENT = vol.All(vol.Coerce(float), vol.Range(min=0, max=100))

POINT_DICT_SCHEMA = vol.Schema(
    {
        vol.Optional(POINT_BRIGHTNESS): PERCENT,
        vol.Exclusive(POINT_KELVIN, "color"): vol.All(
            vol.Coerce(int), vol.Range(min=1000, max=12000)
        ),
        vol.Exclusive(POINT_RGB, "color"): vol.All(
            vol.ExactSequence((cv.byte, cv.byte, cv.byte)), vol.Coerce(tuple)
        ),
        vol.Exclusive(POINT_XY, "color"): vol.All(
            vol.ExactSequence((cv.small_float, cv.small_float)), vol.Coerce(tuple)
        ),
    }
)


def _point(value: Any) -> dict[str, Any]:
    """A point is either a plain brightness or a dict."""
    if isinstance(value, dict):
        return POINT_DICT_SCHEMA(value)
    return {POINT_BRIGHTNESS: PERCENT(value)}


STEP_POSITION = vol.All(vol.Coerce(float), vol.Range(min=0, max=100, min_included=False))

STEPS_SCHEMA = vol.All(
    {STEP_POSITION: {cv.entity_domain(LIGHT_DOMAIN): _point}},
    vol.Length(min=1),
)


def _validate_curve(config: dict[str, Any]) -> dict[str, Any]:
    """Build the curve once during validation so errors show up in the config check."""
    try:
        build_room_curve(config[CONF_STEPS])
    except ValueError as err:
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
            vol.Required(CONF_STEPS): STEPS_SCHEMA,
        }
    ),
    _validate_curve,
)


async def async_setup_platform(
    hass: HomeAssistant,
    config: ConfigType,
    async_add_entities: AddEntitiesCallback,
    discovery_info: DiscoveryInfoType | None = None,
) -> None:
    """Set up a Crescendo light from YAML."""
    await async_setup_reload_service(hass, DOMAIN, [Platform.LIGHT])

    curve = build_room_curve(config[CONF_STEPS])
    async_add_entities(
        [
            CrescendoLight(
                name=config[CONF_NAME],
                unique_id=config.get(CONF_UNIQUE_ID),
                curve=curve,
                default_transition=config[CONF_DEFAULT_TRANSITION],
                max_segment=config[CONF_MAX_SEGMENT],
            )
        ]
    )

    platform = entity_platform.async_get_current_platform()
    platform.async_register_entity_service(
        SERVICE_FADE_TO,
        {
            vol.Required(ATTR_POSITION): PERCENT,
            vol.Optional(ATTR_DURATION): cv.positive_time_period,
        },
        "async_fade_to",
    )
    platform.async_register_entity_service(SERVICE_STOP, None, "async_stop_fade")


class CrescendoLight(LightEntity, RestoreEntity):
    """One slider that moves a whole room along its curve."""

    _attr_color_mode = ColorMode.BRIGHTNESS
    _attr_supported_color_modes = {ColorMode.BRIGHTNESS}
    _attr_supported_features = LightEntityFeature.TRANSITION
    _attr_should_poll = False
    _attr_icon = "mdi:lightbulb-group"

    def __init__(
        self,
        *,
        name: str,
        unique_id: str | None,
        curve: RoomCurve,
        default_transition: float,
        max_segment: float,
    ) -> None:
        """Initialize the light."""
        self._attr_name = name
        self._attr_unique_id = unique_id
        self._curve = curve
        self._default_transition = default_transition
        self._max_segment = max_segment
        self._last_on_position = 100.0
        self._engine: FadeEngine | None = None

    @property
    def engine(self) -> FadeEngine:
        """Return the fade engine (created once added to hass)."""
        assert self._engine is not None
        return self._engine

    async def async_added_to_hass(self) -> None:
        """Restore the last position without touching the lights."""
        await super().async_added_to_hass()
        self._engine = FadeEngine(
            self.hass, self._curve, self._max_segment, self.async_write_ha_state
        )
        if (last := await self.async_get_last_state()) is not None:
            position = last.attributes.get(ATTR_POSITION)
            if isinstance(position, (int, float)):
                self._engine.restore(float(position))
            last_on = last.attributes.get(ATTR_LAST_ON_POSITION)
            if isinstance(last_on, (int, float)) and last_on > 0:
                self._last_on_position = float(last_on)

    async def async_will_remove_from_hass(self) -> None:
        """Stop running fades."""
        if self._engine is not None:
            await self._engine.async_shutdown()

    @property
    def is_on(self) -> bool:
        """The room is on while any position above 0 is shown."""
        return self.engine.position > 0 if self._engine else False

    @property
    def brightness(self) -> int | None:
        """Map the position (0..100) to 0..255."""
        if self._engine is None:
            return None
        position = self.engine.position
        if position <= 0:
            return None
        return max(1, min(255, round(position * 255 / 100)))

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Expose position and fade progress."""
        engine = self._engine
        attrs: dict[str, Any] = {ATTR_ENTITY_ID: self._curve.entity_ids}
        if engine is None:
            return attrs
        attrs[ATTR_POSITION] = round(engine.position, 1)
        attrs[ATTR_LAST_ON_POSITION] = round(self._last_on_position, 1)
        attrs[ATTR_FADING] = engine.fading
        if engine.fading and engine.target is not None:
            attrs[ATTR_TARGET_POSITION] = round(engine.target, 1)
            remaining = engine.remaining
            if remaining is not None:
                attrs[ATTR_FADE_END] = round(remaining, 1)
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
        self._remember_on_position(self.engine.position)

    async def _async_fade(self, target: float, duration: float | None) -> None:
        if duration is None:
            duration = self._default_transition
        if target > 0:
            self._remember_on_position(target)
        else:
            self._remember_on_position(self.engine.position)
        self.engine.context = self._context
        await self.engine.async_fade_to(target, duration)
        self.async_write_ha_state()

    def _remember_on_position(self, position: float) -> None:
        if position > 0:
            self._last_on_position = position
