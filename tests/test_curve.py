"""Tests for the curve model."""

from __future__ import annotations

import pytest

from custom_components.cloudless_crescendo.curve import (
    SPACE_CT,
    SPACE_XY,
    Color,
    build_room_curve,
    interpolate_color,
    kelvin_to_xy,
    sample_room,
)

EXAMPLE = [
    {"position": 20, "lights": {"light.boden": {"brightness": 50}}},
    {
        "position": 40,
        "lights": {"light.boden": {"brightness": 100}, "light.dusche": {"brightness": 100}},
    },
    {
        "position": 60,
        "lights": {
            "light.spiegel": {"brightness": 50, "kelvin": 3000},
            "light.strip": {"brightness": 30, "rgb": [255, 120, 40]},
        },
    },
]


def brightness(curve, entity_id, position):
    return round(curve.states_at(position)[entity_id].brightness, 3)


def test_zero_is_all_off() -> None:
    curve = build_room_curve(EXAMPLE)
    assert not any(state.is_on for state in curve.states_at(0).values())


def test_staggered_fade_in() -> None:
    curve = build_room_curve(EXAMPLE)
    assert brightness(curve, "light.boden", 10) == 25
    assert brightness(curve, "light.boden", 30) == 75
    assert brightness(curve, "light.dusche", 20) == 0
    assert brightness(curve, "light.dusche", 30) == 50
    assert brightness(curve, "light.spiegel", 40) == 0
    assert brightness(curve, "light.spiegel", 50) == 25
    assert brightness(curve, "light.spiegel", 100) == 50


def test_white_only_curve_stays_in_color_temperature() -> None:
    curve = build_room_curve(EXAMPLE)
    assert curve.curves["light.spiegel"].space == SPACE_CT
    state = curve.states_at(50)["light.spiegel"]
    assert state.color.space == SPACE_CT
    assert state.color.kelvin == pytest.approx(3000)


def test_mixed_curve_uses_xy_everywhere() -> None:
    """No switch between white channels and color mixing within a curve."""
    curve = build_room_curve(
        [
            {"position": 10, "lights": {"light.strip": {"brightness": 20, "rgb": [255, 90, 20]}}},
            {"position": 25, "lights": {"light.strip": {"brightness": 50, "kelvin": 2200}}},
            {"position": 80, "lights": {"light.strip": {"kelvin": 4000}}},
        ]
    )
    light = curve.curves["light.strip"]
    assert light.space == SPACE_XY
    for position in (10, 17, 25, 50, 80, 100):
        assert light.state_at(position).color.space == SPACE_XY
    assert light.state_at(25).color.as_xy() == pytest.approx(kelvin_to_xy(2200))


def test_color_mode_override() -> None:
    steps = [
        {"position": 10, "lights": {"light.strip": {"brightness": 20, "rgb": [255, 90, 20]}}},
        {"position": 50, "lights": {"light.strip": {"brightness": 60, "kelvin": 3000}}},
    ]
    white = build_room_curve(steps, {"light.strip": {"color_mode": "white"}})
    assert white.curves["light.strip"].space == SPACE_CT
    color = build_room_curve(steps[1:], {"light.strip": {"color_mode": "color"}})
    assert color.curves["light.strip"].space == SPACE_XY


def test_planck_locus() -> None:
    x, y = kelvin_to_xy(6500)
    assert x == pytest.approx(0.3135, abs=0.002)
    assert y == pytest.approx(0.3237, abs=0.002)
    x, y = kelvin_to_xy(2700)
    assert x == pytest.approx(0.4600, abs=0.003)


def test_kelvin_interpolates_in_mired() -> None:
    middle = interpolate_color(Color.from_kelvin(2000), Color.from_kelvin(5000), 0.5)
    assert middle.kelvin == pytest.approx(1_000_000 / 350)


def test_brightness_and_color_are_carried_forward() -> None:
    curve = build_room_curve(
        [
            {"position": 10, "lights": {"light.a": {"brightness": 40, "kelvin": 2200}}},
            {"position": 50, "lights": {"light.a": {"kelvin": 4000}}},
            {"position": 80, "lights": {"light.a": {"brightness": 100}}},
        ]
    )
    assert curve.states_at(50)["light.a"].brightness == pytest.approx(40)
    assert curve.states_at(80)["light.a"].color.kelvin == pytest.approx(4000)


def test_light_can_turn_off_again() -> None:
    curve = build_room_curve(
        [
            {"position": 20, "lights": {"light.night": {"brightness": 30}}},
            {"position": 60, "lights": {"light.night": {"brightness": 0}}},
        ]
    )
    assert brightness(curve, "light.night", 40) == 15
    assert not curve.states_at(80)["light.night"].is_on


def test_first_mention_needs_brightness() -> None:
    with pytest.raises(ValueError):
        build_room_curve([{"position": 20, "lights": {"light.a": {"kelvin": 2700}}}])


def test_duplicate_positions_rejected() -> None:
    with pytest.raises(ValueError):
        build_room_curve([{"position": 20, "lights": {}}, {"position": 20.0, "lights": {}}])


def test_breakpoints_between() -> None:
    light = build_room_curve(EXAMPLE).curves["light.boden"]
    assert light.breakpoints_between(0, 100) == [20, 40]
    assert light.breakpoints_between(100, 10) == [40, 20]
    assert light.breakpoints_between(20, 40) == []


def test_sample_room() -> None:
    samples = sample_room(build_room_curve(EXAMPLE), 11)
    assert len(samples["light.boden"]) == 11
    assert samples["light.boden"][0][0] == 0
    assert samples["light.boden"][2][0] == 50
