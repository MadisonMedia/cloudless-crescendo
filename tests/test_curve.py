"""Tests for the curve model."""

from __future__ import annotations

import pytest

from custom_components.cloudless_crescendo.curve import (
    MODE_CT,
    MODE_XY,
    Color,
    build_room_curve,
    interpolate_color,
)

# The example from the original idea.
EXAMPLE = {
    20: {"light.bad_boden": {"brightness": 50}},
    40: {
        "light.bad_boden": {"brightness": 100},
        "light.bad_duschnische": {"brightness": 100},
    },
    60: {
        "light.bad_spiegel": {"brightness": 50, "kelvin": 3000},
        "light.bad_deckenstrip": {"brightness": 30, "rgb": (255, 120, 40)},
    },
}


def brightness(curve, entity_id, position):
    return round(curve.states_at(position)[entity_id].brightness, 3)


def test_zero_is_all_off() -> None:
    curve = build_room_curve(EXAMPLE)
    assert not any(state.is_on for state in curve.states_at(0).values())


def test_staggered_fade_in() -> None:
    curve = build_room_curve(EXAMPLE)
    # Boden appears at 20, so it fades in from 0.
    assert brightness(curve, "light.bad_boden", 10) == 25
    assert brightness(curve, "light.bad_boden", 20) == 50
    assert brightness(curve, "light.bad_boden", 30) == 75
    # Duschnische appears at 40, so it starts at the previous step (20).
    assert brightness(curve, "light.bad_duschnische", 20) == 0
    assert brightness(curve, "light.bad_duschnische", 30) == 50
    # Spiegel appears at 60 and starts at 40.
    assert brightness(curve, "light.bad_spiegel", 40) == 0
    assert brightness(curve, "light.bad_spiegel", 50) == 25
    # Values are held after the last keyframe.
    assert brightness(curve, "light.bad_spiegel", 100) == 50
    assert brightness(curve, "light.bad_boden", 100) == 100


def test_color_is_known_while_fading_in() -> None:
    curve = build_room_curve(EXAMPLE)
    state = curve.states_at(50)["light.bad_spiegel"]
    assert state.color is not None
    assert state.color.mode == MODE_CT
    assert state.color.kelvin == pytest.approx(3000)


def test_kelvin_interpolates_in_mired() -> None:
    start = Color.from_kelvin(2000)  # 500 mired
    end = Color.from_kelvin(5000)  # 200 mired
    middle = interpolate_color(start, end, 0.5)
    assert middle is not None
    assert middle.kelvin == pytest.approx(1_000_000 / 350)


def test_mixed_colors_interpolate_in_xy() -> None:
    start = Color.from_kelvin(2700)
    end = Color.from_rgb((255, 0, 0))
    middle = interpolate_color(start, end, 0.5)
    assert middle is not None
    assert middle.mode == MODE_XY
    ax, ay = start.as_xy()
    bx, by = end.as_xy()
    assert middle.xy == pytest.approx(((ax + bx) / 2, (ay + by) / 2))


def test_brightness_and_color_are_carried_forward() -> None:
    curve = build_room_curve(
        {
            10: {"light.a": {"brightness": 40, "kelvin": 2200}},
            50: {"light.a": {"kelvin": 4000}},
            80: {"light.a": {"brightness": 100}},
        }
    )
    state = curve.states_at(50)["light.a"]
    assert state.brightness == pytest.approx(40)
    assert state.color.kelvin == pytest.approx(4000)
    state = curve.states_at(80)["light.a"]
    assert state.color.kelvin == pytest.approx(4000)


def test_light_can_turn_off_again() -> None:
    curve = build_room_curve(
        {
            20: {"light.night": {"brightness": 30}},
            60: {"light.night": {"brightness": 0}},
        }
    )
    assert brightness(curve, "light.night", 40) == 15
    assert not curve.states_at(80)["light.night"].is_on


def test_first_mention_needs_brightness() -> None:
    with pytest.raises(ValueError):
        build_room_curve({20: {"light.a": {"kelvin": 2700}}})


def test_plan_ends_on_every_keyframe() -> None:
    curve = build_room_curve(EXAMPLE)
    segments = curve.plan(0, 60, 6, max_segment=30)
    assert [s.end for s in segments] == [20, 40, 60]
    assert [s.duration for s in segments] == pytest.approx([2, 2, 2])


def test_plan_downwards() -> None:
    curve = build_room_curve(EXAMPLE)
    segments = curve.plan(60, 10, 5, max_segment=30)
    assert [s.end for s in segments] == [40, 20, 10]
    assert sum(s.duration for s in segments) == pytest.approx(5)


def test_plan_splits_long_fades() -> None:
    curve = build_room_curve(EXAMPLE)
    segments = curve.plan(0, 100, 3600, max_segment=30)
    assert len(segments) == 120
    assert max(s.duration for s in segments) <= 30 + 1e-9
    assert segments[-1].end == 100
    # Keyframes stay segment boundaries.
    ends = {round(s.end, 6) for s in segments}
    assert {20, 40, 60} <= ends


def test_plan_from_between_keyframes() -> None:
    curve = build_room_curve(EXAMPLE)
    segments = curve.plan(25, 45, 2, max_segment=30)
    assert [s.end for s in segments] == [40, 45]
    assert segments[0].start == 25
