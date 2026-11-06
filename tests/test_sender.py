"""The sender: one command per light on its way, newest value wins."""

from __future__ import annotations

import asyncio
from unittest.mock import patch

from homeassistant.core import Context, HomeAssistant

from custom_components.cloudless_crescendo.const import VERIFY_DELAY
from custom_components.cloudless_crescendo.planner import OFF, Command
from custom_components.cloudless_crescendo.sender import Sender

from .conftest import FLOOR, MIRROR, SINK_A, SINK_B, FakeLights


def _on(brightness: int, transition: float = 0) -> tuple[Command, ...]:
    data = [("brightness", brightness)]
    if transition:
        data.append(("transition", transition))
    return (Command("turn_on", tuple(data)),)


def _sender(hass: HomeAssistant) -> Sender:
    return Sender(hass, lambda _eid: "test", Context())


async def _settled(hass: HomeAssistant) -> None:
    await asyncio.sleep(0.2)
    await hass.async_block_till_done()


async def test_the_newest_value_replaces_what_has_not_left(hass: HomeAssistant, lights: FakeLights) -> None:
    lights.delay = 0.05
    sender = _sender(hass)
    for value in (10, 20, 30, 40):
        sender.send(FLOOR, _on(value))
        await asyncio.sleep(0)
    await _settled(hass)
    assert [c["data"]["brightness"] for c in lights.for_light(FLOOR)] == [10, 40]
    await sender.async_close()


async def test_only_one_command_per_light_is_on_its_way(hass: HomeAssistant, lights: FakeLights) -> None:
    lights.delay = 0.03
    sender = _sender(hass)
    active = 0
    highest = 0
    original = lights.handle

    async def tracked(service, data):
        nonlocal active, highest
        active += 1
        highest = max(highest, active)
        await original(service, data)
        active -= 1

    lights.handle = tracked
    for value in range(1, 8):
        sender.send(FLOOR, _on(value))
        await asyncio.sleep(0.01)
    await _settled(hass)
    assert highest == 1
    await sender.async_close()


async def test_lights_with_the_same_command_share_one_call(hass: HomeAssistant, lights: FakeLights) -> None:
    sender = _sender(hass)
    sender.send(SINK_A, _on(50))
    sender.send(SINK_B, _on(50))
    sender.send(MIRROR, _on(60))
    await _settled(hass)
    assert sorted(lights.last(SINK_A)["entities"]) == [SINK_A, SINK_B]
    assert lights.last(MIRROR)["entities"] == [MIRROR]
    assert len(lights.calls) == 2
    await sender.async_close()


async def test_an_off_during_a_transition_cancels_the_transition_first(hass: HomeAssistant, lights: FakeLights) -> None:
    sender = _sender(hass)
    sender.send(FLOOR, _on(200, 5), transition=5)
    await _settled(hass)
    sender.send(FLOOR, (OFF,))
    await _settled(hass)
    calls = lights.for_light(FLOOR)
    assert calls[1]["service"] == "turn_on"
    assert calls[1]["data"] == {"brightness": 1}
    assert calls[2]["service"] == "turn_off"
    await sender.async_close()


async def test_a_failed_command_is_repeated_and_counted(hass: HomeAssistant, lights: FakeLights) -> None:
    lights.fail_times = 1
    sender = _sender(hass)
    sender.send(FLOOR, _on(100))
    await _settled(hass)
    assert len(lights.for_light(FLOOR)) == 2
    assert sender.stats_for(FLOOR).failures == 1
    assert hass.states.get(FLOOR).state == "on"
    await sender.async_close()


async def test_a_light_that_stays_on_gets_the_off_again(hass: HomeAssistant, lights: FakeLights) -> None:
    sender = _sender(hass)
    sender.send(FLOOR, _on(100))
    await _settled(hass)
    lights.ignore_off.add(FLOOR)
    sender.send(FLOOR, (OFF,))
    await _settled(hass)
    assert hass.states.get(FLOOR).state == "on"
    sender._verify(FLOOR)
    await _settled(hass)
    assert hass.states.get(FLOOR).state == "off"
    assert sender.stats_for(FLOOR).repeats == 1
    assert VERIFY_DELAY > 0
    await sender.async_close()


async def test_a_light_that_ignored_a_level_gets_it_again(hass: HomeAssistant, lights: FakeLights) -> None:
    sender = _sender(hass)
    sender.send(FLOOR, _on(200))
    await _settled(hass)
    lights.ignore_on.add(FLOOR)
    sender.send(FLOOR, _on(30))
    await _settled(hass)
    assert hass.states.get(FLOOR).attributes["brightness"] == 200
    with patch("custom_components.cloudless_crescendo.sender.LEVEL_STABLE", 0.0):
        sender._verify(FLOOR)
        await _settled(hass)
    assert hass.states.get(FLOOR).attributes["brightness"] == 30
    assert sender.stats_for(FLOOR).repeats == 1
    await sender.async_close()


async def test_a_light_still_moving_is_left_alone(hass: HomeAssistant, lights: FakeLights) -> None:
    sender = _sender(hass)
    sender.send(FLOOR, _on(200))
    await _settled(hass)
    lights.ignore_on.add(FLOOR)
    sender.send(FLOOR, _on(30))
    await _settled(hass)
    hass.states.async_set(FLOOR, "on", {"brightness": 120})
    calls = len(lights.for_light(FLOOR))
    sender._verify(FLOOR)
    await _settled(hass)
    assert len(lights.for_light(FLOOR)) == calls
    assert sender.stats_for(FLOOR).repeats == 0
    assert FLOOR in sender._cancel_verify
    await sender.async_close()


async def test_a_light_in_a_transition_is_left_alone(hass: HomeAssistant, lights: FakeLights) -> None:
    sender = _sender(hass)
    sender.send(FLOOR, _on(200))
    await _settled(hass)
    lights.ignore_on.add(FLOOR)
    sender.send(FLOOR, _on(30, 60), 60)
    await _settled(hass)
    calls = len(lights.for_light(FLOOR))
    with patch("custom_components.cloudless_crescendo.sender.LEVEL_STABLE", 0.0):
        sender._verify(FLOOR)
        await _settled(hass)
    assert len(lights.for_light(FLOOR)) == calls
    assert FLOOR in sender._cancel_verify
    await sender.async_close()


async def test_the_right_level_needs_no_repeat(hass: HomeAssistant, lights: FakeLights) -> None:
    sender = _sender(hass)
    sender.send(FLOOR, _on(30))
    await _settled(hass)
    calls = len(lights.for_light(FLOOR))
    with patch("custom_components.cloudless_crescendo.sender.LEVEL_STABLE", 0.0):
        sender._verify(FLOOR)
        await _settled(hass)
    assert len(lights.for_light(FLOOR)) == calls
    await sender.async_close()


async def test_a_later_change_by_someone_else_is_not_undone(hass: HomeAssistant, lights: FakeLights) -> None:
    sender = _sender(hass)
    sender.send(FLOOR, _on(30))
    await _settled(hass)
    hass.states.async_set(FLOOR, "on", {"brightness": 200})
    calls = len(lights.for_light(FLOOR))
    with (
        patch("custom_components.cloudless_crescendo.sender.LEVEL_STABLE", 0.0),
        patch("custom_components.cloudless_crescendo.sender.LEVEL_WINDOW", 0.0),
    ):
        sender._verify(FLOOR)
        await _settled(hass)
    assert len(lights.for_light(FLOOR)) == calls
    await sender.async_close()


async def test_commands_per_network_are_spaced(hass: HomeAssistant, lights: FakeLights) -> None:
    sender = Sender(hass, lambda _eid: "matter", Context())
    sender.send(FLOOR, _on(10))
    sender.send(MIRROR, _on(20))
    sender.send(SINK_A, _on(30))
    await asyncio.sleep(0.02)
    assert len(lights.calls) == 1
    await asyncio.sleep(0.2)
    assert len(lights.calls) == 3
    await sender.async_close()
