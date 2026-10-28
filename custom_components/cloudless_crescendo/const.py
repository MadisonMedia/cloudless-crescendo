"""Constants for Cloudless Crescendo."""

from __future__ import annotations

DOMAIN = "cloudless_crescendo"

CONF_STEPS = "steps"
CONF_DEFAULT_TRANSITION = "default_transition"
CONF_MAX_SEGMENT = "max_segment"

ATTR_POSITION = "position"
ATTR_TARGET_POSITION = "target_position"
ATTR_FADING = "fading"
ATTR_FADE_END = "fade_end"
ATTR_LAST_ON_POSITION = "last_on_position"
ATTR_DURATION = "duration"

POINT_BRIGHTNESS = "brightness"
POINT_KELVIN = "kelvin"
POINT_RGB = "rgb"
POINT_XY = "xy"

DEFAULT_TRANSITION = 1.5
"""Seconds used when the virtual light is changed without a transition."""

DEFAULT_MAX_SEGMENT = 30.0
"""Longest single command (seconds) during long fades."""

STOP_TRANSITION = 0.4
"""Seconds used to settle all lights after a fade was stopped."""

SERVICE_FADE_TO = "fade_to"
SERVICE_STOP = "stop"
