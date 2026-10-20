import json
from importlib import resources

import pytest

from geopolitica_engine.models import Footprint

AS_OF = "2026-10-19"


@pytest.fixture(scope="session")
def nordwerk_json() -> dict:
    text = resources.files("geopolitica_engine").joinpath("data/examples/nordwerk.json").read_text(encoding="utf-8")
    return json.loads(text)


@pytest.fixture(scope="session")
def nordwerk(nordwerk_json) -> Footprint:
    return Footprint.model_validate(nordwerk_json)


@pytest.fixture(scope="session")
def templates() -> dict[str, bytes]:
    base = resources.files("geopolitica_engine").joinpath("data/templates")
    return {name: base.joinpath(f"{name}.csv").read_bytes() for name in ("suppliers", "parts", "lanes", "sites")}
