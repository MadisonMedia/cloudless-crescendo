"""What every light does at every position of the scale.

An object has stops on a scale from 0 to 100. Every light has an explicit value
at every stop, and values blend between neighbouring stops the way a light's own
transition does: brightness linearly, color temperature in mireds, colors in CIE
xy. So one command per stop-to-stop leg, with a matching transition, follows the
curve. A light that is off at one end of a leg takes its color from the other
end, so it never fades through a wrong color.
"""

from __future__ import annotations

from bisect import bisect_right
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from homeassistant.util import color as color_util

from .const import (
    CONF_LIGHTS,
    CONF_STOPS,
    DEFAULT_STEPS,
    FADE_SOFT,
    MODE_CCT,
    MODE_DIM,
    MODE_ONOFF,
    MODE_RGB,
    SLIDER_AUTO,
)

_EPSILON = 1e-6


def kelvin_to_xy(kelvin: float) -> tuple[float, float]:
    """Return the CIE xy point of a color temperature."""
    r, g, b = color_util.color_temperature_to_rgb(kelvin)
    return color_util.color_RGB_to_xy(round(r), round(g), round(b))


def _mired(kelvin: float) -> float:
    return 1e6 / kelvin


@dataclass(frozen=True, slots=True)
class Target:
    """A light's state at one position."""

    brightness: float
    """Brightness in percent; 0 means off."""

    kelvin: float | None = None
    xy: tuple[float, float] | None = None

    @property
    def is_on(self) -> bool:
        """Return True if the light is on."""
        return self.brightness > _EPSILON

    def same_color(self, other: Target) -> bool:
        """Return True if both have practically the same color."""
        if self.kelvin is not None and other.kelvin is not None:
            return abs(_mired(self.kelvin) - _mired(other.kelvin)) < 0.5
        if self.xy is not None and other.xy is not None:
            return abs(self.xy[0] - other.xy[0]) < 0.0005 and abs(self.xy[1] - other.xy[1]) < 0.0005
        return self.kelvin is None and other.kelvin is None and self.xy is None and other.xy is None

    def is_close(self, other: Target) -> bool:
        """Return True if both are practically the same state."""
        if not self.is_on and not other.is_on:
            return True
        return abs(self.brightness - other.brightness) <= 0.2 and self.same_color(other)


def brightness_255(percent: float) -> int:
    """Convert percent to Home Assistant's brightness, never below 1 for a light that is on."""
    return max(1, min(255, round(percent * 255 / 100)))


class LightCurve:
    """The values of one light at all stops."""

    def __init__(
        self,
        entity_id: str,
        mode: str,
        fade: str,
        steps: int,
        slider: str,
        positions: list[float],
        values: list[Mapping[str, Any]],
    ) -> None:
        """Initialize from values given in stop order."""
        self.entity_id = entity_id
        self.mode = mode
        self.fade = fade
        self.steps = steps
        self.slider = slider
        self.positions = positions
        self._targets = [self._endpoint(value) for value in values]

    def _endpoint(self, value: Mapping[str, Any]) -> Target:
        brightness = float(value.get("brightness", 0))
        if self.mode == MODE_ONOFF:
            return Target(100.0 if brightness > 0 else 0.0)
        if self.mode == MODE_DIM:
            return Target(brightness)
        kelvin, color = value.get("kelvin"), value.get("color")
        if self.mode == MODE_CCT:
            return Target(brightness, kelvin=float(kelvin) if kelvin is not None else None)
        if color is not None:
            r, g, b = color
            return Target(brightness, xy=color_util.color_RGB_to_xy(r, g, b))
        if kelvin is None:
            return Target(brightness)
        if self.mode == MODE_RGB:
            return Target(brightness, xy=kelvin_to_xy(float(kelvin)))
        return Target(brightness, kelvin=float(kelvin))

    def at_stop(self, index: int) -> Target:
        """Return the exact value at a stop."""
        return self._targets[index]

    def at(self, position: float) -> Target:
        """Return the state at a position."""
        positions = self.positions
        if position <= positions[0]:
            return self._targets[0]
        if position >= positions[-1]:
            return self._targets[-1]
        index = bisect_right(positions, position) - 1
        a, b = self._targets[index], self._targets[index + 1]
        t = (position - positions[index]) / (positions[index + 1] - positions[index])
        if t <= _EPSILON:
            return a
        if self.mode == MODE_ONOFF:
            return a
        return _blend(a, b, t)


def _blend(a: Target, b: Target, t: float) -> Target:
    brightness = a.brightness + (b.brightness - a.brightness) * t
    if not a.is_on:
        return Target(brightness, b.kelvin, b.xy)
    if not b.is_on:
        return Target(brightness, a.kelvin, a.xy)
    if a.kelvin is not None and b.kelvin is not None:
        return Target(brightness, kelvin=1e6 / (_mired(a.kelvin) + (_mired(b.kelvin) - _mired(a.kelvin)) * t))
    if a.kelvin is None and a.xy is None:
        return Target(brightness, b.kelvin, b.xy)
    if b.kelvin is None and b.xy is None:
        return Target(brightness, a.kelvin, a.xy)
    # Color to white or back: the whole way runs in xy, the only space that can blend both.
    ax, ay = a.xy if a.xy is not None else kelvin_to_xy(a.kelvin)  # type: ignore[arg-type]
    bx, by = b.xy if b.xy is not None else kelvin_to_xy(b.kelvin)  # type: ignore[arg-type]
    return Target(brightness, xy=(ax + (bx - ax) * t, ay + (by - ay) * t))


class ObjectCurve:
    """All light curves of an object."""

    def __init__(self, positions: list[float], lights: dict[str, LightCurve]) -> None:
        """Initialize."""
        self.positions = positions
        self.lights = lights

    def at(self, position: float) -> dict[str, Target]:
        """Return every light's state at a position."""
        return {eid: curve.at(position) for eid, curve in self.lights.items()}


def curve_from_options(options: Mapping[str, Any]) -> ObjectCurve:
    """Build the curves from normalized options."""
    stops = options.get(CONF_STOPS) or []
    positions = [float(stop["position"]) for stop in stops]
    lights: dict[str, LightCurve] = {}
    for light in options.get(CONF_LIGHTS) or []:
        eid = light["entity_id"]
        lights[eid] = LightCurve(
            eid,
            light.get("mode", MODE_CCT),
            light.get("fade", FADE_SOFT),
            int(light.get("steps", DEFAULT_STEPS)),
            light.get("slider", SLIDER_AUTO),
            positions,
            [stop["values"].get(eid, {"brightness": 0}) for stop in stops],
        )
    return ObjectCurve(positions, lights)
