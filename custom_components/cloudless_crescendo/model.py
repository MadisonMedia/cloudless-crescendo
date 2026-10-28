"""Room configuration: validation and conversion between YAML and storage.

Storage format (config entry options, also used by the editor)::

    {
      "lights": [{"entity_id": "light.x", "color_mode": "auto"}],
      "steps": [
        {"position": 20, "name": "Night", "lights": {"light.x": {"brightness": 50, "kelvin": 2700}}}
      ],
      "default_transition": 1.5,
      "max_segment": 30
    }
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.light import DOMAIN as LIGHT_DOMAIN
from homeassistant.const import ATTR_ENTITY_ID, CONF_NAME
from homeassistant.helpers import config_validation as cv
import voluptuous as vol

from .const import (
    COLOR_MODE_AUTO,
    COLOR_MODES,
    CONF_COLOR_MODE,
    CONF_DEFAULT_TRANSITION,
    CONF_LIGHTS,
    CONF_MAX_SEGMENT,
    CONF_POSITION,
    CONF_STEPS,
    DEFAULT_MAX_SEGMENT,
    DEFAULT_TRANSITION,
    POINT_BRIGHTNESS,
    POINT_KELVIN,
    POINT_RGB,
    POINT_XY,
)
from .curve import RoomCurve, build_room_curve

PERCENT = vol.All(vol.Coerce(float), vol.Range(min=0, max=100))
STEP_POSITION = vol.All(vol.Coerce(float), vol.Range(min=0, max=100, min_included=False))
LIGHT_ID = cv.entity_domain(LIGHT_DOMAIN)


def _round_position(value: float) -> float | int:
    value = round(float(value), 2)
    return int(value) if value.is_integer() else value


POINT_SCHEMA = vol.Schema(
    {
        vol.Optional(POINT_BRIGHTNESS): PERCENT,
        vol.Exclusive(POINT_KELVIN, "color"): vol.All(
            vol.Coerce(int), vol.Range(min=1000, max=12000)
        ),
        vol.Exclusive(POINT_RGB, "color"): vol.All(
            vol.ExactSequence((cv.byte, cv.byte, cv.byte)), vol.Coerce(list)
        ),
        vol.Exclusive(POINT_XY, "color"): vol.All(
            vol.ExactSequence((cv.small_float, cv.small_float)), vol.Coerce(list)
        ),
    }
)


def point(value: Any) -> dict[str, Any]:
    """A point is a plain brightness or a mapping."""
    if isinstance(value, dict):
        return {k: v for k, v in POINT_SCHEMA(value).items() if v is not None}
    return {POINT_BRIGHTNESS: PERCENT(value)}


LIGHT_OPTIONS_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ENTITY_ID): LIGHT_ID,
        vol.Optional(CONF_COLOR_MODE, default=COLOR_MODE_AUTO): vol.In(COLOR_MODES),
    }
)

STEP_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_POSITION): vol.All(STEP_POSITION, _round_position),
        vol.Optional(CONF_NAME): vol.Any(None, cv.string),
        vol.Optional(CONF_LIGHTS, default={}): {LIGHT_ID: point},
    }
)

OPTIONS_SCHEMA = vol.Schema(
    {
        vol.Optional(CONF_LIGHTS, default=[]): [LIGHT_OPTIONS_SCHEMA],
        vol.Optional(CONF_STEPS, default=[]): [STEP_SCHEMA],
        vol.Optional(CONF_DEFAULT_TRANSITION, default=DEFAULT_TRANSITION): vol.All(
            vol.Coerce(float), vol.Range(min=0, max=3600)
        ),
        vol.Optional(CONF_MAX_SEGMENT, default=DEFAULT_MAX_SEGMENT): vol.All(
            vol.Coerce(float), vol.Range(min=1, max=600)
        ),
    },
    extra=vol.REMOVE_EXTRA,
)


def normalize_options(options: dict[str, Any]) -> dict[str, Any]:
    """Validate and normalize stored options; raises vol.Invalid."""
    data = OPTIONS_SCHEMA(options)

    # Every light used in a step is part of the room, in order of appearance.
    known = {light[ATTR_ENTITY_ID] for light in data[CONF_LIGHTS]}
    data[CONF_STEPS].sort(key=lambda s: s[CONF_POSITION])
    for step in data[CONF_STEPS]:
        if not step.get(CONF_NAME):
            step.pop(CONF_NAME, None)
        for entity_id in step[CONF_LIGHTS]:
            if entity_id not in known:
                data[CONF_LIGHTS].append(
                    {ATTR_ENTITY_ID: entity_id, CONF_COLOR_MODE: COLOR_MODE_AUTO}
                )
                known.add(entity_id)

    try:
        curve_from_options(data)
    except ValueError as err:
        raise vol.Invalid(str(err)) from err
    return data


def curve_from_options(options: dict[str, Any]) -> RoomCurve:
    """Build the room curve from (normalized) options."""
    light_options = {light[ATTR_ENTITY_ID]: light for light in options.get(CONF_LIGHTS, [])}
    return build_room_curve(options.get(CONF_STEPS, []), light_options)


# -- YAML --------------------------------------------------------------------

YAML_LIGHT_OPTIONS = vol.Schema({vol.Optional(CONF_COLOR_MODE): vol.In(COLOR_MODES)})


def _yaml_step(value: Any) -> dict[str, Any]:
    """A YAML step maps light entity IDs to points, plus an optional name."""
    if not isinstance(value, dict):
        raise vol.Invalid("a step must map lights to values")
    result: dict[str, Any] = {CONF_LIGHTS: {}}
    for key, item in value.items():
        if key == CONF_NAME:
            result[CONF_NAME] = cv.string(item)
        else:
            result[CONF_LIGHTS][LIGHT_ID(key)] = point(item)
    return result


YAML_STEPS_SCHEMA = vol.All({STEP_POSITION: _yaml_step}, vol.Length(min=1))


def yaml_to_options(config: dict[str, Any]) -> dict[str, Any]:
    """Convert a validated YAML platform config into storage options."""
    lights = [
        {ATTR_ENTITY_ID: entity_id, CONF_COLOR_MODE: opts.get(CONF_COLOR_MODE, COLOR_MODE_AUTO)}
        for entity_id, opts in (config.get(CONF_LIGHTS) or {}).items()
    ]
    steps = [
        {CONF_POSITION: _round_position(position), **step}
        for position, step in sorted(config[CONF_STEPS].items())
    ]
    return normalize_options(
        {
            CONF_LIGHTS: lights,
            CONF_STEPS: steps,
            CONF_DEFAULT_TRANSITION: config[CONF_DEFAULT_TRANSITION],
            CONF_MAX_SEGMENT: config[CONF_MAX_SEGMENT],
        }
    )
