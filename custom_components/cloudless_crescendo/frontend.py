"""Serve the card and the setup page."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.start import async_at_started
from homeassistant.helpers.storage import Store

from .const import DOMAIN, PANEL_URL, URL_STATIC

_LOGGER = logging.getLogger(__name__)

FILES = Path(__file__).parent / "frontend"
CARD_FILE = "crescendo-card.js"
PANEL_FILE = "crescendo-panel.js"
SETTINGS_KEY = f"{DOMAIN}.settings"
DATA_PANEL_URL = f"{DOMAIN}_panel_url"


def _versions() -> dict[str, str]:
    """Return a short hash per file, so browsers pick up a new version at once."""
    result = {}
    for path in FILES.glob("*.js"):
        result[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()[:10]
    return result


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Register the static files, the card and the sidebar page."""
    await hass.http.async_register_static_paths([StaticPathConfig(URL_STATIC, str(FILES), cache_headers=True)])
    versions = await hass.async_add_executor_job(_versions)
    shared = versions.get("crescendo-shared.js", "0")
    card_url = f"{URL_STATIC}/{CARD_FILE}?v={versions.get(CARD_FILE, '0')}{shared}"
    panel_url = f"{URL_STATIC}/{PANEL_FILE}?v={versions.get(PANEL_FILE, '0')}{shared}"

    # The extra module makes the card available everywhere. The dashboard resource makes
    # sure it is ready before a dashboard renders, also in companion apps.
    frontend.add_extra_js_url(hass, card_url)

    @callback
    def _register_resource(_hass: HomeAssistant) -> None:
        hass.async_create_task(_async_register_resource(hass, card_url))

    async_at_started(hass, _register_resource)

    hass.data[DATA_PANEL_URL] = panel_url
    if PANEL_URL not in hass.data.get(frontend.DATA_PANELS, {}):
        await _async_register_panel(hass, panel_url, await async_sidebar_shown(hass))


def _settings(hass: HomeAssistant) -> Store:
    return Store(hass, 1, SETTINGS_KEY)


async def async_sidebar_shown(hass: HomeAssistant) -> bool:
    """Return whether the setup page has an entry in the sidebar. It has one until someone removes it."""
    data = await _settings(hass).async_load() or {}
    return bool(data.get("sidebar", True))


async def async_set_sidebar(hass: HomeAssistant, show: bool) -> None:
    """Show or hide the sidebar entry. The page stays reachable at its address either way."""
    store = _settings(hass)
    data = await store.async_load() or {}
    data["sidebar"] = show
    await store.async_save(data)
    await _async_apply_sidebar(hass, show)


async def _async_apply_sidebar(hass: HomeAssistant, show: bool) -> None:
    panel_url = hass.data.get(DATA_PANEL_URL)
    if panel_url is None:
        return
    frontend.async_remove_panel(hass, PANEL_URL, warn_if_unknown=False)
    await _async_register_panel(hass, panel_url, show)


async def _async_register_panel(hass: HomeAssistant, panel_url: str, sidebar: bool) -> None:
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name="crescendo-panel",
        sidebar_title="Crescendo" if sidebar else None,
        sidebar_icon="mdi:tune-vertical-variant" if sidebar else None,
        module_url=panel_url,
        require_admin=True,
    )


async def _async_register_resource(hass: HomeAssistant, url: str) -> None:
    """Add or update the card in the dashboard resources, for dashboards in storage mode."""
    try:
        from homeassistant.components.lovelace.const import LOVELACE_DATA, MODE_STORAGE
    except ImportError:
        return
    data = hass.data.get(LOVELACE_DATA)
    if data is None or data.resource_mode != MODE_STORAGE:
        return
    resources = data.resources
    try:
        if not getattr(resources, "loaded", True):
            await resources.async_load()
            resources.loaded = True
        base = url.split("?", 1)[0]
        for item in resources.async_items():
            if str(item.get("url", "")).split("?", 1)[0] == base:
                if item["url"] != url:
                    await resources.async_update_item(item["id"], {"res_type": "module", "url": url})
                return
        await resources.async_create_item({"res_type": "module", "url": url})
    except Exception:
        _LOGGER.warning("Could not add the Crescendo card to the dashboard resources", exc_info=True)
