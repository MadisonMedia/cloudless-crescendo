"""Sends light commands the way real networks need them.

Measured on a Thread network: a light that gets commands faster than it answers
drops the connection, and commands sent side by side can overtake each other, so
an off can arrive before the on it should follow. Therefore:

* One command per light is on its way at a time. The next one leaves after the answer.
* The newest value wins. A value that was never sent is simply replaced.
* Lights with the same command go out in one call, so they react nearly together.
* Commands per network are spaced, because the whole network shares its capacity.
* An off that meets a running transition cancels the transition first.
* After every command, the reported state is checked and the command is repeated if needed.
  Lights can answer a command and still ignore it, especially during a running transition.
"""

from __future__ import annotations

import asyncio
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, field
import logging
import time
from typing import Any

from homeassistant.const import ATTR_ENTITY_ID, STATE_OFF, STATE_ON
from homeassistant.core import Context, HomeAssistant, State, callback
from homeassistant.helpers.event import async_call_later

from .const import (
    DEFAULT_NETWORK_GAP,
    LEVEL_STABLE,
    LEVEL_TOLERANCE,
    LEVEL_WINDOW,
    NETWORK_GAP,
    SEND_RETRIES,
    VERIFY_DELAY,
    VERIFY_RETRIES,
)
from .planner import OFF, Command, minimum_command

_LOGGER = logging.getLogger(__name__)

CALL_TIMEOUT = 10.0


@dataclass(slots=True)
class LightStats:
    """What sending to one light looked like so far."""

    answers: int = 0
    failures: int = 0
    average_ms: float | None = None
    last_ms: float | None = None
    last_error: str | None = None
    repeats: int = 0

    def record(self, milliseconds: float) -> None:
        """Add an answered command; the average favors recent commands."""
        self.answers += 1
        self.last_ms = milliseconds
        self.average_ms = milliseconds if self.average_ms is None else self.average_ms * 0.8 + milliseconds * 0.2


@dataclass(slots=True)
class _Job:
    commands: tuple[Command, ...]
    retries: int = 0


@dataclass(slots=True)
class _Network:
    next_allowed: float = 0.0
    sent: deque[float] = field(default_factory=lambda: deque(maxlen=200))


class Sender:
    """Sends commands for one object."""

    def __init__(self, hass: HomeAssistant, network_of: Callable[[str], str], context: Context) -> None:
        """Initialize."""
        self.hass = hass
        self.context = context
        self._network_of = network_of
        self._pending: dict[str, _Job] = {}
        self._in_flight: set[str] = set()
        self._order: list[str] = []
        self._cursor = 0
        self._networks: dict[str, _Network] = {}
        self._wake = asyncio.Event()
        self._task: asyncio.Task | None = None
        self._calls: set[asyncio.Task] = set()
        self._cancel_verify: dict[str, Callable[[], None]] = {}
        self._verify_count: dict[str, int] = {}
        self._last_on: dict[str, tuple[Command, ...]] = {}
        self._level: dict[str, int] = {}
        self.stats: dict[str, LightStats] = {}
        self.transition_until: dict[str, float] = {}
        self.expected_on: dict[str, bool] = {}
        self.last_send: dict[str, float] = {}
        self.closed = False

    def stats_for(self, entity_id: str) -> LightStats:
        """Return the statistics of a light."""
        return self.stats.setdefault(entity_id, LightStats())

    def rate(self, entity_id: str) -> int:
        """Return the commands sent during the last second on a light's network."""
        network = self._networks.get(self._network_of(entity_id))
        if network is None:
            return 0
        now = time.monotonic()
        return sum(1 for t in network.sent if now - t <= 1.0)

    def send(self, entity_id: str, commands: tuple[Command, ...], transition: float = 0.0) -> None:
        """Queue commands for a light, replacing whatever has not left yet."""
        if self.closed:
            return
        turns_on = any(c.service == "turn_on" for c in commands)
        turns_off = commands[-1].service == "turn_off"
        self.expected_on[entity_id] = not turns_off and (turns_on or self.expected_on.get(entity_id, False))
        now = time.monotonic()
        if turns_off and self.transition_until.get(entity_id, 0.0) > now:
            # An off can bounce off a running transition, so end the transition first.
            commands = (minimum_command(None), OFF)
        if transition > 0:
            self.transition_until[entity_id] = now + transition
        elif turns_off or turns_on:
            self.transition_until.pop(entity_id, None)
        if turns_on and not turns_off:
            self._last_on[entity_id] = commands
        levels = [c.as_dict()["brightness"] for c in commands if "brightness" in c.as_dict()]
        if turns_off:
            self._level.pop(entity_id, None)
        elif levels:
            self._level[entity_id] = levels[-1]
        self.last_send[entity_id] = now
        self._verify_count.pop(entity_id, None)
        self._pending[entity_id] = _Job(commands)
        if entity_id not in self._order:
            self._order.append(entity_id)
        self._wake.set()
        if self._task is None or self._task.done():
            self._task = self.hass.async_create_background_task(self._run(), "cloudless_crescendo sender")

    def forget(self, entity_id: str) -> None:
        """Drop what is queued for a light and stop checking it."""
        self._pending.pop(entity_id, None)
        self.expected_on.pop(entity_id, None)
        self.transition_until.pop(entity_id, None)
        self._level.pop(entity_id, None)
        cancel = self._cancel_verify.pop(entity_id, None)
        if cancel is not None:
            cancel()

    def _next_ready(self) -> str | None:
        count = len(self._order)
        for offset in range(count):
            eid = self._order[(self._cursor + offset) % count]
            if eid in self._pending and eid not in self._in_flight:
                self._cursor = (self._cursor + offset + 1) % count
                return eid
        return None

    async def _run(self) -> None:
        while not self.closed:
            # Let everything queued in this moment arrive, so that equal commands can share a call.
            await asyncio.sleep(0)
            eid = self._next_ready()
            if eid is None:
                if not self._pending and not self._in_flight:
                    return
                self._wake.clear()
                await self._wake.wait()
                continue
            network_name = self._network_of(eid)
            network = self._networks.setdefault(network_name, _Network())
            wait = network.next_allowed - time.monotonic()
            if wait > 0:
                await asyncio.sleep(wait)
                if eid not in self._pending or eid in self._in_flight:
                    continue
            job = self._pending[eid]
            group = [
                other
                for other, other_job in self._pending.items()
                if other not in self._in_flight
                and other_job.commands == job.commands
                and self._network_of(other) == network_name
            ]
            for member in group:
                del self._pending[member]
                self._in_flight.add(member)
            now = time.monotonic()
            gap = NETWORK_GAP.get(network_name, DEFAULT_NETWORK_GAP)
            network.next_allowed = now + gap * len(group) * max(1, len(job.commands))
            network.sent.extend([now] * (len(group) * len(job.commands)))
            task = self.hass.async_create_background_task(self._call(group, job), "cloudless_crescendo command")
            self._calls.add(task)
            task.add_done_callback(self._calls.discard)

    async def _call(self, group: list[str], job: _Job) -> None:
        error: str | None = None
        started = time.monotonic()
        try:
            for command in job.commands:
                data: dict[str, Any] = {ATTR_ENTITY_ID: group, **command.as_dict()}
                await asyncio.wait_for(
                    self.hass.services.async_call("light", command.service, data, blocking=True, context=self.context),
                    CALL_TIMEOUT,
                )
        except Exception as err:
            error = f"{type(err).__name__}: {err}"
            _LOGGER.warning("Command for %s failed: %s", ", ".join(group), error)
        elapsed = (time.monotonic() - started) * 1000 / max(1, len(job.commands))
        for eid in group:
            self._in_flight.discard(eid)
            stats = self.stats_for(eid)
            if error is None:
                stats.record(elapsed)
                self._schedule_verify(eid)
            else:
                stats.failures += 1
                stats.last_error = error
                if job.retries < SEND_RETRIES and eid not in self._pending and not self.closed:
                    self._pending[eid] = _Job(job.commands, job.retries + 1)
        self._wake.set()
        if self._pending and (self._task is None or self._task.done()) and not self.closed:
            self._task = self.hass.async_create_background_task(self._run(), "cloudless_crescendo sender")

    def _schedule_verify(self, entity_id: str, delay: float = VERIFY_DELAY) -> None:
        cancel = self._cancel_verify.pop(entity_id, None)
        if cancel is not None:
            cancel()

        @callback
        def _check(_now: Any) -> None:
            self._cancel_verify.pop(entity_id, None)
            self._verify(entity_id)

        self._cancel_verify[entity_id] = async_call_later(self.hass, delay, _check)

    @callback
    def _verify(self, entity_id: str) -> None:
        if self.closed or entity_id in self._pending or entity_id in self._in_flight:
            return
        expected = self.expected_on.get(entity_id)
        state = self.hass.states.get(entity_id)
        if expected is None or state is None or state.state not in (STATE_ON, STATE_OFF):
            return
        if (state.state == STATE_ON) != expected:
            self._repeat(entity_id, self._last_on.get(entity_id) if expected else (OFF,))
        elif expected:
            self._verify_level(entity_id, state)

    def _verify_level(self, entity_id: str, state: State) -> None:
        wanted = self._level.get(entity_id)
        reported = state.attributes.get("brightness")
        if wanted is None or reported is None or abs(reported - wanted) <= LEVEL_TOLERANCE:
            return
        now = time.monotonic()
        ends = self.transition_until.get(entity_id, 0.0)
        if now > max(ends, self.last_send.get(entity_id, 0.0)) + LEVEL_WINDOW:
            return
        if now < ends or time.time() - state.last_updated_timestamp < LEVEL_STABLE:
            self._schedule_verify(entity_id, max(VERIFY_DELAY, ends - now))
            return
        self._repeat(entity_id, self._last_on.get(entity_id))

    def _repeat(self, entity_id: str, commands: tuple[Command, ...] | None) -> None:
        count = self._verify_count.get(entity_id, 0)
        if count >= VERIFY_RETRIES:
            _LOGGER.warning("%s does not follow the commands it answers", entity_id)
            return
        if commands is None:
            return
        self._verify_count[entity_id] = count + 1
        self.stats_for(entity_id).repeats += 1
        _LOGGER.debug("Repeating command for %s, attempt %s", entity_id, count + 1)
        self._pending[entity_id] = _Job(commands)
        self._wake.set()
        if self._task is None or self._task.done():
            self._task = self.hass.async_create_background_task(self._run(), "cloudless_crescendo sender")

    async def async_close(self) -> None:
        """Stop sending."""
        self.closed = True
        self._pending.clear()
        for cancel in self._cancel_verify.values():
            cancel()
        self._cancel_verify.clear()
        self._wake.set()
        if self._task is not None and not self._task.done():
            await self._task
