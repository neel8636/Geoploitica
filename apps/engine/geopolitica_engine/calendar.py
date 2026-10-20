"""Change calendar: loads data/changes.json once and answers date/filter queries."""

from __future__ import annotations

import datetime as dt
import json
from importlib import resources

from pydantic import TypeAdapter

from .models import Change

_CHANGES_ADAPTER = TypeAdapter(list[Change])


def _load_changes() -> list[Change]:
    raw = resources.files("geopolitica_engine").joinpath("data/changes.json").read_text(encoding="utf-8")
    changes = _CHANGES_ADAPTER.validate_python(json.loads(raw))
    ids = [c.id for c in changes]
    if len(ids) != len(set(ids)):
        dupes = sorted({i for i in ids if ids.count(i) > 1})
        raise ValueError(f"duplicate change ids in changes.json: {dupes}")
    return changes


CHANGES: list[Change] = _load_changes()
_BY_ID: dict[str, Change] = {c.id: c for c in CHANGES}


def parse_date(value: str | dt.date | None) -> dt.date | None:
    if value is None:
        return None
    if isinstance(value, dt.date):
        return value
    return dt.date.fromisoformat(value)


def anchor_date(change: Change) -> dt.date | None:
    """The date a change is counted from: effective_date, else window_start."""
    if change.effective_date:
        return parse_date(change.effective_date)
    if change.window_start:
        return parse_date(change.window_start)
    return None


def sort_key(change: Change) -> tuple[int, dt.date, str]:
    """effective_date ascending; undated changes fall back to window_start, then go last."""
    if change.effective_date:
        return (0, parse_date(change.effective_date), change.id)
    if change.window_start:
        return (0, parse_date(change.window_start), change.id)
    return (1, dt.date.max, change.id)


def days_until(change: Change, as_of: str | dt.date) -> int | None:
    """Days from as_of to effective_date, else to window_start, else None.

    Negative when the anchor is in the past, except that a `developing` change whose
    window has already opened returns 0 (it is happening now).
    """
    as_of_d = parse_date(as_of)
    assert as_of_d is not None
    anchor = anchor_date(change)
    if anchor is None:
        return None
    delta = (anchor - as_of_d).days
    if change.status == "developing" and not change.effective_date and delta < 0:
        return 0
    return delta


def get_changes(
    from_date: str | dt.date | None = None,
    to_date: str | dt.date | None = None,
    type: str | None = None,
    country: str | None = None,
) -> list[Change]:
    """Filter the calendar. Date filters apply to the change's anchor date
    (effective_date, else window_start); undated changes pass date filters."""
    f = parse_date(from_date)
    t = parse_date(to_date)
    cc = country.upper() if country else None
    out: list[Change] = []
    for c in CHANGES:
        if type and c.type != type:
            continue
        if cc and cc not in c.all_countries:
            continue
        a = anchor_date(c)
        if a is not None:
            if f and a < f:
                continue
            if t and a > t:
                continue
        out.append(c)
    return sorted(out, key=sort_key)


def get_change(id: str) -> Change | None:
    return _BY_ID.get(id)
