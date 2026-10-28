"""Tests for the config and options flow."""

from __future__ import annotations

from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.cloudless_crescendo.const import DOMAIN


async def test_user_flow(hass: HomeAssistant, setup_lights) -> None:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"name": "Wohnzimmer", "lights": ["light.bad_boden"]}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Wohnzimmer"
    assert result["options"]["lights"] == [{"entity_id": "light.bad_boden", "color_mode": "auto"}]
    await hass.async_block_till_done()
    assert hass.states.get("light.wohnzimmer").state == "off"


async def test_options_flow_removes_light_from_steps(hass: HomeAssistant, room_entry) -> None:
    result = await hass.config_entries.options.async_init(room_entry.entry_id)
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {
            "lights": ["light.bad_boden", "light.bad_duschnische"],
            "default_transition": 3,
            "max_segment": 20,
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    options = room_entry.options
    assert options["default_transition"] == 3
    assert [light["entity_id"] for light in options["lights"]] == [
        "light.bad_boden",
        "light.bad_duschnische",
    ]
    assert all("light.bad_spiegel" not in step["lights"] for step in options["steps"])
