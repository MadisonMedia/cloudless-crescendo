"""Cloudless Crescendo: one scale that moves many lights in a set sequence."""

from __future__ import annotations

from homeassistant.components.light import DOMAIN as LIGHT_DOMAIN
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import service
from homeassistant.helpers.typing import ConfigType
import voluptuous as vol

from .const import (
    ATTR_BUTTON,
    ATTR_DEVICES,
    ATTR_DURATION,
    ATTR_POSITION,
    ATTR_SOURCE,
    DOMAIN,
    SERVICE_FADE_TO,
    SERVICE_PRESS_BUTTON,
    SERVICE_RESET_COLOR,
    SERVICE_SET_ON_POSITION,
    SERVICE_STOP,
)
from .frontend import async_register_frontend
from .model import PERCENT
from .websocket_api import async_register_websocket_commands

PLATFORMS = [Platform.LIGHT]

SOURCE = vol.All(cv.string, vol.Length(max=255))
"""Free text from the caller, shown unchanged in the command_source attribute."""

ON_POSITION = vol.All(vol.Coerce(float), vol.Range(min=0, max=100, min_included=False))
"""A switch-on position of 0 would make switching on switch off."""

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register actions, the websocket API, the card and the setup page."""
    actions = (
        (
            SERVICE_FADE_TO,
            {
                vol.Required(ATTR_POSITION): PERCENT,
                vol.Optional(ATTR_DURATION): cv.positive_time_period,
                vol.Optional(ATTR_SOURCE): SOURCE,
                vol.Optional(ATTR_DEVICES): cv.boolean,
            },
            "async_fade_to",
        ),
        (SERVICE_STOP, {vol.Optional(ATTR_SOURCE): SOURCE}, "async_stop_fade"),
        (SERVICE_PRESS_BUTTON, {vol.Required(ATTR_BUTTON): cv.string}, "async_press_button"),
        (
            SERVICE_SET_ON_POSITION,
            {vol.Optional(ATTR_POSITION): vol.Any(None, ON_POSITION)},
            "async_set_on_position",
        ),
        (SERVICE_RESET_COLOR, None, "async_reset_color"),
    )
    for name, schema, func in actions:
        service.async_register_platform_entity_service(
            hass, DOMAIN, name, entity_domain=LIGHT_DOMAIN, schema=schema, func=func
        )
    async_register_websocket_commands(hass)
    await async_register_frontend(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up an object."""
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_entry_updated))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload an object."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def _async_entry_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Apply new settings without interrupting the object."""
    registry = dr.async_get(hass)
    for device in dr.async_entries_for_config_entry(registry, entry.entry_id):
        if device.name != entry.title:
            registry.async_update_device(device.id, name=entry.title)
    entity = getattr(entry, "runtime_data", None)
    if entity is not None:
        entity.options_changed()
