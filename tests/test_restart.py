"""What an object keeps across a restart, and what a new object must not inherit."""

from __future__ import annotations

from datetime import timedelta

from homeassistant.core import HomeAssistant, State
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import mock_restore_cache, mock_restore_cache_with_extra_data

from .conftest import FakeLights


async def test_a_new_object_does_not_inherit_a_deleted_ones_state(
    hass: HomeAssistant, setup_object, lights: FakeLights
) -> None:
    mock_restore_cache_with_extra_data(
        hass, ((State("light.bad", "on", {"position": 30, "last_on_position": 30}), {"entry_id": "deleted"}),)
    )
    entity = await setup_object(entry_id="new")
    assert hass.states.get("light.bad").state == "off"
    assert entity.engine.position == 0

    entity.options_changed()
    await hass.async_block_till_done()
    assert not lights.calls


async def test_state_of_an_earlier_version_is_not_inherited(
    hass: HomeAssistant, setup_object, lights: FakeLights
) -> None:
    mock_restore_cache(hass, (State("light.bad", "on", {"position": 4.71}),))
    entity = await setup_object()
    entity.options_changed()
    await hass.async_block_till_done()
    assert hass.states.get("light.bad").state == "off"
    assert not lights.calls


async def test_the_position_survives_a_restart_without_commands(
    hass: HomeAssistant, setup_object, lights: FakeLights
) -> None:
    mock_restore_cache_with_extra_data(
        hass, ((State("light.bad", "on", {"position": 40, "last_on_position": 40}), {"entry_id": "same"}),)
    )
    entity = await setup_object(entry_id="same")
    await hass.async_block_till_done()
    assert hass.states.get("light.bad").state == "on"
    assert entity.engine.position == 40
    assert not lights.calls


async def test_a_running_fade_continues_after_a_restart(hass: HomeAssistant, setup_object) -> None:
    now = dt_util.utcnow()
    attributes = {
        "position": 30,
        "fading": True,
        "target_position": 100,
        "fade_from": 0,
        "fade_started": (now - timedelta(seconds=20)).isoformat(),
        "fade_ends": (now + timedelta(seconds=20)).isoformat(),
    }
    mock_restore_cache_with_extra_data(hass, ((State("light.bad", "on", attributes), {"entry_id": "same"}),))
    entity = await setup_object(entry_id="same")
    await hass.async_block_till_done()
    fade = entity.engine.fade
    assert fade is not None
    assert fade.target == 100
    assert 15 < fade.duration <= 20
    assert 45 < entity.engine.current_position() < 60
    await entity.engine.async_stop()


async def test_saved_state_names_its_object(hass: HomeAssistant, setup_object) -> None:
    entity = await setup_object(entry_id="same")
    assert entity.extra_restore_state_data.as_dict() == {"entry_id": "same"}
