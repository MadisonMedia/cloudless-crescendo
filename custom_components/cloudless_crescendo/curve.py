"""Curve model for Cloudless Crescendo.

A room has one position axis from 0 to 100. Every controlled light has its
own keyframes on that axis (brightness and optionally a color). Between
keyframes values are interpolated linearly, in the same spaces a light uses
for its own transitions (brightness in percent, color temperature in mireds,
colors in CIE xy). So a single command with a matching ``transition`` per
keyframe-to-keyframe leg reproduces the curve exactly.

Rules:

* Position 0 is always "everything off".
* A light that first appears at a step starts fading in at the *previous*
  step (or at 0). This produces the staggered effect.
* After its last keyframe a light holds its value up to 100.
* A keyframe without brightness keeps the previous brightness; one without
  color keeps the previous color (or takes the first color defined).

Each light uses **one color space for its whole curve**. Switching an RGBCCT
light between its white channels (color temperature) and color mixing (xy)
is a visible jump, so a curve that mixes both is rendered entirely in xy
(white keyframes become points on the black body line). This can be
overridden per light with ``color_mode``.
"""

from __future__ import annotations

from bisect import bisect_right
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
import math
from typing import Any

from homeassistant.util import color as color_util

from .const import (
    COLOR_MODE_AUTO,
    COLOR_MODE_COLOR,
    COLOR_MODE_WHITE,
    POINT_BRIGHTNESS,
    POINT_KELVIN,
    POINT_RGB,
    POINT_XY,
)

SPACE_CT = "ct"
SPACE_XY = "xy"

_EPSILON = 1e-6


def kelvin_to_xy(kelvin: float) -> tuple[float, float]:
    """Return the CIE xy point of a black body (Kim et al. approximation)."""
    t = min(25000.0, max(1667.0, float(kelvin)))
    if t <= 4000:
        x = -0.2661239e9 / t**3 - 0.2343589e6 / t**2 + 0.8776956e3 / t + 0.179910
    else:
        x = -3.0258469e9 / t**3 + 2.1070379e6 / t**2 + 0.2226347e3 / t + 0.240390
    if t <= 2222:
        y = -1.1063814 * x**3 - 1.34811020 * x**2 + 2.18555832 * x - 0.20219683
    elif t <= 4000:
        y = -0.9549476 * x**3 - 1.37418593 * x**2 + 2.09137015 * x - 0.16748867
    else:
        y = 3.0817580 * x**3 - 5.87338670 * x**2 + 3.75112997 * x - 0.37001483
    return (x, y)


def xy_to_kelvin(xy: tuple[float, float]) -> float:
    """Return the correlated color temperature of an xy point."""
    return float(color_util.color_xy_to_temperature(*xy))


@dataclass(frozen=True, slots=True)
class Color:
    """A light color: a color temperature or a CIE xy point."""

    space: str
    kelvin: float | None = None
    xy: tuple[float, float] | None = None

    @classmethod
    def from_kelvin(cls, kelvin: float) -> Color:
        """Create a color temperature."""
        return cls(SPACE_CT, kelvin=float(kelvin))

    @classmethod
    def from_rgb(cls, rgb: Iterable[int]) -> Color:
        """Create a color from RGB (brightness is ignored)."""
        r, g, b = rgb
        return cls(SPACE_XY, xy=color_util.color_RGB_to_xy(r, g, b))

    @classmethod
    def from_xy(cls, xy: Iterable[float]) -> Color:
        """Create a color from a CIE xy point."""
        x, y = xy
        return cls(SPACE_XY, xy=(float(x), float(y)))

    def to_space(self, space: str) -> Color:
        """Convert into the given color space."""
        if space == self.space:
            return self
        if space == SPACE_XY:
            assert self.kelvin is not None
            return Color(SPACE_XY, xy=kelvin_to_xy(self.kelvin))
        assert self.xy is not None
        return Color(SPACE_CT, kelvin=xy_to_kelvin(self.xy))

    def as_xy(self) -> tuple[float, float]:
        """Return the color as xy."""
        if self.xy is not None:
            return self.xy
        assert self.kelvin is not None
        return kelvin_to_xy(self.kelvin)

    def as_rgb(self) -> tuple[int, int, int]:
        """Return a display RGB value at full brightness."""
        if self.space == SPACE_CT:
            assert self.kelvin is not None
            r, g, b = color_util.color_temperature_to_rgb(self.kelvin)
            return (round(r), round(g), round(b))
        x, y = self.as_xy()
        return color_util.color_xy_to_RGB(x, y)

    def is_close(self, other: Color | None) -> bool:
        """Return True if both colors are practically identical."""
        if other is None or other.space != self.space:
            return False
        if self.space == SPACE_CT:
            assert self.kelvin is not None and other.kelvin is not None
            return abs(1e6 / self.kelvin - 1e6 / other.kelvin) < 0.5
        ax, ay = self.as_xy()
        bx, by = other.as_xy()
        return abs(ax - bx) < 0.0005 and abs(ay - by) < 0.0005


def interpolate_color(start: Color | None, end: Color | None, t: float) -> Color | None:
    """Interpolate two colors of the same space at fraction ``t``."""
    if start is None or end is None:
        return end if start is None else start
    if t <= _EPSILON:
        return start
    if t >= 1 - _EPSILON:
        return end
    if start.space == SPACE_CT and end.space == SPACE_CT:
        assert start.kelvin is not None and end.kelvin is not None
        mired_a = 1e6 / start.kelvin
        mired_b = 1e6 / end.kelvin
        return Color.from_kelvin(1e6 / (mired_a + (mired_b - mired_a) * t))
    ax, ay = start.as_xy()
    bx, by = end.as_xy()
    return Color.from_xy((ax + (bx - ax) * t, ay + (by - ay) * t))


@dataclass(frozen=True, slots=True)
class LightState:
    """Target state of one light at one position."""

    brightness: float
    """Brightness in percent (0..100); 0 means off."""

    color: Color | None = None

    @property
    def is_on(self) -> bool:
        """Return True if the light should be on."""
        return self.brightness > _EPSILON

    def is_close(self, other: LightState) -> bool:
        """Return True if both states are practically identical."""
        if not self.is_on and not other.is_on:
            return True
        if abs(self.brightness - other.brightness) > 0.2:
            return False
        if self.color is None or other.color is None:
            return self.color is other.color
        return self.color.is_close(other.color)


@dataclass(frozen=True, slots=True)
class Keyframe:
    """A light's state at a position."""

    position: float
    brightness: float
    color: Color | None


class LightCurve:
    """Keyframes of one light, all colors in one space."""

    def __init__(self, entity_id: str, keyframes: list[Keyframe], space: str | None) -> None:
        """Initialize from sorted, filled keyframes."""
        if not keyframes:
            raise ValueError(f"{entity_id}: at least one keyframe is required")
        self.entity_id = entity_id
        self.keyframes = keyframes
        self.space = space
        self.positions = [kf.position for kf in keyframes]

    def state_at(self, position: float) -> LightState:
        """Return the state at a room position."""
        first = self.keyframes[0]
        if position <= 0:
            return LightState(0.0, first.color)
        if position <= first.position:
            return LightState(first.brightness, first.color)
        last = self.keyframes[-1]
        if position >= last.position:
            return LightState(last.brightness, last.color)
        index = bisect_right(self.positions, position) - 1
        start = self.keyframes[index]
        end = self.keyframes[index + 1]
        t = (position - start.position) / (end.position - start.position)
        brightness = start.brightness + (end.brightness - start.brightness) * t
        return LightState(brightness, interpolate_color(start.color, end.color, t))

    def breakpoints_between(self, start: float, end: float) -> list[float]:
        """Keyframe positions strictly between start and end, in travel order."""
        low, high = sorted((start, end))
        inner = [p for p in self.positions if low + _EPSILON < p < high - _EPSILON]
        return inner if end >= start else inner[::-1]


@dataclass(frozen=True, slots=True)
class StepInfo:
    """A configured step (used for buttons and markers)."""

    position: float
    name: str | None


class RoomCurve:
    """All light curves of one room."""

    def __init__(self, curves: dict[str, LightCurve], steps: list[StepInfo]) -> None:
        """Initialize."""
        self.curves = curves
        self.steps = steps

    @property
    def entity_ids(self) -> list[str]:
        """All lights that have a curve."""
        return list(self.curves)

    def states_at(self, position: float) -> dict[str, LightState]:
        """State of every light at a position."""
        return {eid: curve.state_at(position) for eid, curve in self.curves.items()}


def _parse_color(point: Mapping[str, Any]) -> Color | None:
    if point.get(POINT_KELVIN) is not None:
        return Color.from_kelvin(point[POINT_KELVIN])
    if point.get(POINT_RGB) is not None:
        return Color.from_rgb(point[POINT_RGB])
    if point.get(POINT_XY) is not None:
        return Color.from_xy(point[POINT_XY])
    return None


def build_room_curve(
    steps: Iterable[Mapping[str, Any]],
    light_options: Mapping[str, Mapping[str, Any]] | None = None,
) -> RoomCurve:
    """Build a room curve from normalized steps.

    ``steps`` is a list of ``{"position", "name", "lights": {entity_id: point}}``
    where a point has the optional keys ``brightness``, ``kelvin``, ``rgb``, ``xy``.
    """
    light_options = light_options or {}
    ordered = sorted(steps, key=lambda s: float(s["position"]))
    positions = [float(s["position"]) for s in ordered]
    if len(set(positions)) != len(positions):
        raise ValueError("Two steps use the same position")

    raw: dict[str, list[tuple[float, Mapping[str, Any]]]] = {}
    for step in ordered:
        for entity_id, point in step.get("lights", {}).items():
            raw.setdefault(entity_id, []).append((float(step["position"]), point))

    curves = {
        entity_id: _build_light_curve(
            entity_id,
            points,
            positions,
            light_options.get(entity_id, {}).get("color_mode", COLOR_MODE_AUTO),
        )
        for entity_id, points in raw.items()
    }
    return RoomCurve(curves, [StepInfo(float(s["position"]), s.get("name")) for s in ordered])


def _build_light_curve(
    entity_id: str,
    points: list[tuple[float, Mapping[str, Any]]],
    steps: list[float],
    color_mode: str,
) -> LightCurve:
    brightness: list[float | None] = [p.get(POINT_BRIGHTNESS) for _, p in points]
    colors: list[Color | None] = [_parse_color(p) for _, p in points]

    if brightness[0] is None:
        raise ValueError(f"{entity_id}: the first step with this light needs a brightness")
    for i in range(1, len(brightness)):
        if brightness[i] is None:
            brightness[i] = brightness[i - 1]

    for i in range(1, len(colors)):
        if colors[i] is None:
            colors[i] = colors[i - 1]
    first_color = next((c for c in colors if c is not None), None)
    colors = [c if c is not None else first_color for c in colors]

    space: str | None = None
    if first_color is not None:
        if color_mode == COLOR_MODE_COLOR:
            space = SPACE_XY
        elif color_mode == COLOR_MODE_WHITE:
            space = SPACE_CT
        else:
            space = SPACE_XY if any(c and c.space == SPACE_XY for c in colors) else SPACE_CT
        colors = [c.to_space(space) if c else None for c in colors]

    keyframes = [
        Keyframe(position, float(b), c)  # type: ignore[arg-type]
        for (position, _), b, c in zip(points, brightness, colors, strict=True)
    ]
    previous = [s for s in steps if s < keyframes[0].position - _EPSILON]
    keyframes.insert(0, Keyframe(previous[-1] if previous else 0.0, 0.0, keyframes[0].color))
    return LightCurve(entity_id, keyframes, space)


def sample_room(curve: RoomCurve, samples: int = 101) -> dict[str, list[list[float | int]]]:
    """Sample every light for display: ``[[brightness, r, g, b], ...]``."""
    result: dict[str, list[list[float | int]]] = {}
    for entity_id, light_curve in curve.curves.items():
        rows: list[list[float | int]] = []
        for i in range(samples):
            state = light_curve.state_at(100 * i / (samples - 1))
            rgb = state.color.as_rgb() if state.color else (255, 197, 143)
            rows.append([round(state.brightness, 1), *rgb])
        result[entity_id] = rows
    return result


def split_duration(duration: float, maximum: float) -> int:
    """Number of pieces needed so none is longer than ``maximum``."""
    if maximum <= 0 or duration <= maximum:
        return 1
    return math.ceil(duration / maximum - _EPSILON)
