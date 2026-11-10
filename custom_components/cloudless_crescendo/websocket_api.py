"""Websocket API for the setup page and the cards."""

from __future__ import annotations

from typing import Any

from homeassistant.components import websocket_api
from homeassistant.config_entries import SOURCE_USER, ConfigEntry
from homeassistant.const import CONF_NAME
from homeassistant.core import Context, HomeAssistant, callback
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import entity_registry as er
import voluptuous as vol

from .const import CONF_DEVICES, CONF_LIGHTS, DOMAIN
from .curve import curve_from_options
from .engine import Engine, Origin
from .model import normalize_options
from .planner import settle


def _entry_for_entity(hass: HomeAssistant, entity_id: str) -> ConfigEntry | None:
    registry_entry = er.async_get(hass).async_get(entity_id)
    if registry_entry is None or registry_entry.platform != DOMAIN or registry_entry.config_entry_id is None:
        return None
    return hass.config_entries.async_get_entry(registry_entry.config_entry_id)


def _engine_for_entity(hass: HomeAssistant, entity_id: str) -> Engine | None:
    entry = _entry_for_entity(hass, entity_id)
    entity = getattr(entry, "runtime_data", None) if entry is not None else None
    return entity.engine if entity is not None else None


def _entity_id_of(hass: HomeAssistant, entry_id: str) -> str | None:
    for item in er.async_entries_for_config_entry(er.async_get(hass), entry_id):
        if item.domain == "light":
            return item.entity_id
    return None


def _describe(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    return {
        "entry_id": entry.entry_id,
        "title": entry.title,
        "entity_id": _entity_id_of(hass, entry.entry_id),
        "options": dict(entry.options),
    }


@callback
def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register all commands."""
    for command in (
        ws_objects,
        ws_object,
        ws_save,
        ws_create,
        ws_delete,
        ws_position,
        ws_set_lights,
        ws_reset_lights,
        ws_color_lights,
        ws_reset_color,
        ws_preview,
        ws_diagnostics,
        ws_test_connection,
    ):
        websocket_api.async_register_command(hass, command)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/objects"})
@websocket_api.require_admin
@callback
def ws_objects(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """List all objects with their settings."""
    connection.send_result(msg["id"], [_describe(hass, entry) for entry in hass.config_entries.async_entries(DOMAIN)])


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/object", vol.Required("entity_id"): str})
@callback
def ws_object(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Return one object's settings, for drawing a card.

    Cards are shown to users without admin rights too. They get no device actions, which a card does not need.
    """
    entry = _entry_for_entity(hass, msg["entity_id"])
    if entry is None:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Not a Crescendo object")
        return
    described = _describe(hass, entry)
    if not connection.user.is_admin:
        described["options"] = {k: v for k, v in described["options"].items() if k != CONF_DEVICES}
    connection.send_result(msg["id"], described)


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/object/save",
        vol.Required("entry_id"): str,
        vol.Optional("title"): vol.All(str, vol.Length(min=1)),
        vol.Required("options"): dict,
    }
)
@websocket_api.require_admin
@callback
def ws_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Validate and store an object's settings."""
    entry = hass.config_entries.async_get_entry(msg["entry_id"])
    if entry is None or entry.domain != DOMAIN:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Object not found")
        return
    try:
        options = normalize_options(msg["options"])
    except vol.Invalid as err:
        connection.send_error(msg["id"], websocket_api.ERR_INVALID_FORMAT, str(err))
        return
    hass.config_entries.async_update_entry(entry, title=msg.get("title", entry.title), options=options)
    connection.send_result(msg["id"], {"options": options})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/object/create",
        vol.Required("title"): vol.All(str, vol.Length(min=1)),
        vol.Optional("lights", default=[]): [str],
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_create(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Create an object through the regular config flow."""
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_NAME: msg["title"], CONF_LIGHTS: msg["lights"]}
    )
    if result["type"] is not FlowResultType.CREATE_ENTRY:
        connection.send_error(msg["id"], "create_failed", str(result.get("errors")))
        return
    connection.send_result(msg["id"], {"entry_id": result["result"].entry_id})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/object/delete", vol.Required("entry_id"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_delete(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Delete an object."""
    entry = hass.config_entries.async_get_entry(msg["entry_id"])
    if entry is None or entry.domain != DOMAIN:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Object not found")
        return
    await hass.config_entries.async_remove(entry.entry_id)
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/position",
        vol.Required("entity_id"): str,
        vol.Required("position"): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
        vol.Optional("final", default=False): bool,
    }
)
@callback
def ws_position(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Follow a hand on a card's slider."""
    engine = _engine_for_entity(hass, msg["entity_id"])
    if engine is None:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Not a Crescendo object")
        return
    # Each drag gets its own context with the user. The engine's context stays without a user, because the
    # engine recognizes its own commands to the lights by it.
    user_id = connection.user.id
    engine.set_position(msg["position"], final=msg["final"], origin=Origin(None, user_id, Context(user_id=user_id)))
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/lights/set",
        vol.Required("entity_id"): str,
        vol.Required("lights"): [str],
        vol.Required("brightness"): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
    }
)
@callback
def ws_set_lights(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Set single lights apart from the curve."""
    engine = _engine_for_entity(hass, msg["entity_id"])
    if engine is None:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Not a Crescendo object")
        return
    engine.set_lights(msg["lights"], msg["brightness"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/lights/color",
        vol.Required("entity_id"): str,
        vol.Required("lights"): [str],
        vol.Exclusive("kelvin", "color"): vol.All(vol.Coerce(float), vol.Range(min=1000, max=12000)),
        vol.Exclusive("xy", "color"): vol.All([vol.All(vol.Coerce(float), vol.Range(min=0, max=1))], vol.Length(2)),
    }
)
@callback
def ws_color_lights(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Give single lights their own color."""
    engine = _engine_for_entity(hass, msg["entity_id"])
    if engine is None:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Not a Crescendo object")
        return
    if "kelvin" not in msg and "xy" not in msg:
        connection.send_error(msg["id"], websocket_api.ERR_INVALID_FORMAT, "Give kelvin or xy")
        return
    engine.set_light_colors(msg["lights"], msg.get("kelvin"), tuple(msg["xy"]) if "xy" in msg else None)
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/lights/reset",
        vol.Required("entity_id"): str,
        vol.Optional("what", default="all"): vol.In(["all", "brightness", "colors"]),
    }
)
@websocket_api.async_response
async def ws_reset_lights(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Bring single lights back to the curve: brightness, colors (with a chosen color), or all."""
    engine = _engine_for_entity(hass, msg["entity_id"])
    if engine is None:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Not a Crescendo object")
        return
    if msg["what"] == "colors":
        await engine.async_reset_color()
    else:
        engine.reset_lights(msg["what"])
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/color/reset", vol.Required("entity_id"): str})
@websocket_api.async_response
async def ws_reset_color(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Return to the colors of the stops."""
    engine = _engine_for_entity(hass, msg["entity_id"])
    if engine is None:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Not a Crescendo object")
        return
    await engine.async_reset_color()
    connection.send_result(msg["id"])


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/preview",
        vol.Required("entry_id"): str,
        vol.Required("options"): dict,
        vol.Required("position"): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
    }
)
@websocket_api.require_admin
@callback
def ws_preview(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Show settings on the real lights before they are saved."""
    entity = getattr(hass.config_entries.async_get_entry(msg["entry_id"]), "runtime_data", None)
    if entity is None:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Object not found")
        return
    try:
        options = normalize_options(msg["options"])
    except vol.Invalid as err:
        connection.send_error(msg["id"], websocket_api.ERR_INVALID_FORMAT, str(err))
        return
    engine: Engine = entity.engine
    curve = curve_from_options(options)
    lit = {eid: engine.sender.expected_on.get(eid, False) for eid in curve.lights}
    for eid in curve.lights:
        state = hass.states.get(eid)
        if eid not in engine.sender.expected_on and state is not None:
            lit[eid] = state.state == "on"
    for step in settle(curve, msg["position"], lit, 0.3):
        engine.sender.send(step.entity_id, step.commands, step.transition)
        if step.target is not None:
            engine.last_targets[step.entity_id] = step.target
    connection.send_result(msg["id"])


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/diagnostics", vol.Required("entity_id"): str})
@websocket_api.require_admin
@callback
def ws_diagnostics(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Return what sending to each light looked like so far."""
    engine = _engine_for_entity(hass, msg["entity_id"])
    if engine is None:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Not a Crescendo object")
        return
    connection.send_result(msg["id"], engine.diagnostics())


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/test_connection", vol.Required("entity_id"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_test_connection(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Switch each light briefly and measure its answer."""
    engine = _engine_for_entity(hass, msg["entity_id"])
    if engine is None:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Not a Crescendo object")
        return
    connection.send_result(msg["id"], await engine.async_test_connection())
