"""Websocket API used by the editor panel and the dashboard card."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from homeassistant.components import websocket_api
from homeassistant.components.light import DOMAIN as LIGHT_DOMAIN
from homeassistant.config_entries import SOURCE_USER
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant, callback
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import async_get_platforms
import voluptuous as vol

from .const import CONF_LIGHTS, DOMAIN
from .curve import RoomCurve, sample_room
from .engine import FadeEngine, settle_commands
from .model import curve_from_options, normalize_options

if TYPE_CHECKING:
    from .light import CrescendoLight


def _room_entity(hass: HomeAssistant, entity_id: str) -> CrescendoLight | None:
    for platform in async_get_platforms(hass, DOMAIN):
        if platform.domain == LIGHT_DOMAIN and entity_id in platform.entities:
            return platform.entities[entity_id]  # type: ignore[return-value]
    return None


def _entity_id_for_entry(hass: HomeAssistant, entry_id: str) -> str | None:
    registry = er.async_get(hass)
    for entry in er.async_entries_for_config_entry(registry, entry_id):
        if entry.domain == LIGHT_DOMAIN:
            return entry.entity_id
    return None


def _describe(curve: RoomCurve, samples: int) -> dict[str, Any]:
    return {
        "steps": [{"position": s.position, "name": s.name} for s in curve.steps],
        "samples": samples,
        "lights": sample_room(curve, samples),
    }


@callback
def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register all commands."""
    for command in (
        ws_rooms,
        ws_save,
        ws_create,
        ws_delete,
        ws_preview,
        ws_curve,
    ):
        websocket_api.async_register_command(hass, command)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/rooms"})
@websocket_api.require_admin
@callback
def ws_rooms(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """List all rooms with their configuration."""
    rooms = [
        {
            "entry_id": entry.entry_id,
            "title": entry.title,
            "entity_id": _entity_id_for_entry(hass, entry.entry_id),
            "options": dict(entry.options),
        }
        for entry in hass.config_entries.async_entries(DOMAIN)
    ]
    connection.send_result(msg["id"], rooms)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/room/save",
        vol.Required("entry_id"): str,
        vol.Optional("title"): vol.All(str, vol.Length(min=1)),
        vol.Required("options"): dict,
    }
)
@websocket_api.require_admin
@callback
def ws_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Validate and store a room."""
    entry = hass.config_entries.async_get_entry(msg["entry_id"])
    if entry is None or entry.domain != DOMAIN:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Room not found")
        return
    try:
        options = normalize_options(msg["options"])
    except vol.Invalid as err:
        connection.send_error(msg["id"], websocket_api.ERR_INVALID_FORMAT, str(err))
        return
    hass.config_entries.async_update_entry(
        entry, title=msg.get("title", entry.title), options=options
    )
    connection.send_result(msg["id"], {"options": options})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/room/create",
        vol.Required("title"): vol.All(str, vol.Length(min=1)),
        vol.Optional("lights", default=[]): [str],
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_create(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Create a room through the regular config flow."""
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_NAME: msg["title"], CONF_LIGHTS: msg["lights"]}
    )
    if result["type"] is not FlowResultType.CREATE_ENTRY:
        connection.send_error(msg["id"], "create_failed", str(result.get("errors")))
        return
    connection.send_result(msg["id"], {"entry_id": result["result"].entry_id})


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/room/delete", vol.Required("entry_id"): str}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_delete(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Delete a room."""
    entry = hass.config_entries.async_get_entry(msg["entry_id"])
    if entry is None or entry.domain != DOMAIN:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Room not found")
        return
    await hass.config_entries.async_remove(entry.entry_id)
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/room/preview",
        vol.Optional("entity_id"): str,
        vol.Required("options"): dict,
        vol.Required("position"): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
        vol.Optional("transition", default=0.3): vol.All(
            vol.Coerce(float), vol.Range(min=0, max=10)
        ),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_preview(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Show an unsaved curve on the real lights."""
    try:
        curve = curve_from_options(normalize_options(msg["options"]))
    except vol.Invalid as err:
        connection.send_error(msg["id"], websocket_api.ERR_INVALID_FORMAT, str(err))
        return

    room = _room_entity(hass, msg["entity_id"]) if msg.get("entity_id") else None
    if room is not None:
        await room.engine.async_stop()
        engine = room.engine
    else:
        engine = FadeEngine(hass, curve, 30, lambda: None)
    engine.context = connection.context(msg)
    engine.dispatch(
        settle_commands(curve, msg["position"], msg["transition"], engine.light_infos(curve))
    )
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/room/curve",
        vol.Exclusive("entity_id", "source"): str,
        vol.Exclusive("options", "source"): dict,
        vol.Optional("samples", default=101): vol.All(int, vol.Range(min=2, max=401)),
    }
)
@callback
def ws_curve(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Sampled curves for drawing (card and editor)."""
    if "options" in msg:
        try:
            curve = curve_from_options(normalize_options(msg["options"]))
        except vol.Invalid as err:
            connection.send_error(msg["id"], websocket_api.ERR_INVALID_FORMAT, str(err))
            return
    elif (room := _room_entity(hass, msg.get("entity_id", ""))) is not None:
        curve = room.curve
    else:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Room not found")
        return
    connection.send_result(msg["id"], _describe(curve, msg["samples"]))
