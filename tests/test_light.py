"""The object as a light: fades, slider, color, devices and other people."""

from __future__ import annotations

import asyncio
from datetime import timedelta

from homeassistant.core import Context, HomeAssistant
from pytest_homeassistant_custom_component.common import async_mock_service

from .conftest import FLOOR, MIRROR, SINK_A, FakeLights, sample_options


async def _wait(hass: HomeAssistant, seconds: float = 0.25) -> None:
    await asyncio.sleep(seconds)
    await hass.async_block_till_done()


async def test_the_object_is_a_light_and_brightness_is_position(hass: HomeAssistant, setup_object) -> None:
    entity = await setup_object()
    assert entity.entity_id == "light.bad"
    assert hass.states.get("light.bad").state == "off"
    await hass.services.async_call(
        "light", "turn_on", {"entity_id": "light.bad", "brightness_pct": 40, "transition": 0.2}, blocking=True
    )
    await _wait(hass, 0.4)
    state = hass.states.get("light.bad")
    assert state.state == "on"
    assert abs(state.attributes["position"] - 40) < 0.5


async def test_turn_on_runs_the_sequence_natively(hass: HomeAssistant, setup_object, lights: FakeLights) -> None:
    entity = await setup_object()
    await entity.engine.async_fade_to(20, 0.2)
    await _wait(hass, 0.4)
    assert hass.states.get(FLOOR).state == "on"
    assert hass.states.get(MIRROR).state == "off"
    calls = lights.for_light(FLOOR)
    assert calls[0]["data"]["brightness"] == 1
    assert calls[1]["data"]["transition"] == 0.2


async def test_switching_off_runs_backward_and_really_ends_off(
    hass: HomeAssistant, setup_object, lights: FakeLights
) -> None:
    entity = await setup_object()
    await entity.engine.async_fade_to(100, 0.1)
    await _wait(hass, 0.3)
    assert hass.states.get(SINK_A).state == "on"
    await hass.services.async_call("light", "turn_off", {"entity_id": "light.bad", "transition": 0.2}, blocking=True)
    await _wait(hass, 1.0)
    assert hass.states.get(FLOOR).state == "off"
    assert hass.states.get(SINK_A).state == "off"
    assert hass.states.get("light.bad").state == "off"


async def test_switch_on_without_brightness_returns_to_the_last_position(hass: HomeAssistant, setup_object) -> None:
    entity = await setup_object()
    await entity.engine.async_fade_to(60, 0.1)
    await _wait(hass)
    await entity.engine.async_fade_to(0, 0.1)
    await _wait(hass, 0.9)
    await hass.services.async_call("light", "turn_on", {"entity_id": "light.bad", "transition": 0.1}, blocking=True)
    await _wait(hass)
    assert abs(hass.states.get("light.bad").attributes["position"] - 60) < 0.5


async def test_another_plugin_can_set_the_switch_on_position(hass: HomeAssistant, setup_object) -> None:
    entity = await setup_object()
    await hass.services.async_call(
        "cloudless_crescendo", "set_on_position", {"entity_id": "light.bad", "position": 25}, blocking=True
    )
    await hass.services.async_call("light", "turn_on", {"entity_id": "light.bad", "transition": 0.1}, blocking=True)
    await _wait(hass)
    assert abs(entity.engine.position - 25) < 0.5


async def test_fade_to_and_press_button(hass: HomeAssistant, setup_object) -> None:
    # 0 to 100 % in 1 s, so a button from 20 to 40 % takes 0.2 s.
    entity = await setup_object(options=sample_options(default_transition=1))
    await hass.services.async_call(
        "cloudless_crescendo",
        "fade_to",
        {"entity_id": "light.bad", "position": 20, "duration": {"seconds": 0}},
        blocking=True,
    )
    await _wait(hass)
    assert abs(entity.engine.position - 20) < 0.5
    await hass.services.async_call(
        "cloudless_crescendo", "press_button", {"entity_id": "light.bad", "button": "morgen"}, blocking=True
    )
    await _wait(hass, 0.4)
    assert entity.engine.position == 40


async def test_stop_holds_the_position(hass: HomeAssistant, setup_object) -> None:
    entity = await setup_object()
    await hass.services.async_call(
        "cloudless_crescendo",
        "fade_to",
        {"entity_id": "light.bad", "position": 100, "duration": timedelta(seconds=10)},
        blocking=True,
    )
    await _wait(hass, 0.1)
    assert entity.engine.fade is not None
    await hass.services.async_call("cloudless_crescendo", "stop", {"entity_id": "light.bad"}, blocking=True)
    await _wait(hass, 0.1)
    assert entity.engine.fade is None
    assert 0 < entity.engine.position < 20


async def test_the_slider_sends_only_what_changed_and_ends_exact(
    hass: HomeAssistant, setup_object, lights: FakeLights
) -> None:
    entity = await setup_object()
    engine = entity.engine
    for value in (5, 10, 15, 20):
        engine.set_position(value)
        await _wait(hass, 0.05)
    engine.set_position(20, final=True)
    await _wait(hass)
    assert hass.states.get(FLOOR).state == "on"
    assert hass.states.get(FLOOR).attributes["brightness"] == 51
    assert not lights.for_light(MIRROR)
    assert engine.position == 20


async def test_a_chosen_color_overrides_the_stops_until_off(
    hass: HomeAssistant, setup_object, lights: FakeLights
) -> None:
    entity = await setup_object()
    await entity.engine.async_fade_to(60, 0.1)
    await _wait(hass)
    await hass.services.async_call(
        "light", "turn_on", {"entity_id": "light.bad", "xy_color": [0.3, 0.3], "transition": 0.1}, blocking=True
    )
    await _wait(hass)
    assert lights.last(FLOOR)["data"]["xy_color"] == (0.3, 0.3)
    assert "xy_color" not in lights.last(MIRROR)["data"]
    assert hass.states.get("light.bad").attributes["color_override"] is True
    await entity.engine.async_fade_to(0, 0.1)
    await _wait(hass, 0.9)
    assert entity.engine.override is None


async def test_the_object_reports_a_chosen_color_even_where_white_lights_outweigh_it(
    hass: HomeAssistant, setup_object, lights: FakeLights
) -> None:
    entity = await setup_object()
    await entity.engine.async_fade_to(100, 0.1)
    await _wait(hass)
    await hass.services.async_call(
        "light", "turn_on", {"entity_id": "light.bad", "xy_color": [0.6, 0.35], "transition": 0.1}, blocking=True
    )
    await _wait(hass)
    assert "xy_color" not in lights.last(MIRROR)["data"]
    attributes = hass.states.get("light.bad").attributes
    assert attributes["color_mode"] == "xy"
    assert tuple(attributes["xy_color"]) == (0.6, 0.35)
    await hass.services.async_call(
        "light", "turn_on", {"entity_id": "light.bad", "color_temp_kelvin": 4500, "transition": 0.1}, blocking=True
    )
    await _wait(hass)
    attributes = hass.states.get("light.bad").attributes
    assert attributes["color_mode"] == "color_temp"
    assert attributes["color_temp_kelvin"] == 4500


async def test_a_change_from_outside_takes_only_that_light_out(
    hass: HomeAssistant, setup_object, lights: FakeLights
) -> None:
    entity = await setup_object()
    engine = entity.engine
    await engine.async_fade_to(60, 0.1)
    await _wait(hass)
    hass.bus.async_fire(
        "call_service",
        {"domain": "light", "service": "turn_on", "service_data": {"entity_id": MIRROR}},
        context=Context(),
    )
    await _wait(hass, 0.05)
    assert MIRROR in engine.deviating
    before = len(lights.for_light(MIRROR))
    engine.set_position(50)
    await _wait(hass, 0.1)
    engine.set_position(50, final=True)
    await _wait(hass)
    assert not engine.deviating
    assert len(lights.for_light(MIRROR)) > before


async def test_a_light_changed_during_a_fade_gets_no_more_of_its_steps(
    hass: HomeAssistant, setup_object, lights: FakeLights
) -> None:
    entity = await setup_object()
    engine = entity.engine
    await engine.async_fade_to(100, 1.0)
    await _wait(hass, 0.1)
    hass.bus.async_fire(
        "call_service",
        {"domain": "light", "service": "turn_on", "service_data": {"entity_id": MIRROR}},
        context=Context(),
    )
    await _wait(hass, 0.05)
    before = len(lights.for_light(MIRROR))
    floor_before = len(lights.for_light(FLOOR))
    await _wait(hass, 1.2)
    assert len(lights.for_light(MIRROR)) == before
    assert MIRROR in engine.deviating
    assert len(lights.for_light(FLOOR)) > floor_before


async def test_a_second_object_over_the_same_lights_stops_the_first(hass: HomeAssistant, setup_object) -> None:
    first = await setup_object("Bad")
    second = await setup_object("Abend", sample_options())
    await first.engine.async_fade_to(100, 10)
    assert first.engine.fade is not None
    await second.engine.async_fade_to(50, 0.1)
    assert first.engine.fade is None
    await _wait(hass)


async def test_devices_follow_the_scale(hass: HomeAssistant, setup_object) -> None:
    volume = async_mock_service(hass, "media_player", "volume_set")
    play = async_mock_service(hass, "media_player", "media_play")
    temperature = async_mock_service(hass, "climate", "set_temperature")
    options = sample_options(
        devices=[
            {"entity_id": "media_player.bad", "kind": "ramp", "from": 20, "to": 100, "min": 0, "max": 40},
            {"entity_id": "climate.bad", "kind": "ramp", "from": 0, "to": 100, "min": 19, "max": 22},
            {"entity_id": "media_player.bad", "kind": "threshold", "at": 20, "action": "media_play"},
        ]
    )
    entity = await setup_object(options=options)
    await entity.engine.async_fade_to(100, 0.2)
    await _wait(hass, 0.5)
    assert len(play) == 1
    assert volume[-1].data["volume_level"] == 0.4
    assert temperature[-1].data["temperature"] == 22


async def test_thresholds_on_the_slider_wait_for_the_release(hass: HomeAssistant, setup_object) -> None:
    opened = async_mock_service(hass, "cover", "open_cover")
    closed = async_mock_service(hass, "cover", "close_cover")
    options = sample_options(
        devices=[
            {"entity_id": "cover.bad", "kind": "threshold", "at": 50, "action": "open_cover", "back": "close_cover"}
        ]
    )
    entity = await setup_object(options=options)
    engine = entity.engine
    engine.set_position(80)
    await _wait(hass, 0.1)
    assert not opened
    engine.set_position(30)
    await _wait(hass, 0.1)
    engine.set_position(30, final=True)
    await _wait(hass, 0.1)
    assert not opened
    engine.set_position(70, final=True)
    await _wait(hass, 0.1)
    assert len(opened) == 1
    engine.set_position(10, final=True)
    await _wait(hass, 0.1)
    assert len(closed) == 1


async def test_single_lights_deviate_until_the_next_command(
    hass: HomeAssistant, setup_object, lights: FakeLights
) -> None:
    entity = await setup_object()
    engine = entity.engine
    await engine.async_fade_to(60, 0.1)
    await _wait(hass)
    engine.set_lights([MIRROR], 90)
    await _wait(hass, 0.1)
    assert lights.last(MIRROR)["data"]["brightness"] == 230
    assert MIRROR in engine.deviating
    await engine.async_fade_to(60.5, 0.1)
    assert not engine.deviating
    await _wait(hass)
    assert lights.last(MIRROR)["data"]["brightness"] < 230


async def test_options_apply_without_a_restart(hass: HomeAssistant, setup_object) -> None:
    entity = await setup_object()
    entry = hass.config_entries.async_entries("cloudless_crescendo")[0]
    options = sample_options(default_transition=7)
    hass.config_entries.async_update_entry(entry, options=options, title="Neu")
    await hass.async_block_till_done()
    assert entity.engine.options["default_transition"] == 7
    assert hass.states.get("light.bad") is not None


async def test_a_chosen_color_reaches_a_light_set_apart_and_keeps_its_brightness(
    hass: HomeAssistant, setup_object, lights: FakeLights
) -> None:
    entity = await setup_object()
    await hass.services.async_call(
        "light", "turn_on", {"entity_id": "light.bad", "brightness_pct": 60, "transition": 0}, blocking=True
    )
    await asyncio.sleep(0.2)
    entity.engine.set_lights([FLOOR], 30)
    await asyncio.sleep(0.2)
    await hass.services.async_call(
        "light", "turn_on", {"entity_id": "light.bad", "xy_color": [0.6, 0.35], "transition": 0.1}, blocking=True
    )
    await asyncio.sleep(0.2)
    sent = lights.last(FLOOR)["data"]
    assert sent["xy_color"] == (0.6, 0.35)
    assert "brightness" not in sent
    assert FLOOR in entity.engine.deviating
    assert "xy_color" not in lights.last(MIRROR)["data"]
    await hass.services.async_call("cloudless_crescendo", "reset_color", {"entity_id": "light.bad"}, blocking=True)
    await asyncio.sleep(0.2)
    back = lights.last(FLOOR)["data"]
    assert back["color_temp_kelvin"] == 3000
    assert "brightness" not in back


async def test_a_single_light_keeps_its_own_color(hass: HomeAssistant, setup_object, lights: FakeLights) -> None:
    entity = await setup_object()
    await hass.services.async_call(
        "light", "turn_on", {"entity_id": "light.bad", "brightness_pct": 60, "transition": 0}, blocking=True
    )
    await asyncio.sleep(0.2)
    entity.engine.set_light_colors([FLOOR], xy=(0.2, 0.3))
    entity.engine.set_light_colors([MIRROR], xy=(0.2, 0.3))
    await asyncio.sleep(0.2)
    sent = lights.last(FLOOR)["data"]
    assert sent["xy_color"] == (0.2, 0.3)
    assert "brightness" not in sent
    attributes = hass.states.get("light.bad").attributes
    assert attributes["deviating"] == [FLOOR]
    assert attributes["deviating_color"] == [FLOOR]
    assert attributes["deviating_brightness"] == []
    floor_calls = len(lights.for_light(FLOOR))
    await hass.services.async_call(
        "light", "turn_on", {"entity_id": "light.bad", "xy_color": [0.6, 0.35], "transition": 0.1}, blocking=True
    )
    await asyncio.sleep(0.2)
    assert len(lights.for_light(FLOOR)) == floor_calls


async def test_dimming_and_colors_reset_separately(hass: HomeAssistant, setup_object, lights: FakeLights) -> None:
    entity = await setup_object()
    await hass.services.async_call(
        "light", "turn_on", {"entity_id": "light.bad", "brightness_pct": 60, "transition": 0}, blocking=True
    )
    await asyncio.sleep(0.2)
    entity.engine.set_lights([FLOOR], 30)
    entity.engine.set_light_colors([FLOOR], kelvin=5000)
    await asyncio.sleep(0.2)
    entity.engine.reset_lights("brightness")
    await asyncio.sleep(0.2)
    back = lights.last(FLOOR)["data"]
    assert back["brightness"] == 255
    assert back["color_temp_kelvin"] == 5000
    attributes = hass.states.get("light.bad").attributes
    assert attributes["deviating_brightness"] == []
    assert attributes["deviating_color"] == [FLOOR]
    await hass.services.async_call("cloudless_crescendo", "reset_color", {"entity_id": "light.bad"}, blocking=True)
    await asyncio.sleep(0.2)
    assert lights.last(FLOOR)["data"]["color_temp_kelvin"] == 3000
    assert hass.states.get("light.bad").attributes["deviating"] == []


async def test_one_light_can_be_reset_alone(hass: HomeAssistant, setup_object, lights: FakeLights) -> None:
    entity = await setup_object()
    await hass.services.async_call(
        "light", "turn_on", {"entity_id": "light.bad", "brightness_pct": 60, "transition": 0}, blocking=True
    )
    await asyncio.sleep(0.2)
    entity.engine.set_lights([FLOOR, MIRROR], 30)
    await asyncio.sleep(0.2)
    entity.engine.reset_lights("all", [MIRROR])
    await asyncio.sleep(0.2)
    assert set(entity.engine.deviating) == {FLOOR}
