"""Creating an object through Home Assistant's own dialog."""

from __future__ import annotations

from unittest.mock import patch

from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.cloudless_crescendo.const import DOMAIN

from .conftest import FLOOR, MIRROR, FakeLights


async def _create(hass: HomeAssistant, name: str, lights: list[str]):
    with patch("custom_components.cloudless_crescendo.async_register_frontend", return_value=None):
        result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": SOURCE_USER})
        assert result["type"] is FlowResultType.FORM
        assert result["step_id"] == "user"
        result = await hass.config_entries.flow.async_configure(result["flow_id"], {"name": name, "lights": lights})
        await hass.async_block_till_done()
    return result


async def test_new_object_rises_evenly(hass: HomeAssistant, setup_object, lights: FakeLights) -> None:
    lights.add(FLOOR, MIRROR)
    result = await _create(hass, "Flur", [FLOOR, MIRROR])
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Flur"

    options = result["options"]
    assert [stop["position"] for stop in options["stops"]] == [0, 100]
    assert [light["entity_id"] for light in options["lights"]] == [FLOOR, MIRROR]
    assert options["stops"][0]["values"][FLOOR] == {"brightness": 0}
    assert options["stops"][1]["values"][MIRROR]["brightness"] == 100
    assert hass.states.get("light.flur") is not None


async def test_two_objects_may_share_lights(hass: HomeAssistant, setup_object, lights: FakeLights) -> None:
    lights.add(FLOOR)
    for name in ("Bad", "Bad Abend"):
        result = await _create(hass, name, [FLOOR])
        assert result["type"] is FlowResultType.CREATE_ENTRY
    assert len(hass.config_entries.async_entries(DOMAIN)) == 2
