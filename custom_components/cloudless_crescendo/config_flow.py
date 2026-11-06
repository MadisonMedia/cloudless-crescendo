"""Config flow: one config entry per object."""

from __future__ import annotations

from typing import Any

from homeassistant.components.light import DOMAIN as LIGHT_DOMAIN
from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_NAME
from homeassistant.helpers import selector
import voluptuous as vol

from .const import CONF_LIGHTS, DOMAIN, PANEL_URL
from .model import default_options


class CrescendoConfigFlow(ConfigFlow, domain=DOMAIN):
    """Create an object. Its stops and everything else are set up on the Crescendo page."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Name the object and pick its lights."""
        if user_input is not None:
            return self.async_create_entry(
                title=user_input[CONF_NAME],
                data={},
                options=default_options(user_input.get(CONF_LIGHTS, [])),
            )
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_NAME): selector.TextSelector(),
                    vol.Optional(CONF_LIGHTS, default=[]): selector.EntitySelector(
                        selector.EntitySelectorConfig(domain=LIGHT_DOMAIN, multiple=True)
                    ),
                }
            ),
            description_placeholders={"panel": f"/{PANEL_URL}"},
        )
