"""What other integrations can rely on: where a command came from, a switch-on position, commands without devices."""

from __future__ import annotations

import asyncio
from datetime import timedelta

from homeassistant.const import EVENT_STATE_CHANGED
from homeassistant.core import Context, Event, HomeAssistant, State, callback
from homeassistant.helpers import entity as entity_helper
from homeassistant.util import dt as dt_util
import pytest
from pytest_homeassistant_custom_component.common import async_mock_service, mock_restore_cache_with_extra_data
import voluptuous as vol

from custom_components.cloudless_crescendo import engine as engine_module
from custom_components.cloudless_crescendo.engine import Origin, ramp_value, threshold_steps

from .conftest import FLOOR, MIRROR, FakeLights, sample_options

OBJECT = "light.bad"
COMMAND_KEYS = ("command", "command_source", "command_user_id", "command_at")


async def _wait(hass: HomeAssistant, seconds: float = 0.25) -> None:
    await asyncio.sleep(seconds)
    await hass.async_block_till_done()


def _record(hass: HomeAssistant) -> list[State]:
    """Collect every state the object writes from now on."""
    seen: list[State] = []

    @callback
    def _listener(event: Event) -> None:
        if event.data["entity_id"] == OBJECT and event.data["new_state"] is not None:
            seen.append(event.data["new_state"])

    hass.bus.async_listen(EVENT_STATE_CHANGED, _listener)
    return seen


def _command(hass: HomeAssistant) -> dict:
    attributes = hass.states.get(OBJECT).attributes
    return {key: attributes.get(key) for key in COMMAND_KEYS}


async def _call(hass: HomeAssistant, domain: str, service: str, data: dict, context: Context | None = None) -> None:
    await hass.services.async_call(domain, service, {"entity_id": OBJECT, **data}, blocking=True, context=context)


# -- 1. where each command came from ------------------------------------------------------------


async def test_every_state_of_a_fade_names_its_command_and_keeps_its_context(
    hass: HomeAssistant, setup_object, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(engine_module, "PROGRESS_INTERVAL", 0.1)
    monkeypatch.setattr(entity_helper, "CONTEXT_RECENT_TIME_SECONDS", 0.2)
    await setup_object()
    seen = _record(hass)
    context = Context()
    await _call(
        hass,
        "cloudless_crescendo",
        "fade_to",
        {"position": 60, "duration": 1, "source": "cloudless_maestro"},
        context,
    )
    await _wait(hass, 1.4)
    assert len(seen) >= 5
    assert all(s.attributes["command"] == "set" for s in seen)
    assert all(s.attributes["command_source"] == "cloudless_maestro" for s in seen)
    assert len({s.attributes["command_at"] for s in seen}) == 1
    assert all(s.context.id == context.id for s in seen)
    assert seen[-1].attributes["fading"] is False


async def test_a_value_chosen_by_a_person_replaces_the_command(
    hass: HomeAssistant, setup_object, hass_admin_user
) -> None:
    await setup_object()
    await _call(
        hass, "cloudless_crescendo", "fade_to", {"position": 60, "duration": 0.1, "source": "cloudless_maestro"}
    )
    await _wait(hass)
    seen = _record(hass)
    await _call(
        hass, "light", "turn_on", {"brightness_pct": 80, "transition": 0.1}, Context(user_id=hass_admin_user.id)
    )
    assert seen[0].attributes["command"] == "set"
    assert seen[0].attributes["command_source"] is None
    assert seen[0].attributes["command_user_id"] == hass_admin_user.id


async def test_switching_on_without_a_value_and_off(hass: HomeAssistant, setup_object) -> None:
    await setup_object()
    await _call(hass, "light", "turn_on", {"transition": 0.1})
    assert _command(hass)["command"] == "switch_on"
    await _wait(hass)
    await _call(hass, "light", "turn_off", {"transition": 0.1})
    assert _command(hass)["command"] == "switch_off"
    await _wait(hass)


async def test_commands_that_change_nothing_leave_the_command(hass: HomeAssistant, setup_object) -> None:
    await setup_object()
    await _call(
        hass, "cloudless_crescendo", "fade_to", {"position": 60, "duration": 0.1, "source": "cloudless_maestro"}
    )
    await _wait(hass)
    before = _command(hass)
    await _call(hass, "light", "turn_on", {})
    await _call(hass, "cloudless_crescendo", "stop", {})
    await _call(hass, "cloudless_crescendo", "reset_color", {})
    await _wait(hass, 0.05)
    assert _command(hass) == before


async def test_switching_on_while_dimming_down_is_a_switch_on(hass: HomeAssistant, setup_object) -> None:
    entity = await setup_object()
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 60, "duration": 0.1})
    await _wait(hass)
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 0, "duration": 5, "source": "cloudless_maestro"})
    await _call(hass, "light", "turn_on", {"transition": 0.1})
    assert _command(hass)["command"] == "switch_on"
    assert _command(hass)["command_source"] is None
    await entity.engine.async_stop()


async def test_a_stop_names_its_source(hass: HomeAssistant, setup_object) -> None:
    await setup_object()
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 60, "duration": 10})
    await _call(hass, "cloudless_crescendo", "stop", {"source": "cloudless_maestro"})
    assert _command(hass)["command"] == "stop"
    assert _command(hass)["command_source"] == "cloudless_maestro"


async def test_buttons_count_as_a_value(hass: HomeAssistant, setup_object) -> None:
    await setup_object()
    await _call(hass, "cloudless_crescendo", "press_button", {"button": "Morgen"})
    assert _command(hass)["command"] == "set"
    await _wait(hass, 0.4)


async def test_the_slider_is_one_command_per_drag(
    hass: HomeAssistant, setup_object, hass_ws_client, hass_admin_user
) -> None:
    entity = await setup_object()
    entity.engine.command = None
    client = await hass_ws_client(hass)

    async def drag(position: float, final: bool = False) -> None:
        await client.send_json_auto_id(
            {"type": "cloudless_crescendo/position", "entity_id": OBJECT, "position": position, "final": final}
        )
        assert (await client.receive_json())["success"]

    await drag(30)
    first = _command(hass)
    assert first["command"] == "set"
    assert first["command_source"] is None
    assert first["command_user_id"] == hass_admin_user.id
    assert hass.states.get(OBJECT).context.user_id == hass_admin_user.id
    await drag(50)
    await drag(50, final=True)
    assert _command(hass) == first
    assert entity.engine.context.user_id is None
    await drag(20)
    await drag(0, final=True)
    assert _command(hass)["command"] == "switch_off"
    assert _command(hass)["command_at"] != first["command_at"]
    await _wait(hass)


async def test_a_color_alone_leaves_the_command_and_the_fade(hass: HomeAssistant, setup_object) -> None:
    entity = await setup_object()
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 80, "duration": 10, "source": "cloudless_maestro"})
    before = _command(hass)
    await _call(hass, "light", "turn_on", {"xy_color": [0.6, 0.35]})
    assert _command(hass) == before
    assert entity.engine.fade is not None
    assert entity.engine.fade.target == 80
    await _call(hass, "cloudless_crescendo", "reset_color", {})
    assert _command(hass) == before
    await entity.engine.async_stop()


async def test_switching_on_with_a_color_is_a_switch_on(hass: HomeAssistant, setup_object) -> None:
    entity = await setup_object()
    entity.engine.external_on_position = 40
    await _call(hass, "light", "turn_on", {"xy_color": [0.6, 0.35], "transition": 0.1})
    assert _command(hass)["command"] == "switch_on"
    await _wait(hass)
    assert entity.engine.position == 40


async def test_an_object_taking_the_lights_stops_the_other_in_its_name(
    hass: HomeAssistant, setup_object, hass_admin_user
) -> None:
    first = await setup_object("Bad")
    second = await setup_object("Abend", sample_options())
    await first.engine.async_fade_to(100, 10, origin=Origin("cloudless_maestro"))
    await second.engine.async_fade_to(50, 0.1, origin=Origin(None, hass_admin_user.id))
    assert first.engine.fade is None
    assert hass.states.get(OBJECT).attributes["command"] == "stop"
    assert hass.states.get(OBJECT).attributes["command_source"] is None
    assert hass.states.get(OBJECT).attributes["command_user_id"] == hass_admin_user.id
    await _wait(hass)


async def test_single_lights_and_the_switch_on_position_leave_the_command(hass: HomeAssistant, setup_object) -> None:
    entity = await setup_object()
    await _call(
        hass, "cloudless_crescendo", "fade_to", {"position": 60, "duration": 0.1, "source": "cloudless_maestro"}
    )
    await _wait(hass)
    before = _command(hass)
    entity.engine.set_lights([MIRROR], 30)
    entity.engine.reset_lights()
    await _call(hass, "cloudless_crescendo", "set_on_position", {"position": 20})
    await _wait(hass, 0.05)
    assert _command(hass) == before


async def test_the_command_survives_a_restart_with_the_fade(hass: HomeAssistant, setup_object) -> None:
    now = dt_util.utcnow()
    command = {"kind": "set", "source": "cloudless_maestro", "user_id": None, "at": now.isoformat()}
    attributes = {
        "position": 30,
        "fading": True,
        "target_position": 60,
        "fade_from": 0,
        "fade_started": (now - timedelta(seconds=20)).isoformat(),
        "fade_ends": (now + timedelta(seconds=20)).isoformat(),
    }
    mock_restore_cache_with_extra_data(
        hass, ((State(OBJECT, "on", attributes), {"entry_id": "same", "command": command}),)
    )
    entity = await setup_object(entry_id="same")
    await hass.async_block_till_done()
    assert entity.engine.fade is not None
    assert _command(hass) == {
        "command": "set",
        "command_source": "cloudless_maestro",
        "command_user_id": None,
        "command_at": now.isoformat(),
    }
    await entity.engine.async_stop()


async def test_a_running_command_is_saved_for_a_restart(hass: HomeAssistant, setup_object) -> None:
    entity = await setup_object(entry_id="same")
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 60, "duration": 10, "source": "cloudless_maestro"})
    saved = entity.extra_restore_state_data.as_dict()
    assert saved["entry_id"] == "same"
    assert saved["command"]["kind"] == "set"
    assert saved["command"]["source"] == "cloudless_maestro"
    await entity.engine.async_stop()


# -- 2. a switch-on position set from outside ---------------------------------------------------


async def test_the_switch_on_position_survives_a_restart(hass: HomeAssistant, setup_object) -> None:
    mock_restore_cache_with_extra_data(
        hass, ((State(OBJECT, "off", {"position": 0}), {"entry_id": "same", "external_on_position": 5}),)
    )
    entity = await setup_object(entry_id="same")
    assert hass.states.get(OBJECT).attributes["external_on_position"] == 5
    await _call(hass, "light", "turn_on", {"transition": 0.1})
    await _wait(hass)
    assert entity.engine.position == 5


async def test_clearing_the_switch_on_position_returns_to_the_objects_own(hass: HomeAssistant, setup_object) -> None:
    entity = await setup_object(options=sample_options(on_mode="fixed", on_position=70))
    await _call(hass, "cloudless_crescendo", "set_on_position", {"position": 5})
    assert hass.states.get(OBJECT).attributes["external_on_position"] == 5
    assert hass.states.get(OBJECT).attributes["on_position"] == 5
    assert entity.extra_restore_state_data.as_dict()["external_on_position"] == 5
    await _call(hass, "cloudless_crescendo", "set_on_position", {})
    assert hass.states.get(OBJECT).attributes["external_on_position"] is None
    assert hass.states.get(OBJECT).attributes["on_position"] == 70


async def test_a_switch_on_position_of_zero_is_refused(hass: HomeAssistant, setup_object) -> None:
    await setup_object()
    with pytest.raises(vol.Invalid):
        await _call(hass, "cloudless_crescendo", "set_on_position", {"position": 0})


# -- 3. commands without devices ----------------------------------------------------------------


def _cover_options() -> dict:
    return sample_options(
        devices=[
            {"entity_id": "cover.bad", "kind": "threshold", "at": 60, "action": "open_cover", "back": "close_cover"}
        ]
    )


async def _at_80(hass: HomeAssistant, setup_object):
    entity = await setup_object(options=_cover_options())
    opened = async_mock_service(hass, "cover", "open_cover")
    closed = async_mock_service(hass, "cover", "close_cover")
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 80, "duration": 0.1})
    await _wait(hass)
    opened.clear()
    return entity, opened, closed


async def test_a_dip_without_devices_moves_no_device(hass: HomeAssistant, setup_object) -> None:
    _entity, opened, closed = await _at_80(hass, setup_object)
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 40, "duration": 0.1, "devices": False})
    await _wait(hass)
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 80, "duration": 0.1, "devices": False})
    await _wait(hass)
    assert not opened
    assert not closed


async def test_devices_catch_up_at_the_start_of_the_next_command_with_them(hass: HomeAssistant, setup_object) -> None:
    entity, _opened, closed = await _at_80(hass, setup_object)
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 40, "duration": 0.1, "devices": False})
    await _wait(hass)
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 0, "duration": 5})
    await _wait(hass, 0.1)
    assert len(closed) == 1
    await entity.engine.async_stop()


async def test_devices_left_behind_act_only_if_the_target_is_on_the_other_side(
    hass: HomeAssistant, setup_object
) -> None:
    _entity, opened, closed = await _at_80(hass, setup_object)
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 40, "duration": 0.1, "devices": False})
    await _wait(hass)
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 90, "duration": 0.3})
    await _wait(hass, 0.5)
    assert not opened
    assert not closed


async def test_the_slider_catches_up_with_devices_left_behind(hass: HomeAssistant, setup_object) -> None:
    entity, _opened, closed = await _at_80(hass, setup_object)
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 40, "duration": 0.1, "devices": False})
    await _wait(hass)
    entity.engine.set_position(45, final=True)
    await _wait(hass, 0.1)
    assert len(closed) == 1


async def test_without_devices_a_new_color_keeps_devices_out(hass: HomeAssistant, setup_object) -> None:
    entity, opened, closed = await _at_80(hass, setup_object)
    await _call(hass, "cloudless_crescendo", "fade_to", {"position": 40, "duration": 1, "devices": False})
    await _call(hass, "light", "turn_on", {"xy_color": [0.6, 0.35]})
    assert entity.engine.fade is not None
    assert entity.engine.fade.devices is False
    await _wait(hass, 1.2)
    assert not opened
    assert not closed


def test_a_ramp_moves_on_from_the_value_it_last_got() -> None:
    ramp = {"entity_id": "media_player.bad", "kind": "ramp", "from": 0, "to": 100, "min": 0, "max": 40}
    left = threshold_steps([ramp], 40, 0, 10, devices_from=80, sent={"media_player.bad": 32})
    values = [s.value for s in left]
    assert values == sorted(values, reverse=True)
    assert values[0] > ramp_value(ramp, 40 - 40 / len(values))
    assert values[0] < 32
    assert values[-1] == 0
    in_step = threshold_steps([ramp], 40, 0, 10, sent={"media_player.bad": 16})
    assert [s.value for s in in_step] == [s.value for s in threshold_steps([ramp], 40, 0, 10)]


async def test_a_fade_without_devices_stays_without_them_after_a_restart(hass: HomeAssistant, setup_object) -> None:
    now = dt_util.utcnow()
    attributes = {
        "position": 60,
        "fading": True,
        "target_position": 40,
        "fade_from": 80,
        "fade_started": (now - timedelta(seconds=10)).isoformat(),
        "fade_ends": (now + timedelta(seconds=10)).isoformat(),
    }
    mock_restore_cache_with_extra_data(
        hass,
        ((State(OBJECT, "on", attributes), {"entry_id": "same", "fade_devices": False, "devices_at": 80}),),
    )
    entity = await setup_object(entry_id="same", options=_cover_options())
    await hass.async_block_till_done()
    assert entity.engine.fade is not None
    assert entity.engine.fade.devices is False
    saved = entity.extra_restore_state_data.as_dict()
    assert saved["fade_devices"] is False
    assert saved["devices_at"] == 80
    await entity.engine.async_stop()


async def test_a_chosen_color_survives_a_restart(hass: HomeAssistant, setup_object) -> None:
    mock_restore_cache_with_extra_data(
        hass,
        ((State(OBJECT, "on", {"position": 100}), {"entry_id": "same", "override": {"xy": [0.6, 0.35]}}),),
    )
    await setup_object(entry_id="same")
    attributes = hass.states.get(OBJECT).attributes
    assert attributes["color_override"] is True
    assert tuple(attributes["xy_color"]) == (0.6, 0.35)


# -- 4. version ---------------------------------------------------------------------------------


async def test_the_interface_has_a_version(hass: HomeAssistant, setup_object) -> None:
    await setup_object()
    attributes = hass.states.get(OBJECT).attributes
    assert attributes["crescendo"] is True
    assert attributes["crescendo_api"] == 1
    assert attributes["external_on_position"] is None
    assert all(attributes[key] is None for key in COMMAND_KEYS)


# -- 5. a single light changed by hand is no change of the object -------------------------------


def _object_without_deviating(hass: HomeAssistant) -> tuple:
    state = hass.states.get(OBJECT)
    return state.state, {k: v for k, v in state.attributes.items() if k != "deviating"}


async def test_a_light_changed_by_hand_changes_only_deviating(
    hass: HomeAssistant, setup_object, lights: FakeLights, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(engine_module, "VERIFY_DELAY", 0.01)
    entity = await setup_object()
    await _call(
        hass, "cloudless_crescendo", "fade_to", {"position": 60, "duration": 0.1, "source": "cloudless_maestro"}
    )
    await _wait(hass)
    before = _object_without_deviating(hass)
    hass.bus.async_fire(
        "call_service",
        {"domain": "light", "service": "turn_on", "service_data": {"entity_id": MIRROR, "brightness": 20}},
        context=Context(),
    )
    await _wait(hass, 0.05)
    assert MIRROR in hass.states.get(OBJECT).attributes["deviating"]
    assert _object_without_deviating(hass) == before
    hass.states.async_set(FLOOR, "off", hass.states.get(FLOOR).attributes)
    await _wait(hass, 0.05)
    assert FLOOR in entity.engine.deviating
    assert FLOOR in hass.states.get(OBJECT).attributes["deviating"]
    assert _object_without_deviating(hass) == before
