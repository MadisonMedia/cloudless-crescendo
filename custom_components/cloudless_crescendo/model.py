"""Stored configuration of an object: validation and normalization.

Stored per config entry, versioned by the entry's VERSION::

    {
      "lights": [{"entity_id": "light.x", "mode": "cct", "fade": "soft", "steps": 4, "slider": "auto"}],
      "stops": [
        {"position": 0, "values": {"light.x": {"brightness": 0}}},
        {"position": 100, "values": {"light.x": {"brightness": 100, "kelvin": 3000}}}
      ],
      "devices": [
        {"id": "a1", "entity_id": "media_player.x", "kind": "ramp", "from": 20, "to": 100, "min": 0, "max": 40,
         "direction": "both"},
        {"id": "b2", "entity_id": "cover.x", "kind": "threshold", "at": 50, "action": "open_cover", "back": null}
      ],
      "buttons": [{"id": "c3", "name": "Morgen", "position": 40, "duration": 5}],
      "groups": [{"id": "d4", "name": "Waschtisch", "lights": ["light.y", "light.z"]}],
      "slider_rate": 4, "on_mode": "last", "on_position": 40, "default_transition": 5
    }

Every light has an explicit value at every stop. Stops at 0 and 100 always exist,
and at 0 every light is off. A device may have several entries: ramps act only when a movement
touches their range, in the direction they allow; a threshold may act on crossing up, down or both.
Groups are chosen by the user and only change how lights
are shown and edited together; each light belongs to at most one group.
"""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from homeassistant.helpers import config_validation as cv
import voluptuous as vol

from .const import (
    CONF_BUTTONS,
    CONF_DEFAULT_TRANSITION,
    CONF_DEVICES,
    CONF_GROUPS,
    CONF_LIGHTS,
    CONF_ON_MODE,
    CONF_ON_POSITION,
    CONF_SLIDER_RATE,
    CONF_STOPS,
    DEFAULT_ON_POSITION,
    DEFAULT_SLIDER_RATE,
    DEFAULT_STEPS,
    DEFAULT_TRANSITION,
    DEVICE_RAMP,
    DEVICE_THRESHOLD,
    FADE_ONTIME,
    FADE_SOFT,
    LIGHT_MODES,
    MODE_CCT,
    ON_FIXED,
    ON_LAST,
    RAMP_BOTH,
    RAMP_DOWN,
    RAMP_UP,
    SLIDER_AUTO,
    SLIDER_DIRECT,
    SLIDER_GLIDE,
)

PERCENT = vol.All(vol.Coerce(float), vol.Range(min=0, max=100))

VALUE_SCHEMA = vol.Schema(
    {
        vol.Required("brightness"): PERCENT,
        vol.Exclusive("kelvin", "color"): vol.All(vol.Coerce(int), vol.Range(min=1000, max=12000)),
        vol.Exclusive("color", "color"): vol.All(vol.ExactSequence((cv.byte, cv.byte, cv.byte)), vol.Coerce(list)),
    }
)

LIGHT_SCHEMA = vol.Schema(
    {
        vol.Required("entity_id"): cv.entity_domain("light"),
        vol.Optional("mode", default=MODE_CCT): vol.In(LIGHT_MODES),
        vol.Optional("fade", default=FADE_SOFT): vol.In((FADE_SOFT, FADE_ONTIME)),
        vol.Optional("steps", default=DEFAULT_STEPS): vol.All(vol.Coerce(int), vol.Range(min=1, max=8)),
        vol.Optional("slider", default=SLIDER_AUTO): vol.In((SLIDER_AUTO, SLIDER_GLIDE, SLIDER_DIRECT)),
    }
)

STOP_SCHEMA = vol.Schema(
    {
        vol.Required("position"): PERCENT,
        vol.Optional("values", default={}): {cv.entity_domain("light"): VALUE_SCHEMA},
    }
)

RAMP_SCHEMA = vol.Schema(
    {
        vol.Optional("id"): str,
        vol.Required("entity_id"): cv.entity_id,
        vol.Required("kind"): DEVICE_RAMP,
        vol.Optional("direction", default=RAMP_BOTH): vol.In((RAMP_BOTH, RAMP_UP, RAMP_DOWN)),
        vol.Required("from"): PERCENT,
        vol.Required("to"): PERCENT,
        vol.Required("min"): vol.Coerce(float),
        vol.Required("max"): vol.Coerce(float),
    }
)

THRESHOLD_SCHEMA = vol.Schema(
    {
        vol.Optional("id"): str,
        vol.Required("entity_id"): cv.entity_id,
        vol.Required("kind"): DEVICE_THRESHOLD,
        vol.Required("at"): PERCENT,
        vol.Optional("action", default=None): vol.Any(None, str),
        vol.Optional("back"): vol.Any(None, str),
        vol.Optional("data"): dict,
    }
)

BUTTON_SCHEMA = vol.Schema(
    {
        vol.Optional("id"): str,
        vol.Required("name"): vol.All(str, vol.Length(min=1)),
        vol.Required("position"): PERCENT,
        vol.Optional("duration", default=0.0): vol.All(vol.Coerce(float), vol.Range(min=0, max=86400)),
        vol.Optional("icon"): vol.All(str, vol.Length(max=64)),
    }
)

GROUP_SCHEMA = vol.Schema(
    {
        vol.Optional("id"): str,
        vol.Optional("name", default=""): vol.All(str, vol.Length(max=64)),
        vol.Required("lights"): [cv.entity_domain("light")],
    }
)

OPTIONS_SCHEMA = vol.Schema(
    {
        vol.Optional(CONF_LIGHTS, default=[]): [LIGHT_SCHEMA],
        vol.Optional(CONF_STOPS, default=[]): [STOP_SCHEMA],
        vol.Optional(CONF_DEVICES, default=[]): [vol.Any(RAMP_SCHEMA, THRESHOLD_SCHEMA)],
        vol.Optional(CONF_BUTTONS, default=[]): [BUTTON_SCHEMA],
        vol.Optional(CONF_GROUPS, default=[]): [GROUP_SCHEMA],
        vol.Optional(CONF_SLIDER_RATE, default=DEFAULT_SLIDER_RATE): vol.All(vol.Coerce(int), vol.Range(min=1, max=10)),
        vol.Optional(CONF_ON_MODE, default=ON_LAST): vol.In((ON_LAST, ON_FIXED)),
        vol.Optional(CONF_ON_POSITION, default=DEFAULT_ON_POSITION): vol.All(
            vol.Coerce(float), vol.Range(min=1, max=100)
        ),
        vol.Optional(CONF_DEFAULT_TRANSITION, default=DEFAULT_TRANSITION): vol.All(
            vol.Coerce(float), vol.Range(min=0, max=3600)
        ),
    },
    extra=vol.REMOVE_EXTRA,
)


def _new_id() -> str:
    return uuid4().hex[:8]


def _tidy(value: float) -> float | int:
    value = round(float(value), 2)
    return int(value) if value.is_integer() else value


def normalize_options(options: dict[str, Any]) -> dict[str, Any]:
    """Validate options and complete them; raises vol.Invalid."""
    data = OPTIONS_SCHEMA(options)
    lights: list[dict[str, Any]] = []
    known: set[str] = set()
    for light in data[CONF_LIGHTS]:
        if light["entity_id"] not in known:
            known.add(light["entity_id"])
            lights.append(light)
    data[CONF_LIGHTS] = lights

    by_position: dict[float, dict[str, Any]] = {}
    for stop in data[CONF_STOPS]:
        position = _tidy(stop["position"])
        if position in by_position:
            raise vol.Invalid(f"Two stops use position {position}")
        by_position[position] = stop["values"]
    by_position.setdefault(0, {})
    by_position.setdefault(100, {})

    stops = []
    for position in sorted(by_position):
        values = by_position[position]
        complete = {}
        for eid in known:
            value = values.get(eid, {"brightness": 0})
            complete[eid] = {"brightness": 0} if position == 0 else value
        stops.append({"position": position, "values": complete})
    data[CONF_STOPS] = stops

    for device in data[CONF_DEVICES]:
        device.setdefault("id", _new_id())
    for button in data[CONF_BUTTONS]:
        button.setdefault("id", _new_id())
        button["position"] = _tidy(button["position"])

    # A group keeps only lights of the object, each light in one group, and at least two of them.
    groups = []
    grouped: set[str] = set()
    for group in data[CONF_GROUPS]:
        members = [eid for eid in dict.fromkeys(group["lights"]) if eid in known and eid not in grouped]
        if len(members) < 2:
            continue
        grouped.update(members)
        groups.append({"id": group.get("id") or _new_id(), "name": group["name"].strip(), "lights": members})
    data[CONF_GROUPS] = groups
    return data


def default_options(entity_ids: list[str]) -> dict[str, Any]:
    """Return options for a new object: every light rises evenly from off to full."""
    lights = [{"entity_id": eid} for eid in entity_ids]
    stops = [
        {"position": 0},
        {"position": 100, "values": {eid: {"brightness": 100} for eid in entity_ids}},
    ]
    return normalize_options({CONF_LIGHTS: lights, CONF_STOPS: stops})
