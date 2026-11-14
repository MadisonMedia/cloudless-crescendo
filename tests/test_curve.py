"""The curve: what each light does at each position."""

from __future__ import annotations

import pytest
import voluptuous as vol

from custom_components.cloudless_crescendo.curve import curve_from_options
from custom_components.cloudless_crescendo.model import default_options, normalize_options

from .conftest import FLOOR, MIRROR, SINK_A, sample_options


def test_zero_is_off_and_every_light_has_a_value_at_every_stop() -> None:
    options = sample_options()
    assert [s["position"] for s in options["stops"]] == [0, 20, 40, 60, 100]
    assert all(set(s["values"]) == {FLOOR, MIRROR, SINK_A, "light.fake_sink_b"} for s in options["stops"])
    curve = curve_from_options(options)
    assert not any(t.is_on for t in curve.at(0).values())


def test_a_light_fades_in_from_the_stop_where_it_is_still_off() -> None:
    curve = curve_from_options(sample_options())
    assert not curve.lights[MIRROR].at(40).is_on
    assert curve.lights[MIRROR].at(50).brightness == pytest.approx(15)
    assert curve.lights[MIRROR].at(60).brightness == pytest.approx(30)


def test_a_light_off_at_one_end_takes_its_color_from_the_other_end() -> None:
    curve = curve_from_options(sample_options())
    assert curve.lights[FLOOR].at(10).xy == curve.lights[FLOOR].at(20).xy
    assert curve.lights[MIRROR].at(50).kelvin == 3000


def test_color_to_white_blends_in_xy_and_ends_on_real_white() -> None:
    curve = curve_from_options(sample_options())
    assert curve.lights[FLOOR].at(30).xy is not None
    assert curve.lights[FLOOR].at(40).kelvin == 2700


def test_color_temperature_blends_in_mireds() -> None:
    curve = curve_from_options(sample_options())
    assert curve.lights[FLOOR].at(50).kelvin == pytest.approx(1e6 / ((1e6 / 2700 + 1e6 / 3000) / 2))


def test_the_light_mode_limits_what_is_sent() -> None:
    options = sample_options()
    options["lights"][0]["mode"] = "dim"
    assert curve_from_options(options).lights[FLOOR].at(50).kelvin is None
    options["lights"][0]["mode"] = "rgb"
    assert curve_from_options(options).lights[FLOOR].at(50).xy is not None
    options["lights"][0]["mode"] = "onoff"
    onoff = curve_from_options(options).lights[FLOOR]
    assert not onoff.at(19).is_on
    assert onoff.at(20).brightness == 100


def test_two_stops_at_one_position_are_rejected() -> None:
    with pytest.raises(vol.Invalid):
        normalize_options({"stops": [{"position": 10}, {"position": 10.0}]})


def test_device_entries_get_a_direction_and_may_leave_an_action_out() -> None:
    options = normalize_options(
        {
            "devices": [
                {"entity_id": "media_player.bad", "kind": "ramp", "from": 60, "to": 80, "min": 20, "max": 40},
                {"entity_id": "media_player.bad", "kind": "threshold", "at": 40, "back": "media_pause"},
            ]
        }
    )
    ramp, pause = options["devices"]
    assert ramp["direction"] == "both"
    assert pause["action"] is None
    assert pause["back"] == "media_pause"
    with pytest.raises(vol.Invalid):
        normalize_options({"devices": [{**ramp, "direction": "sideways"}]})


def test_groups_keep_known_lights_once_and_need_two() -> None:
    lights = [{"entity_id": f"light.{n}"} for n in ("a", "b", "c", "d")]
    options = normalize_options(
        {
            "lights": lights,
            "groups": [
                {"name": " Waschtisch ", "lights": ["light.a", "light.b", "light.a", "light.gone"]},
                {"name": "Rest", "lights": ["light.b", "light.c"]},
                {"lights": ["light.c", "light.d"]},
            ],
        }
    )
    groups = options["groups"]
    assert [g["lights"] for g in groups] == [["light.a", "light.b"], ["light.c", "light.d"]]
    assert groups[0]["name"] == "Waschtisch"
    assert groups[1]["name"] == ""
    assert all(g["id"] for g in groups)


def test_a_new_object_rises_from_off_to_full() -> None:
    options = default_options([FLOOR])
    assert [s["values"][FLOOR]["brightness"] for s in options["stops"]] == [0, 100]
