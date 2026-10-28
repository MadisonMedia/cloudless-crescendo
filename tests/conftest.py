"""Shared fixtures."""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import patch

from homeassistant.components.light import (
    ATTR_BRIGHTNESS,
    ATTR_COLOR_TEMP_KELVIN,
    ATTR_XY_COLOR,
    DOMAIN as LIGHT_DOMAIN,
    ColorMode,
    LightEntity,
    LightEntityFeature,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import async_get_platforms
from homeassistant.setup import async_setup_component
import pytest
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    MockModule,
    MockPlatform,
    mock_integration,
    mock_platform,
)

from custom_components.cloudless_crescendo.const import DOMAIN
from custom_components.cloudless_crescendo.model import normalize_options

ROOM = "light.bad"


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Enable loading custom_components in every test."""
    return


@pytest.fixture(autouse=True)
def mock_frontend(hass: HomeAssistant):
    """The card and panel need the real frontend; tests only need the backend."""
    mock_integration(hass, MockModule("frontend"))
    mock_integration(hass, MockModule("panel_custom"))
    with patch("custom_components.cloudless_crescendo.async_register_frontend") as register:
        yield register


class FakeLight(LightEntity):
    """A light that records every command it receives."""

    _attr_should_poll = False
    _attr_min_color_temp_kelvin = 2000
    _attr_max_color_temp_kelvin = 6500

    def __init__(self, name: str, modes: set[ColorMode], transitions: bool = True) -> None:
        self._attr_name = name
        self._attr_unique_id = name
        self._attr_supported_color_modes = modes
        self._attr_supported_features = (
            LightEntityFeature.TRANSITION if transitions else LightEntityFeature(0)
        )
        self._attr_color_mode = next(iter(modes))
        self._attr_is_on = False
        self.calls: list[tuple[str, dict[str, Any]]] = []

    async def async_turn_on(self, **kwargs: Any) -> None:
        self.calls.append(("on", kwargs))
        self._attr_is_on = True
        if ATTR_BRIGHTNESS in kwargs:
            self._attr_brightness = kwargs[ATTR_BRIGHTNESS]
        if ATTR_COLOR_TEMP_KELVIN in kwargs:
            self._attr_color_mode = ColorMode.COLOR_TEMP
            self._attr_color_temp_kelvin = kwargs[ATTR_COLOR_TEMP_KELVIN]
        if ATTR_XY_COLOR in kwargs:
            self._attr_color_mode = ColorMode.XY
            self._attr_xy_color = kwargs[ATTR_XY_COLOR]
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        self.calls.append(("off", kwargs))
        self._attr_is_on = False
        self.async_write_ha_state()


RGBCCT = {ColorMode.XY, ColorMode.COLOR_TEMP}

ROOM_OPTIONS = {
    "default_transition": 2,
    "steps": [
        {
            "position": 20,
            "name": "Nacht",
            "lights": {"light.bad_boden": {"brightness": 50, "kelvin": 2700}},
        },
        {
            "position": 40,
            "name": "Morgen",
            "lights": {
                "light.bad_boden": {"brightness": 100},
                "light.bad_duschnische": {"brightness": 100},
            },
        },
        {
            "position": 60,
            "lights": {
                "light.bad_spiegel": {"brightness": 50, "rgb": [255, 160, 80]},
                "light.bad_deckenstrip": {"brightness": 30, "rgb": [255, 0, 0]},
            },
        },
    ],
}


@pytest.fixture
def fake_lights(hass: HomeAssistant) -> dict[str, FakeLight]:
    """The bathroom lights as a 'test' light platform."""
    lights = {
        "light.bad_boden": FakeLight("Bad Boden", RGBCCT),
        "light.bad_deckenstrip": FakeLight("Bad Deckenstrip", RGBCCT),
        "light.bad_duschnische": FakeLight("Bad Duschnische", {ColorMode.BRIGHTNESS}),
        "light.bad_spiegel": FakeLight("Bad Spiegel", {ColorMode.COLOR_TEMP}),
    }

    async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
        async_add_entities(list(lights.values()))

    mock_integration(hass, MockModule("test"))
    mock_platform(hass, "test.light", MockPlatform(async_setup_platform=async_setup_platform))
    return lights


class FakeClock:
    """Instant sleeps with a controllable clock."""

    def __init__(self) -> None:
        self.now = 0.0
        self.sleeps: list[float] = []

    async def sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self.now += seconds
        await asyncio.sleep(0)


def room_entity(hass: HomeAssistant, entity_id: str = ROOM):
    for platform in async_get_platforms(hass, DOMAIN):
        if entity_id in platform.entities:
            return platform.entities[entity_id]
    raise AssertionError(f"{entity_id} not found")


@pytest.fixture
async def setup_lights(hass: HomeAssistant, fake_lights) -> None:
    assert await async_setup_component(hass, LIGHT_DOMAIN, {LIGHT_DOMAIN: [{"platform": "test"}]})
    await hass.async_block_till_done()


@pytest.fixture
async def room_entry(hass: HomeAssistant, setup_lights) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, title="Bad", options=normalize_options(ROOM_OPTIONS))
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


@pytest.fixture
async def room(hass: HomeAssistant, room_entry) -> FakeClock:
    clock = FakeClock()
    engine = room_entity(hass).engine
    engine.sleep = clock.sleep
    engine.now = lambda: clock.now
    return clock
