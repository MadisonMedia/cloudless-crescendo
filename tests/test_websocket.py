"""The websocket API used by the setup page and the cards."""

from __future__ import annotations

import asyncio

from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from .conftest import FLOOR, FakeLights


async def _client(hass: HomeAssistant, hass_ws_client):
    assert await async_setup_component(hass, "websocket_api", {})
    return await hass_ws_client(hass)


async def test_objects_and_saving(hass: HomeAssistant, setup_object, hass_ws_client) -> None:
    await setup_object()
    client = await _client(hass, hass_ws_client)
    await client.send_json_auto_id({"type": "cloudless_crescendo/objects"})
    objects = (await client.receive_json())["result"]
    assert objects[0]["entity_id"] == "light.bad"
    options = objects[0]["options"]
    options["slider_rate"] = 2
    await client.send_json_auto_id(
        {
            "type": "cloudless_crescendo/object/save",
            "entry_id": objects[0]["entry_id"],
            "options": options,
            "title": "Bad 2",
        }
    )
    result = await client.receive_json()
    assert result["success"], result
    assert hass.config_entries.async_entries("cloudless_crescendo")[0].title == "Bad 2"


async def test_invalid_settings_are_refused(hass: HomeAssistant, setup_object, hass_ws_client) -> None:
    await setup_object()
    client = await _client(hass, hass_ws_client)
    entry = hass.config_entries.async_entries("cloudless_crescendo")[0]
    await client.send_json_auto_id(
        {
            "type": "cloudless_crescendo/object/save",
            "entry_id": entry.entry_id,
            "options": {"stops": [{"position": 300}]},
        }
    )
    assert not (await client.receive_json())["success"]


async def test_position_drives_the_lights(
    hass: HomeAssistant, setup_object, hass_ws_client, lights: FakeLights
) -> None:
    await setup_object()
    client = await _client(hass, hass_ws_client)
    await client.send_json_auto_id(
        {"type": "cloudless_crescendo/position", "entity_id": "light.bad", "position": 20, "final": True}
    )
    assert (await client.receive_json())["success"]
    await asyncio.sleep(0.2)
    assert hass.states.get(FLOOR).state == "on"


async def test_create_and_delete(hass: HomeAssistant, setup_object, hass_ws_client) -> None:
    await setup_object()
    client = await _client(hass, hass_ws_client)
    await client.send_json_auto_id({"type": "cloudless_crescendo/object/create", "title": "Küche", "lights": [FLOOR]})
    created = await client.receive_json()
    assert created["success"], created
    await hass.async_block_till_done()
    assert len(hass.config_entries.async_entries("cloudless_crescendo")) == 2
    await client.send_json_auto_id(
        {"type": "cloudless_crescendo/object/delete", "entry_id": created["result"]["entry_id"]}
    )
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert len(hass.config_entries.async_entries("cloudless_crescendo")) == 1


async def test_connection_test_reports_each_light_and_restores_it(
    hass: HomeAssistant, setup_object, hass_ws_client, lights: FakeLights
) -> None:
    await setup_object()
    client = await _client(hass, hass_ws_client)
    hass.states.async_set(FLOOR, "on", {"brightness": 200, "color_mode": "color_temp", "color_temp_kelvin": 3000})
    await client.send_json_auto_id({"type": "cloudless_crescendo/test_connection", "entity_id": "light.bad"})
    result = await asyncio.wait_for(client.receive_json(), 10)
    assert result["success"], result
    assert all(item["ok"] for item in result["result"])
    assert hass.states.get(FLOOR).attributes["brightness"] == 200
    assert hass.states.get("light.fake_mirror").state == "off"


async def test_diagnostics_report_answers(hass: HomeAssistant, setup_object, hass_ws_client) -> None:
    entity = await setup_object()
    client = await _client(hass, hass_ws_client)
    await entity.engine.async_fade_to(20, 0.1)
    await asyncio.sleep(0.3)
    await client.send_json_auto_id({"type": "cloudless_crescendo/diagnostics", "entity_id": "light.bad"})
    result = (await client.receive_json())["result"]
    floor = next(x for x in result["lights"] if x["entity_id"] == FLOOR)
    assert floor["answers"] >= 1
    assert floor["failures"] == 0


async def test_a_card_without_admin_rights_gets_no_device_actions(
    hass: HomeAssistant, setup_object, hass_ws_client, hass_read_only_access_token
) -> None:
    from .conftest import sample_options

    await setup_object(
        options=sample_options(
            devices=[{"entity_id": "cover.bad", "kind": "threshold", "at": 60, "action": "open_cover", "back": None}]
        )
    )
    assert await async_setup_component(hass, "websocket_api", {})
    reader = await hass_ws_client(hass, hass_read_only_access_token)
    await reader.send_json_auto_id({"type": "cloudless_crescendo/object", "entity_id": "light.bad"})
    seen = (await reader.receive_json())["result"]["options"]
    assert seen["lights"]
    assert seen["stops"]
    assert "devices" not in seen
    admin = await hass_ws_client(hass)
    await admin.send_json_auto_id({"type": "cloudless_crescendo/object", "entity_id": "light.bad"})
    assert (await admin.receive_json())["result"]["options"]["devices"]
