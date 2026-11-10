"""Turns a fade into commands per light.

In the default mode a light fades by itself: one command per stop-to-stop leg
with a matching transition. Three findings from real lights shape the plan:

* A light switched on from off first jumps to the level it stored. So it first
  goes to the minimum in its target color, without a transition.
* An off during a running transition can be ignored, and a transition ignores
  the off. So a light fades to its minimum and switches off after a margin.
* Lights in "on time" mode get short steps without a transition. Some lights dim
  too slowly by themselves to keep a short fade's time.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
import itertools
import math
from typing import Any

from .const import (
    FADE_ONTIME,
    MAX_NATIVE_TRANSITION,
    MIN_BRIGHTNESS,
    MODE_ONOFF,
    OFF_MARGIN,
    SETTLE_TRANSITION,
)
from .curve import LightCurve, ObjectCurve, Target, brightness_255

_EPSILON = 1e-6


@dataclass(frozen=True, slots=True)
class Command:
    """One light action, without its target."""

    service: str
    data: tuple[tuple[str, Any], ...] = ()

    def as_dict(self) -> dict[str, Any]:
        """Return the service data."""
        return dict(self.data)


OFF = Command("turn_off")


@dataclass(order=True, slots=True)
class Step:
    """Commands for one light at a time after the fade's start."""

    time: float
    entity_id: str = field(compare=False)
    commands: tuple[Command, ...] = field(compare=False)
    target: Target | None = field(compare=False, default=None)
    """The state this step leads to, for later comparison."""

    transition: float = field(compare=False, default=0.0)


def _color_items(target: Target) -> list[tuple[str, Any]]:
    if target.kelvin is not None:
        return [("color_temp_kelvin", round(target.kelvin))]
    if target.xy is not None:
        return [("xy_color", (round(target.xy[0], 4), round(target.xy[1], 4)))]
    return []


def on_command(target: Target, transition: float = 0.0, *, color: bool = True) -> Command:
    """Build a turn_on for a target."""
    items: list[tuple[str, Any]] = [("brightness", brightness_255(target.brightness))]
    if color:
        items += _color_items(target)
    transition = round(max(0.0, transition), 1)
    if transition > 0:
        items.append(("transition", transition))
    return Command("turn_on", tuple(items))


def color_command(target: Target, transition: float = 0.0) -> Command | None:
    """Build a turn_on that changes only the color and keeps the brightness, or None for a light without color."""
    items = _color_items(target)
    if not items:
        return None
    transition = round(max(0.0, transition), 1)
    if transition > 0:
        items.append(("transition", transition))
    return Command("turn_on", tuple(items))


def minimum_command(color_from: Target | None, transition: float = 0.0) -> Command:
    """Build a turn_on to the lowest level, optionally setting the color."""
    items: list[tuple[str, Any]] = [("brightness", MIN_BRIGHTNESS)]
    if color_from is not None:
        items += _color_items(color_from)
    transition = round(max(0.0, transition), 1)
    if transition > 0:
        items.append(("transition", transition))
    return Command("turn_on", tuple(items))


def _pieces(duration: float) -> int:
    return max(1, math.ceil(duration / MAX_NATIVE_TRANSITION - _EPSILON))


def _plan_soft(curve: LightCurve, legs: list[tuple[float, float, float, float]], lit: bool) -> list[Step]:
    eid = curve.entity_id
    steps: list[Step] = []
    for index, (pa, pb, ta, tb) in enumerate(legs):
        sa, sb = curve.at(pa), curve.at(pb)
        if sa.is_close(sb):
            continue
        dt = tb - ta
        if sb.is_on:
            commands: list[Command] = []
            with_color = not sa.same_color(sb)
            if not lit:
                commands.append(minimum_command(sb))
                with_color = False
                lit = True
            commands.append(on_command(sb, dt, color=with_color))
            steps.append(Step(ta, eid, tuple(commands), sb, dt))
            continue
        if not lit:
            continue
        # Fade out to the minimum, then switch off, unless the next leg goes right back up.
        steps.append(Step(ta, eid, (minimum_command(None, dt),), sb, dt))
        next_on = index + 1 < len(legs) and curve.at(legs[index + 1][1]).is_on
        if not next_on:
            steps.append(Step(tb + OFF_MARGIN, eid, (OFF,), sb))
            lit = False
    return steps


def _plan_ontime(curve: LightCurve, legs: list[tuple[float, float, float, float]], lit: bool) -> list[Step]:
    eid = curve.entity_id
    steps: list[Step] = []
    for pa, pb, ta, tb in legs:
        sa, sb = curve.at(pa), curve.at(pb)
        if sa.is_close(sb):
            continue
        count = max(1, math.ceil((tb - ta) * curve.steps))
        for i in range(1, count + 1):
            state = curve.at(pa + (pb - pa) * i / count)
            time = ta + (tb - ta) * (i - 1) / count
            if state.is_on:
                steps.append(Step(time, eid, (on_command(state),), state))
                lit = True
            elif lit:
                steps.append(Step(time, eid, (OFF,), state))
                lit = False
    return steps


def _plan_onoff(curve: LightCurve, legs: list[tuple[float, float, float, float]], lit: bool) -> list[Step]:
    eid = curve.entity_id
    steps: list[Step] = []
    for pa, pb, ta, tb in legs:
        sa, sb = curve.at(pa), curve.at(pb)
        if sa.is_on == sb.is_on:
            continue
        # A switch changes when its stop is reached, so upward at the leg's end, downward at its start.
        time = tb if pb > pa else ta
        if sb.is_on:
            steps.append(Step(time, eid, (Command("turn_on"),), sb))
            lit = True
        elif lit:
            steps.append(Step(time, eid, (OFF,), sb))
            lit = False
    return steps


def _legs(
    positions: list[float], start: float, target: float, duration: float
) -> list[tuple[float, float, float, float]]:
    """Split a fade at the stops; legs beyond the transition limit are split further."""
    distance = abs(target - start)
    if distance < _EPSILON:
        return []
    low, high = sorted((start, target))
    inner = [p for p in positions if low + _EPSILON < p < high - _EPSILON]
    points = [start, *(inner if target > start else inner[::-1]), target]
    legs: list[tuple[float, float, float, float]] = []
    for a, b in itertools.pairwise(points):
        ta = duration * abs(a - start) / distance
        tb = duration * abs(b - start) / distance
        count = _pieces(tb - ta)
        legs.extend(
            (
                a + (b - a) * i / count,
                a + (b - a) * (i + 1) / count,
                ta + (tb - ta) * i / count,
                ta + (tb - ta) * (i + 1) / count,
            )
            for i in range(count)
        )
    return legs


def plan_fade(
    curve: ObjectCurve,
    start: float,
    target: float,
    duration: float,
    *,
    lit: Mapping[str, bool],
    last: Mapping[str, Target | None] | None = None,
    skip: Mapping[str, Any] | None = None,
) -> list[Step]:
    """Plan all commands for moving from ``start`` to ``target``.

    ``lit`` says which lights are on now. ``last`` holds what each light was last
    told to reach: a light whose first leg starts later than the fade's start, or
    never comes, is first brought to where the curve says it belongs. ``skip``
    holds lights that a person has taken out of the object for now.
    """
    duration = max(0.0, duration)
    last = last or {}
    skip = skip or {}
    if duration <= 0:
        return settle(curve, target, lit, SETTLE_TRANSITION if abs(target - start) < 1 else 0.0, skip=skip)
    legs = _legs(curve.positions, start, target, duration)
    steps: list[Step] = []
    for eid, light in curve.lights.items():
        if eid in skip:
            continue
        is_lit = bool(lit.get(eid))
        if light.mode == MODE_ONOFF:
            planned = _plan_onoff(light, legs, is_lit)
        elif light.fade == FADE_ONTIME:
            planned = _plan_ontime(light, legs, is_lit)
        else:
            planned = _plan_soft(light, legs, is_lit)
        steps.extend(planned)
        # An interrupted transition keeps running unless a command replaces it.
        begins_now = any(step.time < 0.05 for step in planned)
        if not begins_now:
            here = light.at(start)
            before = last.get(eid)
            mismatch = (before is not None and not before.is_close(here)) or (is_lit != here.is_on)
            if mismatch:
                steps.extend(_settle_light(light, start, is_lit, SETTLE_TRANSITION))
    steps.sort()
    return steps


def _settle_light(light: LightCurve, position: float, lit: bool, transition: float) -> list[Step]:
    state = light.at(position)
    eid = light.entity_id
    if state.is_on:
        if light.mode == MODE_ONOFF:
            return [Step(0.0, eid, (Command("turn_on"),), state)]
        if not lit:
            return [
                Step(0.0, eid, (minimum_command(state), on_command(state, transition, color=False)), state, transition)
            ]
        return [Step(0.0, eid, (on_command(state, transition),), state, transition)]
    if lit:
        return [Step(0.0, eid, (OFF,), state)]
    return []


def settle(
    curve: ObjectCurve,
    position: float,
    lit: Mapping[str, bool],
    transition: float,
    *,
    skip: Mapping[str, Any] | None = None,
) -> list[Step]:
    """Put every light directly at its state for a position."""
    skip = skip or {}
    steps: list[Step] = []
    for eid, light in curve.lights.items():
        if eid not in skip:
            steps.extend(_settle_light(light, position, bool(lit.get(eid)), transition))
    return steps
