"""Curve model for Cloudless Crescendo.

A room has one position axis from 0 to 100. Every controlled light has its
own list of keyframes on that axis (brightness and optionally a color).
Between keyframes values are interpolated linearly:

* brightness linearly in percent,
* color temperature linearly in mireds,
* everything else (RGB, or RGB <-> color temperature) linearly in CIE xy.

These are the same spaces a light uses for its own transitions, so a fade
from one keyframe to the next with a single ``transition`` produces exactly
the curve described here.

Rules that make configuration intuitive:

* Position 0 is always "everything off".
* A light that first appears at a step starts fading in at the *previous*
  step (or at 0). This is what produces the staggered effect.
* After its last keyframe a light holds its value up to 100.
* A keyframe without brightness keeps the previous brightness; a keyframe
  without color keeps the previous color (or takes the first one defined).

This module is pure Python apart from Home Assistant's color helpers, so it
can be unit tested without a running instance.
"""

from __future__ import annotations

from bisect import bisect_right
from dataclasses import dataclass
import math

from homeassistant.util import color as color_util

MODE_CT = "ct"
MODE_XY = "xy"

_EPSILON = 1e-6


@dataclass(frozen=True, slots=True)
class Color:
    """A light color, either a color temperature or a CIE xy point."""

    mode: str
    kelvin: float | None = None
    xy: tuple[float, float] | None = None

    @classmethod
    def from_kelvin(cls, kelvin: float) -> Color:
        """Create a color temperature color."""
        return cls(mode=MODE_CT, kelvin=float(kelvin))

    @classmethod
    def from_rgb(cls, rgb: tuple[int, int, int]) -> Color:
        """Create a color from an RGB triple (brightness is ignored)."""
        x, y = color_util.color_RGB_to_xy(*rgb)
        return cls(mode=MODE_XY, xy=(x, y))

    @classmethod
    def from_xy(cls, xy: tuple[float, float]) -> Color:
        """Create a color from a CIE xy point."""
        return cls(mode=MODE_XY, xy=(float(xy[0]), float(xy[1])))

    def as_xy(self) -> tuple[float, float]:
        """Return the color as CIE xy."""
        if self.mode == MODE_XY:
            assert self.xy is not None
            return self.xy
        assert self.kelvin is not None
        rgb = color_util.color_temperature_to_rgb(self.kelvin)
        return color_util.color_RGB_to_xy(*(round(c) for c in rgb))

    def is_close(self, other: Color | None) -> bool:
        """Return True if both colors are practically identical."""
        if other is None or other.mode != self.mode:
            return False
        if self.mode == MODE_CT:
            assert self.kelvin is not None and other.kelvin is not None
            return abs(self.kelvin - other.kelvin) < 1
        ax, ay = self.as_xy()
        bx, by = other.as_xy()
        return abs(ax - bx) < 0.0005 and abs(ay - by) < 0.0005


def interpolate_color(start: Color | None, end: Color | None, t: float) -> Color | None:
    """Interpolate between two colors at fraction ``t`` (0..1)."""
    if start is None or end is None:
        return end if start is None else start
    if t <= _EPSILON:
        return start
    if t >= 1 - _EPSILON:
        return end
    if start.mode == MODE_CT and end.mode == MODE_CT:
        assert start.kelvin is not None and end.kelvin is not None
        mired_a = 1_000_000 / start.kelvin
        mired_b = 1_000_000 / end.kelvin
        return Color.from_kelvin(1_000_000 / (mired_a + (mired_b - mired_a) * t))
    ax, ay = start.as_xy()
    bx, by = end.as_xy()
    return Color.from_xy((ax + (bx - ax) * t, ay + (by - ay) * t))


@dataclass(frozen=True, slots=True)
class LightState:
    """Target state of a single light at one position."""

    brightness: float
    """Brightness in percent (0..100). 0 means off."""

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
    """A light's state at a position on the room axis."""

    position: float
    brightness: float
    color: Color | None


class LightCurve:
    """The keyframes of one light."""

    def __init__(self, entity_id: str, keyframes: list[Keyframe]) -> None:
        """Initialize from sorted, fully filled keyframes."""
        if not keyframes:
            raise ValueError(f"{entity_id}: at least one keyframe is required")
        self.entity_id = entity_id
        self.keyframes = keyframes
        self._positions = [kf.position for kf in keyframes]

    @property
    def positions(self) -> list[float]:
        """Positions of all keyframes."""
        return self._positions

    def state_at(self, position: float) -> LightState:
        """Return the light state at a room position."""
        first = self.keyframes[0]
        if position <= 0:
            return LightState(0.0, first.color)
        if position <= first.position:
            return LightState(first.brightness, first.color)
        last = self.keyframes[-1]
        if position >= last.position:
            return LightState(last.brightness, last.color)

        index = bisect_right(self._positions, position) - 1
        start = self.keyframes[index]
        end = self.keyframes[index + 1]
        t = (position - start.position) / (end.position - start.position)
        brightness = start.brightness + (end.brightness - start.brightness) * t
        return LightState(brightness, interpolate_color(start.color, end.color, t))


@dataclass(frozen=True, slots=True)
class Segment:
    """One leg of a fade between two room positions."""

    start: float
    end: float
    duration: float


class RoomCurve:
    """All light curves of one room."""

    def __init__(self, curves: dict[str, LightCurve], steps: list[float]) -> None:
        """Initialize the room curve."""
        self.curves = curves
        self.steps = steps
        breakpoints: set[float] = set()
        for curve in curves.values():
            breakpoints.update(curve.positions)
        self.breakpoints = sorted(breakpoints)

    @property
    def entity_ids(self) -> list[str]:
        """Return all controlled lights."""
        return list(self.curves)

    def states_at(self, position: float) -> dict[str, LightState]:
        """Return the state of every light at a position."""
        return {eid: curve.state_at(position) for eid, curve in self.curves.items()}

    def plan(
        self,
        start: float,
        target: float,
        duration: float,
        max_segment: float,
    ) -> list[Segment]:
        """Split a fade into segments that end on every keyframe in between.

        Within a segment every light changes linearly, so one command with a
        matching transition per light reproduces the curve exactly. Long
        segments are additionally split into pieces of at most
        ``max_segment`` seconds so a fade can be interrupted cleanly and the
        slider keeps moving.
        """
        duration = max(0.0, duration)
        distance = abs(target - start)
        if distance < _EPSILON:
            return [Segment(start, target, duration)]

        low, high = sorted((start, target))
        inner = [p for p in self.breakpoints if low + _EPSILON < p < high - _EPSILON]
        if target < start:
            inner.reverse()

        segments: list[Segment] = []
        previous = start
        for point in [*inner, target]:
            seg_duration = duration * abs(point - previous) / distance
            pieces = 1
            if max_segment > 0 and seg_duration > max_segment:
                pieces = math.ceil(seg_duration / max_segment - _EPSILON)
            for i in range(pieces):
                seg_start = previous + (point - previous) * i / pieces
                seg_end = previous + (point - previous) * (i + 1) / pieces
                segments.append(Segment(seg_start, seg_end, seg_duration / pieces))
            previous = point
        return segments


def build_room_curve(steps: dict[float, dict[str, dict]]) -> RoomCurve:
    """Build a room curve from validated configuration.

    ``steps`` maps a position (0 < p <= 100) to a mapping of light entity IDs
    to dicts with the optional keys ``brightness`` (percent), ``kelvin``,
    ``rgb`` and ``xy``.
    """
    positions = sorted(float(p) for p in steps)
    raw_points: dict[str, list[tuple[float, dict]]] = {}
    for position in positions:
        for entity_id, point in steps[_find_key(steps, position)].items():
            raw_points.setdefault(entity_id, []).append((position, point))

    curves: dict[str, LightCurve] = {}
    for entity_id, points in raw_points.items():
        curves[entity_id] = _build_light_curve(entity_id, points, positions)
    return RoomCurve(curves, positions)


def _find_key(steps: dict, position: float):
    """Find the original key of a position (keys may be int or float)."""
    for key in steps:
        if float(key) == position:
            return key
    raise KeyError(position)


def _parse_color(point: dict) -> Color | None:
    if point.get("kelvin") is not None:
        return Color.from_kelvin(point["kelvin"])
    if point.get("rgb") is not None:
        return Color.from_rgb(tuple(point["rgb"]))
    if point.get("xy") is not None:
        return Color.from_xy(tuple(point["xy"]))
    return None


def _build_light_curve(
    entity_id: str, points: list[tuple[float, dict]], steps: list[float]
) -> LightCurve:
    """Turn raw points of one light into filled keyframes."""
    brightness: list[float | None] = [p.get("brightness") for _, p in points]
    colors: list[Color | None] = [_parse_color(p) for _, p in points]

    if brightness[0] is None:
        raise ValueError(f"{entity_id}: the first step that mentions this light needs a brightness")
    for i in range(1, len(brightness)):
        if brightness[i] is None:
            brightness[i] = brightness[i - 1]

    # Forward fill colors, then back fill leading gaps with the first color.
    for i in range(1, len(colors)):
        if colors[i] is None:
            colors[i] = colors[i - 1]
    first_color = next((c for c in colors if c is not None), None)
    colors = [c if c is not None else first_color for c in colors]

    keyframes = [
        Keyframe(position, float(b), c)  # type: ignore[arg-type]
        for (position, _), b, c in zip(points, brightness, colors, strict=True)
    ]

    # The light fades in starting at the step before its first appearance.
    first_position = keyframes[0].position
    previous_steps = [s for s in steps if s < first_position - _EPSILON]
    fade_in_from = previous_steps[-1] if previous_steps else 0.0
    keyframes.insert(0, Keyframe(fade_in_from, 0.0, keyframes[0].color))

    return LightCurve(entity_id, keyframes)
