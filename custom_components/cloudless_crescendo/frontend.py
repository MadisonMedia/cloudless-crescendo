"""Serve the dashboard card and the editor panel."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.start import async_at_started

from .const import DOMAIN, PANEL_URL, URL_BASE

_LOGGER = logging.getLogger(__name__)

FRONTEND_DIR = Path(__file__).parent / "frontend"
CARD_FILE = "crescendo-card.js"
PANEL_FILE = "crescendo-panel.js"


def _version(path: Path) -> str:
    """Short content hash so browsers pick up new versions immediately."""
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()[:10]
    except OSError:
        return "0"


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Register static files, the card (loaded everywhere) and the sidebar panel."""
    if not FRONTEND_DIR.is_dir():
        _LOGGER.error("Frontend files are missing in %s", FRONTEND_DIR)
        return

    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL_BASE, str(FRONTEND_DIR), cache_headers=True)]
    )
    card_version, panel_version = await hass.async_add_executor_job(
        lambda: (_version(FRONTEND_DIR / CARD_FILE), _version(FRONTEND_DIR / PANEL_FILE))
    )
    card_url = f"{URL_BASE}/{CARD_FILE}?v={card_version}"
    frontend.add_extra_js_url(hass, card_url)

    # Also register the card as a dashboard resource. Dashboards load their
    # resources before rendering cards, which makes the card available even
    # where the extra module loads too late (e.g. some companion apps).
    @callback
    def _register_resource(_hass: HomeAssistant) -> None:
        hass.async_create_task(async_register_card_resource(hass, card_url))

    async_at_started(hass, _register_resource)

    if PANEL_URL not in hass.data.get(frontend.DATA_PANELS, {}):
        await panel_custom.async_register_panel(
            hass,
            frontend_url_path=PANEL_URL,
            webcomponent_name="crescendo-panel",
            sidebar_title="Crescendo",
            sidebar_icon="mdi:tune-vertical-variant",
            module_url=f"{URL_BASE}/{PANEL_FILE}?v={panel_version}",
            require_admin=True,
            config={"domain": DOMAIN},
        )


async def async_register_card_resource(hass: HomeAssistant, url: str) -> None:
    """Add or update the card in the dashboard resources (storage mode only)."""
    try:
        from homeassistant.components.lovelace.const import (  # noqa: PLC0415
            LOVELACE_DATA,
            MODE_STORAGE,
        )
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
                    await resources.async_update_item(
                        item["id"], {"res_type": "module", "url": url}
                    )
                return
        await resources.async_create_item({"res_type": "module", "url": url})
        _LOGGER.info("Added the Crescendo card to the dashboard resources")
    except Exception:
        _LOGGER.warning(
            "Could not add the Crescendo card to the dashboard resources", exc_info=True
        )
