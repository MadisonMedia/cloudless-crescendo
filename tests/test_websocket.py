"""Tests for the websocket API."""

from __future__ import annotations

from homeassistant.components.light import ATTR_BRIGHTNESS
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from custom_components.cloudless_crescendo.const import DOMAIN
from custom_components.cloudless_crescendo.frontend import async_register_card_resource

from .conftest import ROOM


async def test_rooms_and_save(hass: HomeAssistant, hass_ws_client, room_entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": f"{DOMAIN}/rooms"})
    response = await client.receive_json()
    assert response["success"]
    [room] = response["result"]
    assert room["title"] == "Bad"
    assert room["entity_id"] == ROOM
    assert len(room["options"]["steps"]) == 3

    options = room["options"]
    options["steps"][0]["name"] = "Nachtlicht"
    await client.send_json_auto_id(
        {
            "type": f"{DOMAIN}/room/save",
            "entry_id": room["entry_id"],
            "title": "Badezimmer",
            "options": options,
        }
    )
    response = await client.receive_json()
    assert response["success"]
    await hass.async_block_till_done()
    assert room_entry.title == "Badezimmer"
    assert hass.states.get(ROOM).attributes["steps"][0]["name"] == "Nachtlicht"


async def test_save_rejects_invalid(hass: HomeAssistant, hass_ws_client, room_entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": f"{DOMAIN}/room/save",
            "entry_id": room_entry.entry_id,
            "options": {
                "steps": [{"position": 20, "lights": {"light.bad_boden": {"kelvin": 2700}}}]
            },
        }
    )
    response = await client.receive_json()
    assert not response["success"]
    assert "brightness" in response["error"]["message"]


async def test_curve_for_entity_and_draft(hass: HomeAssistant, hass_ws_client, room_entry) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/room/curve", "entity_id": ROOM, "samples": 11}
    )
    response = await client.receive_json()
    assert response["success"]
    result = response["result"]
    assert [s["position"] for s in result["steps"]] == [20, 40, 60]
    assert result["lights"]["light.bad_boden"][2][0] == 50

    await client.send_json_auto_id(
        {
            "type": f"{DOMAIN}/room/curve",
            "options": {"steps": [{"position": 50, "lights": {"light.x": 100}}]},
        }
    )
    response = await client.receive_json()
    assert response["result"]["lights"]["light.x"][100][0] == 100


async def test_preview_moves_real_lights(
    hass: HomeAssistant, hass_ws_client, fake_lights, room_entry
) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {
            "type": f"{DOMAIN}/room/preview",
            "entity_id": ROOM,
            "options": {"steps": [{"position": 50, "lights": {"light.bad_spiegel": 80}}]},
            "position": 50,
        }
    )
    response = await client.receive_json()
    assert response["success"]
    await hass.async_block_till_done(wait_background_tasks=True)
    assert fake_lights["light.bad_spiegel"].calls[-1][1][ATTR_BRIGHTNESS] == 204


async def test_create_and_delete(hass: HomeAssistant, hass_ws_client, setup_lights) -> None:
    assert await async_setup_component(hass, DOMAIN, {})
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/room/create", "title": "Küche", "lights": ["light.bad_boden"]}
    )
    response = await client.receive_json()
    assert response["success"], response
    entry_id = response["result"]["entry_id"]
    await hass.async_block_till_done()
    assert hass.states.get("light.kuche") is not None

    await client.send_json_auto_id({"type": f"{DOMAIN}/room/delete", "entry_id": entry_id})
    assert (await client.receive_json())["success"]
    assert hass.config_entries.async_entries(DOMAIN) == []


async def test_card_resource_is_registered(hass: HomeAssistant) -> None:
    assert await async_setup_component(hass, "lovelace", {})
    url = "/cloudless_crescendo_static/crescendo-card.js?v=1"
    await async_register_card_resource(hass, url)
    await async_register_card_resource(hass, url)
    items = hass.data[LOVELACE_DATA].resources.async_items()
    assert [(i["type"], i["url"]) for i in items] == [("module", url)]

    newer = "/cloudless_crescendo_static/crescendo-card.js?v=2"
    await async_register_card_resource(hass, newer)
    assert [i["url"] for i in hass.data[LOVELACE_DATA].resources.async_items()] == [newer]
