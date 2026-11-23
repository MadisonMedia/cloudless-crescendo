"""Show a setup on the real lights before it is saved, and give them back afterwards."""

from __future__ import annotations

from typing import Any

from homeassistant.const import ATTR_ENTITY_ID, EVENT_CALL_SERVICE, STATE_ON, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Context, Event, HomeAssistant, State, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later

from .const import DOMAIN
from .curve import ObjectCurve
from .planner import OFF, Command, settle
from .sender import Sender

TRANSITION = 0.3
SETTLE_SECONDS = 20.0
"""How long a finished preview stays, so slow lights are checked and their late reports belong to it."""

COLOR_ATTRIBUTES = {
    "color_temp": "color_temp_kelvin",
    "hs": "hs_color",
    "xy": "xy_color",
    "rgb": "rgb_color",
    "rgbw": "rgbw_color",
    "rgbww": "rgbww_color",
}


@callback
def _previews(hass: HomeAssistant) -> list[SetupPreview]:
    return hass.data.setdefault(DOMAIN, {}).setdefault("setup_previews", [])


@callback
def is_preview_call(hass: HomeAssistant, context: Context) -> bool:
    """Return whether a command comes from a preview, so that no object takes it for a hand."""
    return any(preview.context.id in (context.id, context.parent_id) for preview in _previews(hass))


@callback
def is_previewed(hass: HomeAssistant, entity_id: str) -> bool:
    """Return whether a preview is using a light right now."""
    return any(entity_id in preview.before for preview in _previews(hass))


def _as_before(state: State) -> tuple[Command, ...]:
    """Return what brings a light back to a state."""
    if state.state != STATE_ON:
        return (OFF,)
    attrs = state.attributes
    data: list[tuple[str, Any]] = []
    if attrs.get("brightness") is not None:
        data.append(("brightness", attrs["brightness"]))
    attribute = COLOR_ATTRIBUTES.get(attrs.get("color_mode"))
    value = attrs.get(attribute) if attribute else None
    if value is not None:
        data.append((attribute, tuple(value) if isinstance(value, list | tuple) else value))
    return (Command("turn_on", tuple(data)),)


class SetupPreview:
    """One preview. It remembers each light as it was when the preview first touched it."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize."""
        self.hass = hass
        self.context = Context()
        self.before: dict[str, State] = {}
        self._sender = Sender(hass, self._network_of, self.context)
        self._shown: set[str] = set()
        self._released: set[str] = set()
        self._cancel_close: Any = None
        self._unsubscribe = hass.bus.async_listen(EVENT_CALL_SERVICE, self._on_service_call)
        _previews(hass).append(self)

    @callback
    def _on_service_call(self, event: Event) -> None:
        """Someone else moved a light: it is theirs, so the preview lets it go and does not set it back."""
        if event.data.get("domain") != "light" or self.context.id in (event.context.id, event.context.parent_id):
            return
        targets = (event.data.get("service_data") or {}).get(ATTR_ENTITY_ID) or []
        for eid in [targets] if isinstance(targets, str) else targets:
            if eid in self.before:
                self._sender.forget(eid)
                self._shown.discard(eid)
                del self.before[eid]
                self._released.add(eid)

    def _network_of(self, entity_id: str) -> str:
        entry = er.async_get(self.hass).async_get(entity_id)
        return entry.platform if entry is not None else "unknown"

    @property
    def closed(self) -> bool:
        """Return whether the preview is over for good."""
        return self._sender.closed

    @callback
    def show(self, curve: ObjectCurve, position: float) -> None:
        """Put the lights where they would be at a position. Lights no longer part of it get back what they showed."""
        if self._cancel_close is not None:
            self._cancel_close()
            self._cancel_close = None
            # A new preview; lights let go in the last one may join again.
            self._released.clear()
        lit: dict[str, bool] = {}
        for eid in curve.lights:
            state = self.hass.states.get(eid)
            if state is None or state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN) or eid in self._released:
                continue
            if eid not in self.before:
                # What another preview shows is not how the light was.
                self.before[eid] = next((p.before[eid] for p in _previews(self.hass) if eid in p.before), state)
            lit[eid] = self._sender.expected_on.get(eid, state.state == STATE_ON)
        for eid in self._shown - curve.lights.keys():
            self._restore(eid)
        for step in settle(curve, position, lit, TRANSITION):
            if step.entity_id in lit:
                self._shown.add(step.entity_id)
                self._sender.send(step.entity_id, step.commands, step.transition)

    def _restore(self, entity_id: str) -> None:
        self._shown.discard(entity_id)
        self._sender.send(entity_id, _as_before(self.before[entity_id]))

    @callback
    def end(self) -> None:
        """Give all lights back. The preview stays a moment longer, until they have settled."""
        if self.closed or self._cancel_close is not None:
            return
        for eid in list(self._shown):
            self._restore(eid)
        self._cancel_close = async_call_later(self.hass, SETTLE_SECONDS, self._close)

    async def _close(self, _now: Any) -> None:
        self._cancel_close = None
        self._unsubscribe()
        await self._sender.async_close()
        _previews(self.hass).remove(self)
