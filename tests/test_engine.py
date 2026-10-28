"""Tests for fade planning (no Home Assistant instance needed)."""

from __future__ import annotations

from homeassistant.components.light import (
    ATTR_BRIGHTNESS,
    ATTR_COLOR_TEMP_KELVIN,
    ATTR_SUPPORTED_COLOR_MODES,
    ATTR_TRANSITION,
    ATTR_XY_COLOR,
    ColorMode,
)
import pytest

from custom_components.cloudless_crescendo.curve import build_room_curve
from custom_components.cloudless_crescendo.engine import LightInfo, plan_fade, settle_commands

STEPS = [
    {"position": 20, "lights": {"light.a": {"brightness": 50}}},
    {"position": 40, "lights": {"light.a": {"brightness": 100}, "light.b": {"brightness": 100}}},
    {"position": 60, "lights": {"light.c": {"brightness": 40, "kelvin": 3000}}},
]
OFF = LightInfo(is_on=False, supports_transition=True, attributes=None)
ON = LightInfo(is_on=True, supports_transition=True, attributes=None)


def commands_for(events, entity_id):
    return [
        (round(e.time, 3), c.service, c.data)
        for e in events
        if e.entity_id == entity_id
        for c in e.commands
    ]


def test_fade_in_starts_at_minimum_and_only_at_own_keyframes() -> None:
    curve = build_room_curve(STEPS)
    events = plan_fade(
        curve, 0, 60, 6, lights={"light.a": OFF, "light.b": OFF, "light.c": OFF}, max_segment=30
    )

    a = commands_for(events, "light.a")
    # Pre-set to minimum, then 0->20 (2 s), then 20->40 sent slightly early.
    assert a[0][1:] == ("turn_on", {"entity_id": "light.a", ATTR_BRIGHTNESS: 1})
    assert a[1][0] == 0 and a[1][2][ATTR_BRIGHTNESS] == 128 and a[1][2][ATTR_TRANSITION] == 2
    assert a[2][0] == pytest.approx(2 - 0.2)
    assert a[2][2][ATTR_BRIGHTNESS] == 255
    assert a[2][2][ATTR_TRANSITION] == pytest.approx(2.2, abs=0.05)
    # 40->60 is a hold for light.a: no command.
    assert len(a) == 3

    b = commands_for(events, "light.b")
    # light.b does nothing until 20 and gets a single fade 20->40.
    assert [round(t, 2) for t, _, _ in b] == [2, 2]
    assert b[1][2][ATTR_TRANSITION] == 2

    c = commands_for(events, "light.c")
    assert c[0][0] == pytest.approx(4)
    assert c[1][2][ATTR_COLOR_TEMP_KELVIN] == 3000


def test_fade_out_goes_to_minimum_then_off() -> None:
    curve = build_room_curve(STEPS)
    events = plan_fade(
        curve, 40, 0, 4, lights={"light.a": ON, "light.b": ON, "light.c": OFF}, max_segment=30
    )

    b = commands_for(events, "light.b")
    # Never turn_off with a transition: fade to minimum, switch off on arrival.
    assert b[0][1] == "turn_on"
    assert b[0][2][ATTR_BRIGHTNESS] == 1
    assert b[0][2][ATTR_TRANSITION] == 2
    assert b[1] == (2.0, "turn_off", {"entity_id": "light.b"})

    a = commands_for(events, "light.a")
    assert a[-1] == (4.0, "turn_off", {"entity_id": "light.a"})
    assert all(ATTR_TRANSITION not in data for _, service, data in a if service == "turn_off")
    assert commands_for(events, "light.c") == []


def test_dimming_through_zero_does_not_switch_off_in_between() -> None:
    curve = build_room_curve(
        [
            {"position": 20, "lights": {"light.n": {"brightness": 30}}},
            {"position": 50, "lights": {"light.n": {"brightness": 0}}},
            {"position": 51, "lights": {"light.n": {"brightness": 0}}},
            {"position": 80, "lights": {"light.n": {"brightness": 60}}},
        ]
    )
    events = plan_fade(curve, 30, 80, 5, lights={"light.n": ON}, max_segment=30)
    services = [s for _, s, _ in commands_for(events, "light.n")]
    assert services.count("turn_off") == 1  # reaches 0 at 50, rests off until 51


def test_long_fades_are_split() -> None:
    curve = build_room_curve(STEPS)
    events = plan_fade(
        curve, 0, 100, 3600, lights={"light.a": OFF, "light.b": OFF, "light.c": OFF}, max_segment=30
    )
    transitions = [c.data.get(ATTR_TRANSITION, 0) for e in events for c in e.commands]
    assert max(transitions) <= 30 + 0.2
    # light.a only changes between 0 and 40 (1440 s) -> 48 legs + preset.
    assert len(commands_for(events, "light.a")) == 49


def test_lights_without_transitions_get_software_steps() -> None:
    curve = build_room_curve(STEPS)
    no_transition = LightInfo(is_on=False, supports_transition=False, attributes=None)
    events = plan_fade(curve, 0, 20, 2, lights={"light.a": no_transition}, max_segment=30)
    a = commands_for(events, "light.a")
    assert len(a) == 4  # 0.5 s steps
    assert all(ATTR_TRANSITION not in data for _, _, data in a)
    assert a[-1][2][ATTR_BRIGHTNESS] == 128


def test_colors_follow_light_capabilities() -> None:
    curve = build_room_curve(
        [{"position": 50, "lights": {"light.ct": {"brightness": 80, "rgb": [255, 140, 60]}}}]
    )
    ct_only = LightInfo(
        is_on=True,
        supports_transition=True,
        attributes={
            ATTR_SUPPORTED_COLOR_MODES: [ColorMode.COLOR_TEMP],
            "min_color_temp_kelvin": 2200,
            "max_color_temp_kelvin": 6500,
        },
    )
    commands = settle_commands(curve, 50, 0.3, {"light.ct": ct_only})["light.ct"]
    assert 2200 <= commands[0].data[ATTR_COLOR_TEMP_KELVIN] <= 3000
    assert ATTR_XY_COLOR not in commands[0].data

    rgb = LightInfo(True, True, {ATTR_SUPPORTED_COLOR_MODES: [ColorMode.XY]})
    commands = settle_commands(curve, 50, 0.3, {"light.ct": rgb})["light.ct"]
    assert ATTR_XY_COLOR in commands[0].data


def test_resync_sends_every_light_once() -> None:
    curve = build_room_curve(STEPS)
    events = plan_fade(
        curve, 40, 40, 1, lights={"light.a": ON, "light.b": OFF, "light.c": OFF}, max_segment=30
    )
    assert {e.entity_id for e in events} == {"light.a", "light.b"}
