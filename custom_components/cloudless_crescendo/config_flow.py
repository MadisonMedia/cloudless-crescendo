"""Config flow: one config entry per room."""

from __future__ import annotations

from typing import Any

from homeassistant.components.light import DOMAIN as LIGHT_DOMAIN
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.const import ATTR_ENTITY_ID, CONF_NAME, CONF_UNIQUE_ID
from homeassistant.core import callback
from homeassistant.helpers import selector
import voluptuous as vol

from .const import (
    COLOR_MODE_AUTO,
    CONF_COLOR_MODE,
    CONF_DEFAULT_TRANSITION,
    CONF_LIGHTS,
    CONF_MAX_SEGMENT,
    CONF_STEPS,
    DEFAULT_MAX_SEGMENT,
    DEFAULT_TRANSITION,
    DOMAIN,
    PANEL_URL,
)
from .model import normalize_options

LIGHTS_SELECTOR = selector.EntitySelector(
    selector.EntitySelectorConfig(domain=LIGHT_DOMAIN, multiple=True)
)


def _lights(entity_ids: list[str], existing: list[dict[str, Any]] | None = None) -> list[dict]:
    """Keep per-light options of lights that stay in the room."""
    known = {light[ATTR_ENTITY_ID]: light for light in existing or []}
    return [
        known.get(eid, {ATTR_ENTITY_ID: eid, CONF_COLOR_MODE: COLOR_MODE_AUTO})
        for eid in entity_ids
    ]


class CrescendoConfigFlow(ConfigFlow, domain=DOMAIN):
    """Create a room."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Name the room and pick its lights; the curve is drawn in the editor."""
        if user_input is not None:
            options = normalize_options(
                {CONF_LIGHTS: _lights(user_input.get(CONF_LIGHTS, [])), CONF_STEPS: []}
            )
            return self.async_create_entry(title=user_input[CONF_NAME], data={}, options=options)
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_NAME): selector.TextSelector(),
                    vol.Optional(CONF_LIGHTS, default=[]): LIGHTS_SELECTOR,
                }
            ),
            description_placeholders={"panel": f"/{PANEL_URL}"},
        )

    async def async_step_import(self, import_data: dict[str, Any]) -> ConfigFlowResult:
        """Import a YAML room once; later edits happen in the UI."""
        await self.async_set_unique_id(import_data[CONF_UNIQUE_ID])
        self._abort_if_unique_id_configured()
        return self.async_create_entry(
            title=import_data[CONF_NAME], data={}, options=import_data["options"]
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Return the options flow."""
        return CrescendoOptionsFlow()


class CrescendoOptionsFlow(OptionsFlow):
    """Lights and timing; steps and colors are edited in the sidebar editor."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Manage the options."""
        options = dict(self.config_entry.options)
        if user_input is not None:
            selected = user_input[CONF_LIGHTS]
            options[CONF_LIGHTS] = _lights(selected, options.get(CONF_LIGHTS))
            # Removing a light also removes it from all steps.
            options[CONF_STEPS] = [
                {**step, CONF_LIGHTS: {k: v for k, v in step[CONF_LIGHTS].items() if k in selected}}
                for step in options.get(CONF_STEPS, [])
            ]
            options[CONF_DEFAULT_TRANSITION] = user_input[CONF_DEFAULT_TRANSITION]
            options[CONF_MAX_SEGMENT] = user_input[CONF_MAX_SEGMENT]
            return self.async_create_entry(data=normalize_options(options))

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        CONF_LIGHTS,
                        default=[light[ATTR_ENTITY_ID] for light in options.get(CONF_LIGHTS, [])],
                    ): LIGHTS_SELECTOR,
                    vol.Required(
                        CONF_DEFAULT_TRANSITION,
                        default=options.get(CONF_DEFAULT_TRANSITION, DEFAULT_TRANSITION),
                    ): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=0,
                            max=60,
                            step=0.1,
                            unit_of_measurement="s",
                            mode=selector.NumberSelectorMode.BOX,
                        )
                    ),
                    vol.Required(
                        CONF_MAX_SEGMENT,
                        default=options.get(CONF_MAX_SEGMENT, DEFAULT_MAX_SEGMENT),
                    ): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=1,
                            max=600,
                            step=1,
                            unit_of_measurement="s",
                            mode=selector.NumberSelectorMode.BOX,
                        )
                    ),
                }
            ),
            description_placeholders={"panel": f"/{PANEL_URL}"},
        )
