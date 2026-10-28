"""Cloudless Crescendo: one slider, many lights, staggered dimming curves."""

from __future__ import annotations

from homeassistant.helpers import config_validation as cv

from .const import DOMAIN

# Configuration lives under the light platform (`light: - platform: cloudless_crescendo`).
CONFIG_SCHEMA = cv.platform_only_config_schema(DOMAIN)
