"""Tests for the Crescendo light and fade engine inside Home Assistant."""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import patch

from homeassistant.components.light import (
    ATTR_BRIGHTNESS,
    ATTR_BRIGHTNESS_PCT,
    ATTR_COLOR_TEMP_KELVIN,
    ATTR_TRANSITION,
    ATTR_XY_COLOR,
    DOMAIN as LIGHT_DOMAIN,
)
from homeassistant.const import ATTR_ENTITY_ID, SERVICE_TURN_OFF, SERVICE_TURN_ON
from homeassistant.core import HomeAssistant, State
from homeassistant.helpers.entity_platform import async_get_platforms
from homeassistant.setup import async_setup_component
import pytest
from pytest_homeassistant_custom_component.common import mock_restore_cache

from custom_components.cloudless_crescendo.const import DOMAIN

ROOM = "light.bad"

CONFIG = {
    LIGHT_DOMAIN: [
        {"platform": "test"},
        {
            "platform": DOMAIN,
            "name": "Bad",
            "unique_id": "crescendo_bad",
            "default_transition": 2,
            "steps": {
                20: {"light.bad_boden": {"brightness": 50, "kelvin": 2700}},
                40: {"light.bad_boden": 100, "light.bad_duschnische": 100},
                60: {
                    "light.bad_spiegel": {"brightness": 50, "rgb": [255, 160, 80]},
                    "light.bad_deckenstrip": {"brightness": 30, "rgb": [255, 0, 0]},
                },
            },
        },
    ]
}


def crescendo_entity(hass: HomeAssistant):
    for platform in async_get_platforms(hass, DOMAIN):
        if ROOM in platform.entities:
            return platform.entities[ROOM]
    raise AssertionError("Crescendo light not found")


class FakeClock:
    """Instant sleeps with a controllable clock."""

    def __init__(self) -> None:
        self.now = 0.0
        self.sleeps: list[float] = []

    async def sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self.now += seconds
        await asyncio.sleep(0)


@pytest.fixture
async def room(hass: HomeAssistant, fake_lights) -> FakeClock:
    assert await async_setup_component(hass, LIGHT_DOMAIN, CONFIG)
    await hass.async_block_till_done()
    clock = FakeClock()
    engine = crescendo_entity(hass).engine
    engine.sleep = clock.sleep
    engine.now = lambda: clock.now
    return clock


async def settle(hass: HomeAssistant) -> None:
    await hass.async_block_till_done(wait_background_tasks=True)


def last_call(light) -> tuple[str, dict[str, Any]]:
    assert light.calls, f"{light.name} received no command"
    return light.calls[-1]


async def test_slider_fades_staggered(hass: HomeAssistant, fake_lights, room) -> None:
    await hass.services.async_call(
        LIGHT_DOMAIN,
        SERVICE_TURN_ON,
        {ATTR_ENTITY_ID: ROOM, ATTR_BRIGHTNESS_PCT: 40, ATTR_TRANSITION: 4},
        blocking=True,
    )
    await settle(hass)

    # Two segments (0->20, 20->40) of two seconds each.
    assert room.sleeps == pytest.approx([2, 2])

    boden = fake_lights["light.bad_boden"]
    assert [c[1][ATTR_BRIGHTNESS] for c in boden.calls] == [128, 255]
    assert [c[1][ATTR_TRANSITION] for c in boden.calls] == [2, 2]
    assert boden.calls[0][1][ATTR_COLOR_TEMP_KELVIN] == 2700

    dusche = fake_lights["light.bad_duschnische"]
    # Off during the first segment (no command), fades in during the second.
    assert len(dusche.calls) == 1
    assert dusche.calls[0][1][ATTR_BRIGHTNESS] == 255

    assert fake_lights["light.bad_spiegel"].calls == []
    assert fake_lights["light.bad_deckenstrip"].calls == []

    state = hass.states.get(ROOM)
    assert state.state == "on"
    assert state.attributes["position"] == 40
    assert state.attributes[ATTR_BRIGHTNESS] == 102
    assert state.attributes["fading"] is False


async def test_colors_reach_the_lights(hass: HomeAssistant, fake_lights, room) -> None:
    await hass.services.async_call(
        DOMAIN, "fade_to", {ATTR_ENTITY_ID: ROOM, "position": 60, "duration": 6}, blocking=True
    )
    await settle(hass)

    strip = fake_lights["light.bad_deckenstrip"]
    service, data = last_call(strip)
    assert service == "on"
    assert data[ATTR_BRIGHTNESS] == round(0.3 * 255)
    assert data[ATTR_XY_COLOR][0] > 0.6  # red

    # The warm/cold-only mirror light gets the RGB intent as color temperature.
    service, data = last_call(fake_lights["light.bad_spiegel"])
    assert service == "on"
    assert 2000 <= data[ATTR_COLOR_TEMP_KELVIN] <= 4000


async def test_long_fade_is_split(hass: HomeAssistant, fake_lights, room) -> None:
    await hass.services.async_call(
        DOMAIN,
        "fade_to",
        {ATTR_ENTITY_ID: ROOM, "position": 100, "duration": {"hours": 1}},
        blocking=True,
    )
    await settle(hass)
    assert sum(room.sleeps) == pytest.approx(3600)
    assert max(room.sleeps) <= 30 + 1e-6
    assert hass.states.get(ROOM).attributes["position"] == 100


async def test_turn_off_fades_everything_out(hass: HomeAssistant, fake_lights, room) -> None:
    await hass.services.async_call(
        DOMAIN, "fade_to", {ATTR_ENTITY_ID: ROOM, "position": 60, "duration": 3}, blocking=True
    )
    await settle(hass)
    await hass.services.async_call(
        LIGHT_DOMAIN, SERVICE_TURN_OFF, {ATTR_ENTITY_ID: ROOM}, blocking=True
    )
    await settle(hass)

    for light in fake_lights.values():
        assert last_call(light)[0] == "off"
        assert not light.is_on
    assert hass.states.get(ROOM).state == "off"

    # Turning on again returns to the last position.
    await hass.services.async_call(
        LIGHT_DOMAIN, SERVICE_TURN_ON, {ATTR_ENTITY_ID: ROOM}, blocking=True
    )
    await settle(hass)
    assert hass.states.get(ROOM).attributes["position"] == 60


async def test_stop_holds_current_position(hass: HomeAssistant, fake_lights) -> None:
    assert await async_setup_component(hass, LIGHT_DOMAIN, CONFIG)
    await hass.async_block_till_done()
    engine = crescendo_entity(hass).engine
    clock = {"now": 0.0}
    engine.now = lambda: clock["now"]
    gate = asyncio.Event()

    async def blocked_sleep(seconds: float) -> None:
        await gate.wait()

    engine.sleep = blocked_sleep

    await hass.services.async_call(
        DOMAIN, "fade_to", {ATTR_ENTITY_ID: ROOM, "position": 40, "duration": 20}, blocking=True
    )
    await hass.async_block_till_done()
    assert hass.states.get(ROOM).attributes["fading"] is True
    assert hass.states.get(ROOM).attributes["target_position"] == 40

    # Halfway through the first segment (0 -> 20 in 10 s).
    clock["now"] = 5.0
    await hass.services.async_call(DOMAIN, "stop", {ATTR_ENTITY_ID: ROOM}, blocking=True)
    await settle(hass)

    state = hass.states.get(ROOM)
    assert state.attributes["position"] == 10
    assert state.attributes["fading"] is False
    # Boden is told to hold 25 %.
    assert last_call(fake_lights["light.bad_boden"])[1][ATTR_BRIGHTNESS] == round(0.25 * 255)


async def test_new_command_replaces_running_fade(hass: HomeAssistant, fake_lights) -> None:
    assert await async_setup_component(hass, LIGHT_DOMAIN, CONFIG)
    await hass.async_block_till_done()
    engine = crescendo_entity(hass).engine
    clock = {"now": 0.0}
    engine.now = lambda: clock["now"]
    gate = asyncio.Event()

    async def blocked_sleep(seconds: float) -> None:
        await gate.wait()

    engine.sleep = blocked_sleep
    await hass.services.async_call(
        DOMAIN, "fade_to", {ATTR_ENTITY_ID: ROOM, "position": 100, "duration": 100}, blocking=True
    )
    clock["now"] = 10.0  # position 10

    async def instant(seconds: float) -> None:
        await asyncio.sleep(0)

    engine.sleep = instant
    await hass.services.async_call(
        DOMAIN, "fade_to", {ATTR_ENTITY_ID: ROOM, "position": 0, "duration": 1}, blocking=True
    )
    await settle(hass)
    assert hass.states.get(ROOM).state == "off"
    assert last_call(fake_lights["light.bad_boden"])[0] == "off"


async def test_restores_position_without_commands(hass: HomeAssistant, fake_lights) -> None:
    mock_restore_cache(hass, [State(ROOM, "on", {"position": 40.0, "last_on_position": 40.0})])
    assert await async_setup_component(hass, LIGHT_DOMAIN, CONFIG)
    await hass.async_block_till_done()

    state = hass.states.get(ROOM)
    assert state.state == "on"
    assert state.attributes["position"] == 40
    assert all(light.calls == [] for light in fake_lights.values())


async def test_invalid_config_is_rejected(hass: HomeAssistant, fake_lights) -> None:
    config = {
        LIGHT_DOMAIN: [
            {
                "platform": DOMAIN,
                "name": "Kaputt",
                "steps": {20: {"light.bad_boden": {"kelvin": 2700}}},
            }
        ]
    }
    assert await async_setup_component(hass, LIGHT_DOMAIN, config)
    await hass.async_block_till_done()
    assert hass.states.get("light.kaputt") is None


async def test_reload_service_exists(hass: HomeAssistant, fake_lights, room) -> None:
    assert hass.services.has_service(DOMAIN, "reload")


async def test_reload_applies_new_steps(hass: HomeAssistant, fake_lights, room) -> None:
    new_config = {
        LIGHT_DOMAIN: [
            {
                "platform": DOMAIN,
                "name": "Bad",
                "unique_id": "crescendo_bad",
                "steps": {50: {"light.bad_spiegel": 80}},
            }
        ]
    }
    with patch("homeassistant.config.load_yaml_config_file", return_value=new_config):
        await hass.services.async_call(DOMAIN, "reload", blocking=True)
    await hass.async_block_till_done()
    assert hass.states.get(ROOM).attributes["entity_id"] == ["light.bad_spiegel"]
