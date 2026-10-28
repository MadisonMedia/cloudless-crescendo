"""Cloudless Crescendo: one slider, many lights, staggered dimming curves."""

from __future__ import annotations

from homeassistant.components.light import DOMAIN as LIGHT_DOMAIN
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv, service
from homeassistant.helpers.typing import ConfigType
import voluptuous as vol

from .const import ATTR_DURATION, ATTR_POSITION, DOMAIN, SERVICE_FADE_TO, SERVICE_STOP
from .frontend import async_register_frontend
from .model import PERCENT
from .websocket_api import async_register_websocket_commands

PLATFORMS = [Platform.LIGHT]

# Rooms are configured in the UI. Old YAML rooms under `light:` are imported.
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register actions, the websocket API, the card and the editor panel."""
    service.async_register_platform_entity_service(
        hass,
        DOMAIN,
        SERVICE_FADE_TO,
        entity_domain=LIGHT_DOMAIN,
        schema={
            vol.Required(ATTR_POSITION): PERCENT,
            vol.Optional(ATTR_DURATION): cv.positive_time_period,
        },
        func="async_fade_to",
    )
    service.async_register_platform_entity_service(
        hass,
        DOMAIN,
        SERVICE_STOP,
        entity_domain=LIGHT_DOMAIN,
        schema=None,
        func="async_stop_fade",
    )
    async_register_websocket_commands(hass)
    await async_register_frontend(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up a room."""
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a room."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Apply changed options by reloading the room."""
    await hass.config_entries.async_reload(entry.entry_id)
