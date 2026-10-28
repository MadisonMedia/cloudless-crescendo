"""Constants for Cloudless Crescendo."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "cloudless_crescendo"

# Room configuration (config entry options / YAML)
CONF_STEPS: Final = "steps"
CONF_LIGHTS: Final = "lights"
CONF_DEFAULT_TRANSITION: Final = "default_transition"
CONF_MAX_SEGMENT: Final = "max_segment"
CONF_COLOR_MODE: Final = "color_mode"
CONF_POSITION: Final = "position"

COLOR_MODE_AUTO: Final = "auto"
COLOR_MODE_COLOR: Final = "color"
COLOR_MODE_WHITE: Final = "white"
COLOR_MODES: Final = (COLOR_MODE_AUTO, COLOR_MODE_COLOR, COLOR_MODE_WHITE)

POINT_BRIGHTNESS: Final = "brightness"
POINT_KELVIN: Final = "kelvin"
POINT_RGB: Final = "rgb"
POINT_XY: Final = "xy"

# Entity attributes
ATTR_POSITION: Final = "position"
ATTR_TARGET_POSITION: Final = "target_position"
ATTR_FADING: Final = "fading"
ATTR_FADE_REMAINING: Final = "fade_remaining"
ATTR_FADE_FROM: Final = "fade_from"
ATTR_FADE_STARTED: Final = "fade_started"
ATTR_FADE_ENDS: Final = "fade_ends"
ATTR_LAST_ON_POSITION: Final = "last_on_position"
ATTR_STEPS: Final = "steps"
ATTR_CURVE_ID: Final = "curve_id"
ATTR_DURATION: Final = "duration"

DEFAULT_TRANSITION: Final = 1.5
"""Seconds used when the room light is changed without a transition."""

DEFAULT_MAX_SEGMENT: Final = 30.0
"""Longest single command (seconds) during long fades."""

STOP_TRANSITION: Final = 0.4
"""Seconds used to settle all lights after a fade was stopped."""

SHORT_FADE: Final = 10.0
"""Fades up to this many seconds report their target right away (no slider bounce)."""

PROGRESS_INTERVAL: Final = 10.0
"""Seconds between state updates during long fades."""

COMMAND_LEAD: Final = 0.2
"""Send follow-up commands this early so lights never pause between legs."""

SOFTWARE_STEP: Final = 0.5
"""Step size (seconds) for lights that do not support transitions."""

SERVICE_FADE_TO: Final = "fade_to"
SERVICE_STOP: Final = "stop"

URL_BASE: Final = "/cloudless_crescendo_static"
PANEL_URL: Final = "cloudless-crescendo"
