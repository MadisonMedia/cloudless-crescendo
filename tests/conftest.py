"""Fixtures: fake lights that behave like real ones, without any hardware."""

from __future__ import annotations

import asyncio
from collections.abc import Generator
from typing import Any
from unittest.mock import patch

from homeassistant.core import HomeAssistant, ServiceRegistry
from homeassistant.setup import async_setup_component
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.cloudless_crescendo.const import DOMAIN
from custom_components.cloudless_crescendo.model import normalize_options

FLOOR = "light.fake_floor"
MIRROR = "light.fake_mirror"
SINK_A = "light.fake_sink_a"
SINK_B = "light.fake_sink_b"

pytest_plugins = "pytest_homeassistant_custom_component"


class FakeLights:
    """Records light calls, updates states, and can answer slowly or fail."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.calls: list[dict[str, Any]] = []
        self.delay = 0.0
        self.fail_times = 0
        self.ignore_off: set[str] = set()
        self.ignore_on: set[str] = set()
        self.active = 0
        self.max_active: dict[str, int] = {}

    def add(self, *entity_ids: str) -> None:
        for eid in entity_ids:
            self.hass.states.async_set(
                eid, "off", {"supported_color_modes": ["color_temp", "xy"], "supported_features": 32}
            )

    def for_light(self, entity_id: str) -> list[dict[str, Any]]:
        return [c for c in self.calls if entity_id in c["entities"]]

    def last(self, entity_id: str) -> dict[str, Any]:
        return self.for_light(entity_id)[-1]

    async def handle(self, service: str, data: dict[str, Any]) -> None:
        entities = data["entity_id"]
        if isinstance(entities, str):
            entities = [entities]
        extra = {k: v for k, v in data.items() if k != "entity_id"}
        self.calls.append({"service": service, "entities": list(entities), "data": extra})
        if self.delay:
            await asyncio.sleep(self.delay)
        if self.fail_times > 0:
            self.fail_times -= 1
            raise RuntimeError("peer did not acknowledge")
        for eid in entities:
            if service == "turn_off":
                if eid in self.ignore_off:
                    self.ignore_off.discard(eid)
                    continue
                self.hass.states.async_set(eid, "off", self.hass.states.get(eid).attributes)
            elif eid in self.ignore_on:
                self.ignore_on.discard(eid)
            else:
                attrs = dict(self.hass.states.get(eid).attributes)
                attrs.update({k: v for k, v in extra.items() if k != "transition"})
                self.hass.states.async_set(eid, "on", attrs)


@pytest.fixture(autouse=True)
def _enable(enable_custom_integrations: None) -> None:
    """Allow the custom integration to load."""


@pytest.fixture
def lights(hass: HomeAssistant) -> Generator[FakeLights]:
    """Fake lights: calls to light.fake_* go here, everything else stays real."""
    fake = FakeLights(hass)
    fake.add(FLOOR, MIRROR, SINK_A, SINK_B)
    original = ServiceRegistry.async_call

    async def call(
        self: ServiceRegistry, domain: str, service: str, service_data: dict | None = None, *args: Any, **kwargs: Any
    ) -> Any:
        target = (service_data or {}).get("entity_id")
        ids = [target] if isinstance(target, str) else target or []
        if domain == "light" and ids and all(i.startswith("light.fake_") for i in ids):
            await fake.handle(service, service_data)
            return None
        return await original(self, domain, service, service_data, *args, **kwargs)

    with patch.object(ServiceRegistry, "async_call", call):
        yield fake


def sample_options(**extra: Any) -> dict[str, Any]:
    """Two stages: the floor comes first, the mirror joins later, then the sinks."""
    return normalize_options(
        {
            "lights": [
                {"entity_id": FLOOR, "mode": "rgbcct"},
                {"entity_id": MIRROR, "mode": "cct"},
                {"entity_id": SINK_A, "mode": "cct"},
                {"entity_id": SINK_B, "mode": "cct"},
            ],
            "stops": [
                {"position": 0},
                {"position": 20, "values": {FLOOR: {"brightness": 20, "color": [255, 90, 20]}}},
                {"position": 40, "values": {FLOOR: {"brightness": 60, "kelvin": 2700}}},
                {
                    "position": 60,
                    "values": {FLOOR: {"brightness": 100, "kelvin": 3000}, MIRROR: {"brightness": 30, "kelvin": 3000}},
                },
                {
                    "position": 100,
                    "values": {
                        FLOOR: {"brightness": 100, "kelvin": 4000},
                        MIRROR: {"brightness": 100, "kelvin": 4000},
                        SINK_A: {"brightness": 80, "kelvin": 4000},
                        SINK_B: {"brightness": 80, "kelvin": 4000},
                    },
                },
            ],
            "buttons": [{"name": "Morgen", "position": 40, "duration": 0.2}],
            **extra,
        }
    )


@pytest.fixture
async def setup_object(hass: HomeAssistant, lights: FakeLights):
    """Return a helper that sets up an object and returns its entity."""
    for component in ("frontend", "panel_custom", "lovelace"):
        hass.config.components.add(component)
    await async_setup_component(hass, "homeassistant", {})
    await async_setup_component(hass, "http", {})
    await async_setup_component(hass, "websocket_api", {})
    await async_setup_component(hass, "light", {})

    async def _setup(title: str = "Bad", options: dict[str, Any] | None = None, entry_id: str | None = None):
        with patch("custom_components.cloudless_crescendo.async_register_frontend", return_value=None):
            entry = MockConfigEntry(
                domain=DOMAIN, title=title, data={}, options=options or sample_options(), entry_id=entry_id
            )
            entry.add_to_hass(hass)
            assert await hass.config_entries.async_setup(entry.entry_id)
            await hass.async_block_till_done()
        return entry.runtime_data

    return _setup
