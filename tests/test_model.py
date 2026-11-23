"""Settings as they are stored."""

from __future__ import annotations

import pytest
import voluptuous as vol

from custom_components.cloudless_crescendo.model import normalize_options

from .conftest import FLOOR, MIRROR


def _options(**extra):
    return {
        "lights": [{"entity_id": FLOOR}, {"entity_id": MIRROR}],
        "stops": [
            {"position": 0},
            {"position": 20, "values": {FLOOR: {"brightness": 30}}},
            {"position": 60, "values": {FLOOR: {"brightness": 65}}},
            {"position": 100, "values": {FLOOR: {"brightness": 100}}},
        ],
        **extra,
    }


def test_automatic_points_keep_only_lights_and_stops_that_exist() -> None:
    auto = {FLOOR: [60, 0, 100, 33, 60.0], MIRROR: [0, 100], "light.gone": [60]}
    assert normalize_options(_options(auto=auto))["auto"] == {FLOOR: [60]}


def test_settings_from_before_have_no_automatic_points() -> None:
    options = normalize_options(_options())
    assert options["auto"] == {}
    assert options["stops"][2]["values"][FLOOR] == {"brightness": 65}


def test_normalizing_twice_changes_nothing() -> None:
    once = normalize_options(_options(auto={FLOOR: [60]}, buttons=[{"name": "Hell", "position": 100}]))
    assert normalize_options(once) == once


def test_buttons_stand_in_the_order_of_their_stops() -> None:
    buttons = [{"name": name, "position": at} for name, at in (("Hell", 100), ("Nacht", 20), ("leicht", 20))]
    stored = normalize_options(_options(buttons=buttons))["buttons"]
    assert [button["name"] for button in stored] == ["Nacht", "leicht", "Hell"]


def test_the_order_of_the_lights_is_kept() -> None:
    options = _options()
    options["lights"].reverse()
    assert [light["entity_id"] for light in normalize_options(options)["lights"]] == [MIRROR, FLOOR]


def test_an_automatic_point_off_the_scale_is_refused() -> None:
    with pytest.raises(vol.Invalid):
        normalize_options(_options(auto={FLOOR: [140]}))
