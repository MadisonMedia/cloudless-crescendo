"""The plan: which command goes to which light when."""

from __future__ import annotations

import pytest

from custom_components.cloudless_crescendo.const import OFF_MARGIN
from custom_components.cloudless_crescendo.curve import Target, curve_from_options
from custom_components.cloudless_crescendo.planner import plan_fade, settle

from .conftest import FLOOR, MIRROR, SINK_A, SINK_B, sample_options

ALL_ON = {FLOOR: True, MIRROR: True, SINK_A: True, SINK_B: True}
ALL_OFF = dict.fromkeys(ALL_ON, False)


def _for(steps, entity_id):
    return [s for s in steps if s.entity_id == entity_id]


def test_each_light_gets_one_command_per_leg_with_a_matching_transition() -> None:
    curve = curve_from_options(sample_options())
    steps = plan_fade(curve, 0, 100, 100, lit=ALL_OFF)
    floor = _for(steps, FLOOR)
    assert [round(s.time) for s in floor] == [0, 20, 40, 60]
    assert floor[1].commands[-1].as_dict()["transition"] == 20
    assert floor[3].commands[-1].as_dict()["transition"] == 40


def test_the_sequence_holds_a_later_light_back_until_its_stage() -> None:
    curve = curve_from_options(sample_options())
    steps = plan_fade(curve, 0, 100, 100, lit=ALL_OFF)
    assert _for(steps, MIRROR)[0].time == pytest.approx(40)
    assert _for(steps, SINK_A)[0].time == pytest.approx(60)


def test_a_light_coming_from_off_starts_at_the_minimum_in_its_color() -> None:
    curve = curve_from_options(sample_options())
    first = _for(plan_fade(curve, 0, 100, 100, lit=ALL_OFF), MIRROR)[0]
    assert first.commands[0].as_dict() == {"brightness": 1, "color_temp_kelvin": 3000}
    assert first.commands[1].as_dict() == {"brightness": 76, "transition": 20}


def test_going_down_runs_backward_and_switches_off_after_the_transition_ended() -> None:
    curve = curve_from_options(sample_options())
    steps = _for(plan_fade(curve, 100, 0, 100, lit=ALL_ON), FLOOR)
    assert steps[-2].commands[0].as_dict() == {"brightness": 1, "transition": 20}
    assert steps[-1].commands[0].service == "turn_off"
    assert steps[-1].time == pytest.approx(100 + OFF_MARGIN)
    mirror = _for(plan_fade(curve, 100, 0, 100, lit=ALL_ON), MIRROR)
    assert mirror[-1].time == pytest.approx(60 + OFF_MARGIN)


def test_color_is_only_sent_when_it_changes() -> None:
    options = sample_options()
    options["stops"][-1]["values"][FLOOR] = {"brightness": 50, "kelvin": 3000}
    steps = _for(plan_fade(curve_from_options(options), 60, 100, 40, lit=ALL_ON), FLOOR)
    assert "color_temp_kelvin" not in steps[0].commands[0].as_dict()


def test_on_time_mode_uses_short_steps_without_a_transition() -> None:
    options = sample_options()
    options["lights"][2]["fade"] = "ontime"
    options["lights"][2]["steps"] = 4
    steps = _for(plan_fade(curve_from_options(options), 60, 100, 5, lit=ALL_ON), SINK_A)
    assert len(steps) == 20
    assert all("transition" not in s.commands[-1].as_dict() for s in steps)
    assert steps[-1].commands[-1].as_dict()["brightness"] == 204


def test_a_leg_beyond_home_assistants_limit_is_split() -> None:
    curve = curve_from_options(sample_options())
    steps = _for(plan_fade(curve, 60, 100, 20000, lit=ALL_ON), MIRROR)
    assert len(steps) == 4
    assert all(s.commands[-1].as_dict()["transition"] <= 6553 for s in steps)


def test_an_interrupted_light_without_a_leg_is_brought_back() -> None:
    curve = curve_from_options(sample_options())
    steps = plan_fade(curve, 45, 50, 5, lit=ALL_ON, last={SINK_A: Target(80, kelvin=4000)})
    assert _for(steps, SINK_A)[0].commands[0].service == "turn_off"


def test_settle_only_sends_off_to_lights_that_are_on() -> None:
    curve = curve_from_options(sample_options())
    steps = settle(curve, 0, {FLOOR: True}, 0.4)
    assert [s.entity_id for s in steps] == [FLOOR]


def test_a_person_taken_light_is_left_alone() -> None:
    curve = curve_from_options(sample_options())
    steps = plan_fade(curve, 0, 100, 10, lit=ALL_OFF, skip={MIRROR: 1})
    assert not _for(steps, MIRROR)
