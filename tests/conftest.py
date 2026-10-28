"""Shared fixtures."""

from __future__ import annotations

from typing import Any

from homeassistant.components.light import (
    ATTR_BRIGHTNESS,
    ATTR_COLOR_TEMP_KELVIN,
    ATTR_XY_COLOR,
    ColorMode,
    LightEntity,
    LightEntityFeature,
)
from homeassistant.core import HomeAssistant
import pytest
from pytest_homeassistant_custom_component.common import (
    MockModule,
    MockPlatform,
    mock_integration,
    mock_platform,
)


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Enable loading custom_components in every test."""
    return


class FakeLight(LightEntity):
    """A light that records every command it receives."""

    _attr_should_poll = False
    _attr_supported_features = LightEntityFeature.TRANSITION
    _attr_min_color_temp_kelvin = 2000
    _attr_max_color_temp_kelvin = 6500

    def __init__(self, name: str, modes: set[ColorMode]) -> None:
        self._attr_name = name
        self._attr_unique_id = name
        self._attr_supported_color_modes = modes
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


@pytest.fixture
def fake_lights(hass: HomeAssistant) -> dict[str, FakeLight]:
    """Provide the bathroom lights as a 'test' light platform."""
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
