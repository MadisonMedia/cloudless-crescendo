"""Tests for the room light inside Home Assistant."""

from __future__ import annotations

import asyncio
from datetime import timedelta

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
from homeassistant.helpers import entity_registry as er, issue_registry as ir
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry, mock_restore_cache

from custom_components.cloudless_crescendo.const import DOMAIN
from custom_components.cloudless_crescendo.model import normalize_options

from .conftest import ROOM, ROOM_OPTIONS, room_entity


async def settle(hass: HomeAssistant) -> None:
    await hass.async_block_till_done(wait_background_tasks=True)


def last_call(light):
    assert light.calls, f"{light.name} received no command"
    return light.calls[-1]


async def test_slider_fades_staggered(hass: HomeAssistant, fake_lights, room) -> None:
    await hass.services.async_call(
        LIGHT_DOMAIN,
        SERVICE_TURN_ON,
        {ATTR_ENTITY_ID: ROOM, ATTR_BRIGHTNESS_PCT: 40, ATTR_TRANSITION: 4},
        blocking=True,
    )
    # A short fade reports its target immediately, so sliders do not bounce back.
    state = hass.states.get(ROOM)
    assert state.attributes[ATTR_BRIGHTNESS] == 102
    assert state.attributes["fading"] is True
    assert state.attributes["target_position"] == 40

    await settle(hass)
    assert sum(room.sleeps) == pytest.approx(4)

    boden = fake_lights["light.bad_boden"]
    # Minimum first, then 0->20 and 20->40.
    assert [c[1][ATTR_BRIGHTNESS] for c in boden.calls] == [1, 128, 255]
    assert boden.calls[0][1][ATTR_COLOR_TEMP_KELVIN] == 2700

    dusche = fake_lights["light.bad_duschnische"]
    assert [c[1][ATTR_BRIGHTNESS] for c in dusche.calls] == [1, 255]
    assert dusche.calls[1][1][ATTR_TRANSITION] == 2

    assert fake_lights["light.bad_spiegel"].calls == []
    assert fake_lights["light.bad_deckenstrip"].calls == []

    state = hass.states.get(ROOM)
    assert state.attributes["position"] == 40
    assert state.attributes["fading"] is False


async def test_colors_reach_the_lights(hass: HomeAssistant, fake_lights, room) -> None:
    await hass.services.async_call(
        DOMAIN, "fade_to", {ATTR_ENTITY_ID: ROOM, "position": 60, "duration": 6}, blocking=True
    )
    await settle(hass)

    service, data = last_call(fake_lights["light.bad_deckenstrip"])
    assert service == "on"
    assert data[ATTR_BRIGHTNESS] == round(0.3 * 255)
    assert data[ATTR_XY_COLOR][0] > 0.6

    service, data = last_call(fake_lights["light.bad_spiegel"])
    assert 2000 <= data[ATTR_COLOR_TEMP_KELVIN] <= 4000


async def test_long_fade(hass: HomeAssistant, fake_lights, room) -> None:
    await hass.services.async_call(
        DOMAIN,
        "fade_to",
        {ATTR_ENTITY_ID: ROOM, "position": 100, "duration": {"hours": 1}},
        blocking=True,
    )
    await settle(hass)
    assert sum(room.sleeps) == pytest.approx(3600)
    assert hass.states.get(ROOM).attributes["position"] == 100


async def test_long_fade_reports_progress(hass: HomeAssistant, fake_lights, room_entry) -> None:
    engine = room_entity(hass).engine
    clock = {"now": 0.0}
    engine.now = lambda: clock["now"]
    gate = asyncio.Event()

    async def blocked_sleep(seconds: float) -> None:
        await gate.wait()

    engine.sleep = blocked_sleep
    await hass.services.async_call(
        DOMAIN, "fade_to", {ATTR_ENTITY_ID: ROOM, "position": 100, "duration": 600}, blocking=True
    )
    # Long fades show progress instead of jumping to the target.
    assert hass.states.get(ROOM).state == "off"
    clock["now"] = 300.0
    room_entity(hass).async_write_ha_state()
    assert hass.states.get(ROOM).attributes[ATTR_BRIGHTNESS] == 128
    await engine.async_shutdown()


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
        # The light was dimmed to its minimum with a transition before switching off.
        assert light.calls[-2][1][ATTR_BRIGHTNESS] == 1
        assert light.calls[-2][1][ATTR_TRANSITION] > 0
    assert hass.states.get(ROOM).state == "off"

    await hass.services.async_call(
        LIGHT_DOMAIN, SERVICE_TURN_ON, {ATTR_ENTITY_ID: ROOM}, blocking=True
    )
    await settle(hass)
    assert hass.states.get(ROOM).attributes["position"] == 60


async def test_stop_holds_current_position(hass: HomeAssistant, fake_lights, room_entry) -> None:
    engine = room_entity(hass).engine
    clock = {"now": 0.0}
    engine.now = lambda: clock["now"]
    gate = asyncio.Event()

    async def blocked_sleep(seconds: float) -> None:
        await gate.wait()

    engine.sleep = blocked_sleep
    await hass.services.async_call(
        DOMAIN, "fade_to", {ATTR_ENTITY_ID: ROOM, "position": 40, "duration": 60}, blocking=True
    )
    await hass.async_block_till_done()
    clock["now"] = 15.0  # a quarter of the way: position 10
    await hass.services.async_call(DOMAIN, "stop", {ATTR_ENTITY_ID: ROOM}, blocking=True)
    await settle(hass)

    state = hass.states.get(ROOM)
    assert state.attributes["position"] == 10
    assert state.attributes["fading"] is False
    assert last_call(fake_lights["light.bad_boden"])[1][ATTR_BRIGHTNESS] == round(0.25 * 255)


async def test_restores_position_without_commands(
    hass: HomeAssistant, setup_lights, fake_lights
) -> None:
    mock_restore_cache(hass, [State(ROOM, "on", {"position": 40.0, "last_on_position": 40.0})])
    entry = MockConfigEntry(domain=DOMAIN, title="Bad", options=normalize_options(ROOM_OPTIONS))
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    state = hass.states.get(ROOM)
    assert state.state == "on"
    assert state.attributes["position"] == 40
    assert all(light.calls == [] for light in fake_lights.values())


async def test_resumes_fade_after_restart(hass: HomeAssistant, setup_lights, fake_lights) -> None:
    now = dt_util.utcnow()
    mock_restore_cache(
        hass,
        [
            State(
                ROOM,
                "on",
                {
                    "position": 25.0,
                    "fade_from": 0.0,
                    "target_position": 100.0,
                    "fade_started": (now - timedelta(minutes=30)).isoformat(),
                    "fade_ends": (now + timedelta(minutes=30)).isoformat(),
                },
            )
        ],
    )
    entry = MockConfigEntry(domain=DOMAIN, title="Bad", options=normalize_options(ROOM_OPTIONS))
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    state = hass.states.get(ROOM)
    assert state.attributes["fading"] is True
    assert state.attributes["target_position"] == 100
    assert state.attributes["fade_from"] == pytest.approx(50, abs=0.5)
    assert state.attributes["fade_remaining"] == pytest.approx(1800, abs=5)
    await room_entity(hass).engine.async_shutdown()


async def test_yaml_is_imported_once(hass: HomeAssistant, fake_lights) -> None:
    config = {
        LIGHT_DOMAIN: [
            {"platform": "test"},
            {
                "platform": DOMAIN,
                "name": "Bad",
                "unique_id": "crescendo_bad",
                "steps": {20: {"name": "Nacht", "light.bad_boden": 50}},
            },
        ]
    }
    # The entity of the former YAML light keeps its entity ID.
    er.async_get(hass).async_get_or_create(
        LIGHT_DOMAIN, DOMAIN, "crescendo_bad", suggested_object_id="bad"
    )
    assert await async_setup_component(hass, LIGHT_DOMAIN, config)
    await hass.async_block_till_done()

    entries = hass.config_entries.async_entries(DOMAIN)
    assert len(entries) == 1
    assert entries[0].unique_id == "crescendo_bad"
    assert entries[0].options["steps"][0]["name"] == "Nacht"
    assert hass.states.get(ROOM).attributes["steps"] == [{"position": 20, "name": "Nacht"}]
    assert ir.async_get(hass).async_get_issue(DOMAIN, "deprecated_yaml_crescendo_bad")

    # Editing in the UI is not overwritten by the YAML on the next start.
    result = await hass.config_entries.flow.async_init(
        DOMAIN,
        context={"source": "import"},
        data={"name": "Bad", "unique_id": "crescendo_bad", "options": {}},
    )
    assert result["reason"] == "already_configured"


async def test_options_update_reloads_room(hass: HomeAssistant, fake_lights, room_entry) -> None:
    options = dict(room_entry.options)
    options["steps"] = [{"position": 50, "lights": {"light.bad_spiegel": {"brightness": 80}}}]
    hass.config_entries.async_update_entry(room_entry, options=normalize_options(options))
    await hass.async_block_till_done()
    assert hass.states.get(ROOM).attributes["entity_id"] == ["light.bad_spiegel"]


async def test_zero_duration_is_instant(hass: HomeAssistant, fake_lights, room) -> None:
    await hass.services.async_call(
        DOMAIN, "fade_to", {ATTR_ENTITY_ID: ROOM, "position": 40, "duration": 0}, blocking=True
    )
    await settle(hass)
    assert sum(room.sleeps) == 0
    assert hass.states.get(ROOM).attributes["position"] == 40
    assert fake_lights["light.bad_duschnische"].is_on
