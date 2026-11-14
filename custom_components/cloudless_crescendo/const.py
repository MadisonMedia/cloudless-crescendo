"""Constants for Cloudless Crescendo."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "cloudless_crescendo"

# Stored object configuration
CONF_LIGHTS: Final = "lights"
CONF_STOPS: Final = "stops"
CONF_DEVICES: Final = "devices"
CONF_BUTTONS: Final = "buttons"
CONF_GROUPS: Final = "groups"
CONF_SLIDER_RATE: Final = "slider_rate"
CONF_ON_MODE: Final = "on_mode"
CONF_ON_POSITION: Final = "on_position"
CONF_DEFAULT_TRANSITION: Final = "default_transition"

MODE_ONOFF: Final = "onoff"
MODE_DIM: Final = "dim"
MODE_CCT: Final = "cct"
MODE_RGB: Final = "rgb"
MODE_RGBCCT: Final = "rgbcct"
LIGHT_MODES: Final = (MODE_ONOFF, MODE_DIM, MODE_CCT, MODE_RGB, MODE_RGBCCT)

FADE_SOFT: Final = "soft"
FADE_ONTIME: Final = "ontime"

SLIDER_AUTO: Final = "auto"
SLIDER_GLIDE: Final = "glide"
SLIDER_DIRECT: Final = "direct"

ON_LAST: Final = "last"
ON_FIXED: Final = "fixed"

DEVICE_RAMP: Final = "ramp"
DEVICE_THRESHOLD: Final = "threshold"
# A ramp acts when dimming up, down or both.
RAMP_BOTH: Final = "both"
RAMP_UP: Final = "up"
RAMP_DOWN: Final = "down"

DEFAULT_SLIDER_RATE: Final = 4
DEFAULT_TRANSITION: Final = 5.0
DEFAULT_ON_POSITION: Final = 40.0
DEFAULT_STEPS: Final = 4

MAX_NATIVE_TRANSITION: Final = 6553.0
"""Home Assistant clamps a light transition to this many seconds."""

MIN_BRIGHTNESS: Final = 1

OFF_MARGIN: Final = 0.6
"""Seconds after a fade's end before switching off, so the off never hits a running transition."""

SETTLE_TRANSITION: Final = 0.4
"""Seconds used to bring a light to its value after an interruption."""

VERIFY_DELAY: Final = 1.5
"""Seconds until a sent on or off is checked. Lights report about once per second."""

VERIFY_RETRIES: Final = 3

LEVEL_TOLERANCE: Final = 8
"""How far (of 255) a reported brightness may be from the command before it counts as missed."""

LEVEL_STABLE: Final = 4.0
"""Seconds without a report before a light counts as stopped. Some lights report a slow ramp long after a fade."""

LEVEL_WINDOW: Final = 30.0
"""Seconds after a command or its transition during which a wrong level is corrected. Later it is someone's choice."""

SEND_RETRIES: Final = 2

SLIDER_GLIDE_FACTOR: Final = 1.5
"""A gliding light's transition during slider use, as a multiple of the update interval."""

SLIDER_SETTLE: Final = 1.0
"""Seconds without a new slider value before the slider counts as released."""

DEVICE_MIN_INTERVAL: Final = 2.0
"""Devices such as speakers or thermostats get at most one ramp command per this many seconds."""

SHORT_FADE: Final = 3.0
"""Fades up to this long report their target at once, so a tile's slider does not bounce."""

PROGRESS_INTERVAL: Final = 10.0
"""Seconds between state updates during long fades."""

NETWORK_GAP: Final[dict[str, float]] = {"matter": 0.07}
"""Seconds between commands per integration. Measured on Thread: about 12 to 16 commands per second."""

DEFAULT_NETWORK_GAP: Final = 0.02

DIRECT_SLIDER_MANUFACTURERS: Final = frozenset({"Itius GmbH"})
"""Lights that dim too slowly with a transition to follow a slider; they get direct steps instead."""

ATTR_CRESCENDO: Final = "crescendo"
ATTR_POSITION: Final = "position"
ATTR_FADING: Final = "fading"
ATTR_TARGET_POSITION: Final = "target_position"
ATTR_FADE_FROM: Final = "fade_from"
ATTR_FADE_STARTED: Final = "fade_started"
ATTR_FADE_ENDS: Final = "fade_ends"
ATTR_LAST_ON: Final = "last_on_position"
ATTR_ON_POSITION: Final = "on_position"
ATTR_STOPS: Final = "stops"
ATTR_BUTTONS: Final = "buttons"
ATTR_CURVE_ID: Final = "curve_id"
ATTR_COLOR_OVERRIDE: Final = "color_override"
ATTR_DURATION: Final = "duration"
ATTR_BUTTON: Final = "button"
ATTR_SOURCE: Final = "source"
ATTR_DEVICES: Final = "devices"
ATTR_COMMAND: Final = "command"
ATTR_COMMAND_SOURCE: Final = "command_source"
ATTR_COMMAND_USER_ID: Final = "command_user_id"
ATTR_COMMAND_AT: Final = "command_at"
ATTR_EXTERNAL_ON_POSITION: Final = "external_on_position"
ATTR_CRESCENDO_API: Final = "crescendo_api"

CRESCENDO_API: Final = 1
"""Version of the attributes and fields other integrations rely on. Raise it when they change."""

COMMAND_SWITCH_ON: Final = "switch_on"
COMMAND_SET: Final = "set"
COMMAND_SWITCH_OFF: Final = "switch_off"
COMMAND_STOP: Final = "stop"
COMMANDS: Final = (COMMAND_SWITCH_ON, COMMAND_SET, COMMAND_SWITCH_OFF, COMMAND_STOP)

SERVICE_FADE_TO: Final = "fade_to"
SERVICE_STOP: Final = "stop"
SERVICE_PRESS_BUTTON: Final = "press_button"
SERVICE_SET_ON_POSITION: Final = "set_on_position"
SERVICE_RESET_COLOR: Final = "reset_color"

URL_STATIC: Final = "/cloudless_crescendo_files"
PANEL_URL: Final = "crescendo"
