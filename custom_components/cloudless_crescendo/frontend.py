"""Serve the dashboard card and the editor panel."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

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
    frontend.add_extra_js_url(hass, f"{URL_BASE}/{CARD_FILE}?v={card_version}")

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
