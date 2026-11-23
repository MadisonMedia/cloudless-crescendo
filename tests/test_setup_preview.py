"""The guided setup on the real lights: shown on request, given back afterwards."""

from __future__ import annotations

import asyncio
from datetime import timedelta

from homeassistant.const import EVENT_CALL_SERVICE
from homeassistant.core import Context, HomeAssistant
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
import pytest
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.cloudless_crescendo import setup_preview
from custom_components.cloudless_crescendo.curve import curve_from_options
from custom_components.cloudless_crescendo.model import normalize_options

from .conftest import FLOOR, MIRROR, SINK_A, FakeLights

LAMP = "light.fake_lamp"


def _options(*entity_ids: str, kelvin: int = 2700) -> dict:
    return {
        "lights": [{"entity_id": eid, "mode": "cct"} for eid in entity_ids],
        "stops": [
            {"position": 0},
            {"position": 100, "values": {eid: {"brightness": 100, "kelvin": kelvin} for eid in entity_ids}},
        ],
    }


@pytest.fixture
async def send(hass: HomeAssistant, setup_object, hass_ws_client):
    """Send websocket commands and wait until the lights have answered."""
    await setup_object()
    assert await async_setup_component(hass, "websocket_api", {})
    client = await hass_ws_client(hass)

    async def _send(kind: str, **data) -> dict:
        await client.send_json_auto_id({"type": f"cloudless_crescendo/{kind}", **data})
        result = await client.receive_json()
        await asyncio.sleep(0.3)
        return result

    _send.client = client
    yield _send
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=60))
    await hass.async_block_till_done()


def _on(hass: HomeAssistant, eid: str, **attrs) -> None:
    hass.states.async_set(eid, "on", {"supported_color_modes": ["color_temp", "xy"], **attrs})


def _called(hass: HomeAssistant, eid: str, context: Context) -> None:
    """Announce a light command the way Home Assistant does; the fake lights take the call without it."""
    data = {"domain": "light", "service": "turn_on", "service_data": {"entity_id": [eid]}}
    hass.bus.async_fire(EVENT_CALL_SERVICE, data, context=context)


async def test_lights_show_the_setup_and_return_to_how_they_were(hass: HomeAssistant, lights: FakeLights, send) -> None:
    lights.add(LAMP)
    _on(hass, MIRROR, brightness=77, color_mode="xy", xy_color=(0.2, 0.1))
    result = await send("setup/preview", options=_options(LAMP, MIRROR), position=50)
    assert result["success"], result
    assert hass.states.get(LAMP).state == "on"
    assert hass.states.get(MIRROR).attributes["brightness"] == 128
    await send("setup/preview_end")
    assert hass.states.get(LAMP).state == "off"
    assert lights.last(MIRROR)["data"] == {"brightness": 77, "xy_color": (0.2, 0.1)}


async def test_a_light_that_was_on_under_an_object_that_is_off_stays_on(
    hass: HomeAssistant, lights: FakeLights, send
) -> None:
    _on(hass, FLOOR, brightness=200, color_mode="color_temp", color_temp_kelvin=3000)
    await send("setup/preview", options=_options(FLOOR), position=10)
    await send("setup/preview_end")
    assert hass.states.get(FLOOR).state == "on"
    assert lights.last(FLOOR)["data"] == {"brightness": 200, "color_temp_kelvin": 3000}


async def test_an_object_takes_the_preview_for_nobodys_hand(hass: HomeAssistant, lights: FakeLights, send) -> None:
    await hass.services.async_call(
        "cloudless_crescendo", "fade_to", {"entity_id": "light.bad", "position": 40, "duration": {"seconds": 0}}, True
    )
    await asyncio.sleep(0.3)
    before = dict(hass.states.get("light.bad").attributes)
    engine = next(iter(hass.data["cloudless_crescendo"]["engines"]))
    # Long ago, so a light going off would count as switched off by hand.
    engine.sender.last_send = dict.fromkeys(engine.sender.last_send, 0.0)
    await send("setup/preview", options=_options(FLOOR, MIRROR), position=0)
    assert hass.states.get(FLOOR).state == "off"
    preview = hass.data["cloudless_crescendo"]["setup_previews"][0]
    _called(hass, FLOOR, preview.context)
    _called(hass, FLOOR, Context(parent_id=preview.context.id))
    await send("setup/preview_end")
    after = hass.states.get("light.bad").attributes
    assert after["deviating"] == [] == before["deviating"]
    assert after["command_at"] == before["command_at"]
    # A hand still counts.
    _called(hass, FLOOR, Context())
    await hass.async_block_till_done()
    assert hass.states.get("light.bad").attributes["deviating"] == [FLOOR]


async def test_the_first_state_counts_however_often_a_light_comes_and_goes(
    hass: HomeAssistant, lights: FakeLights, send
) -> None:
    lights.add(LAMP, SINK_A)
    _on(hass, LAMP, brightness=40, color_mode="color_temp", color_temp_kelvin=4000)
    await send("setup/preview", options=_options(LAMP, SINK_A), position=100)
    await send("setup/preview", options=_options(SINK_A), position=100)
    assert lights.last(LAMP)["data"]["brightness"] == 40
    await send("setup/preview", options=_options(LAMP, SINK_A), position=100)
    await send("setup/preview_end")
    await send("setup/preview", options=_options(LAMP), position=80)
    await send("setup/preview_end")
    assert lights.last(LAMP)["data"] == {"brightness": 40, "color_temp_kelvin": 4000}
    assert hass.states.get(SINK_A).state == "off"


async def test_a_closed_browser_gives_the_lights_back(hass: HomeAssistant, lights: FakeLights, send) -> None:
    lights.add(LAMP)
    await send("setup/preview", options=_options(LAMP), position=100)
    assert hass.states.get(LAMP).state == "on"
    await send.client.close()
    await asyncio.sleep(0.5)
    assert hass.states.get(LAMP).state == "off"


async def test_unreachable_lights_are_left_alone(hass: HomeAssistant, lights: FakeLights, send) -> None:
    hass.states.async_set(LAMP, "unavailable", {})
    await send("setup/preview", options=_options(LAMP), position=100)
    await send("setup/preview_end")
    assert lights.for_light(LAMP) == []


async def test_a_command_from_elsewhere_is_not_fought(hass: HomeAssistant, lights: FakeLights, send) -> None:
    lights.add(LAMP)
    await send("setup/preview", options=_options(LAMP), position=100)
    await send("setup/preview_end")
    _called(hass, LAMP, Context())
    await hass.services.async_call("light", "turn_on", {"entity_id": LAMP}, True)
    count = len(lights.for_light(LAMP))
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=3))
    await asyncio.sleep(0.2)
    assert len(lights.for_light(LAMP)) == count
    assert hass.states.get(LAMP).state == "on"


async def test_a_light_moved_by_someone_else_is_not_set_back(hass: HomeAssistant, lights: FakeLights, send) -> None:
    lights.add(LAMP, SINK_A)
    _on(hass, LAMP, brightness=40, color_mode="color_temp", color_temp_kelvin=4000)
    await send("setup/preview", options=_options(LAMP, SINK_A), position=100)
    _called(hass, LAMP, Context())
    await hass.services.async_call("light", "turn_off", {"entity_id": LAMP}, True)
    count = len(lights.for_light(LAMP))
    await send("setup/preview", options=_options(LAMP, SINK_A), position=50)
    await send("setup/preview_end")
    assert len(lights.for_light(LAMP)) == count
    assert hass.states.get(LAMP).state == "off"
    assert hass.states.get(SINK_A).state == "off"
    # The next preview takes it as it is now.
    await send("setup/preview", options=_options(LAMP), position=100)
    assert hass.states.get(LAMP).state == "on"
    await send("setup/preview_end")
    assert hass.states.get(LAMP).state == "off"


async def test_two_previews_of_one_light_give_it_back_once(hass: HomeAssistant, lights: FakeLights, send) -> None:
    lights.add(LAMP)
    await send("setup/preview", options=_options(LAMP), position=100)
    other = setup_preview.SetupPreview(hass)
    other.show(curve_from_options(normalize_options(_options(LAMP))), 50)
    await asyncio.sleep(0.3)
    await send("setup/preview_end")
    other.end()
    await asyncio.sleep(0.5)
    assert hass.states.get(LAMP).state == "off"


async def test_a_finished_preview_goes_away(hass: HomeAssistant, lights: FakeLights, send) -> None:
    lights.add(LAMP)
    await send("setup/preview", options=_options(LAMP), position=100)
    await send("setup/preview_end")
    assert setup_preview.is_previewed(hass, LAMP)
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=40))
    await hass.async_block_till_done()
    assert not setup_preview.is_previewed(hass, LAMP)


async def test_invalid_settings_are_refused(send) -> None:
    result = await send("setup/preview", options={"stops": [{"position": 300}]}, position=10)
    assert not result["success"]
