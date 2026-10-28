"""Make sure the shipped examples stay valid."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from custom_components.cloudless_crescendo.light import PLATFORM_SCHEMA

EXAMPLES = sorted((Path(__file__).parent.parent / "examples").glob("*.yaml"))


@pytest.mark.parametrize("path", EXAMPLES, ids=lambda p: p.name)
def test_example_is_valid(path: Path) -> None:
    entries = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert entries
    for entry in entries:
        PLATFORM_SCHEMA(entry)
