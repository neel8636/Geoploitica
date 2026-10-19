"""Rule-based department briefs. No LLM in the request path."""

from __future__ import annotations

import datetime as dt
from collections import defaultdict

from .calendar import days_until, parse_date
from .models import DEPARTMENTS, BriefItem, Change, Department, DepartmentBrief, Exposure, Footprint

MAX_ITEMS = 10
HEADLINE_MAX = 90

OWNER_ROLE: dict[str, str] = {
    "procurement": "Category manager",
    "logistics": "Transport planner",
    "production": "Planning lead",
    "finance": "FP&A lead",
    "compliance": "Trade compliance lead",
    "sustainability": "ESG lead",
    "sales": "Commercial lead",
    "hr": "HR business partner",
    "leadership": "COO",
}

_ITEM_NOUN = {
    "supplier": ("supplier", "suppliers"),
    "part": ("part", "parts"),
    "lane": ("lane", "lanes"),
    "site": ("site", "sites"),
    "market": ("sales market", "sales markets"),
}
_ITEM_ORDER = ("supplier", "part", "lane", "site", "market")
_VALUE_WORD = {"supplier": "spend", "part": "volume"}

# Lead time (days before effective_date) by which the first action should be done.
_LEAD_DAYS = {
    "regulation": 45,
    "tariff": 45,
    "sanction": 30,
    "export_control": 30,
    "election": 30,
    "sovereign_stress": 7,
    "fx": 7,
    "strike": 7,
    "unrest": 7,
    "chokepoint": 14,
    "energy_price": 14,
    "conflict": 14,
    "weather": 7,
}


def fmt_money(amount: float, currency: str) -> str:
    a = abs(amount)
    if a >= 1_000_000_000:
        s = f"{amount / 1_000_000_000:.1f}B"
    elif a >= 1_000_000:
        s = f"{amount / 1_000_000:.1f}M"
    elif a >= 1_000:
        s = f"{amount / 1_000:.0f}k"
    else:
        s = f"{amount:.0f}"
    return f"{currency} {s}"


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def headline(change: Change, exposures: list[Exposure]) -> str:
    counts = _count_by_type(exposures)
    parts = [f"{n} {_ITEM_NOUN[t][0 if n == 1 else 1]}" for t, n in counts]
    hit = ", ".join(parts[:2])
    text = f"{change.title}: {hit} exposed"
    if len(text) > HEADLINE_MAX:
        text = f"{change.title}: {sum(n for _, n in counts)} items exposed"
    if len(text) > HEADLINE_MAX:
        text = _truncate(change.title, HEADLINE_MAX)
    return text


def _count_by_type(exposures: list[Exposure]) -> list[tuple[str, int]]:
    seen: dict[str, set[str]] = defaultdict(set)
    for e in exposures:
        seen[e.item_type].add(e.item_id)
    return [(t, len(seen[t])) for t in _ITEM_ORDER if seen.get(t)]


def your_exposure(exposures: list[Exposure], currency: str) -> str:
    """e.g. '3 suppliers (EUR 1.2M spend), 2 parts (EUR 400k volume), 1 lane'."""
    by_type: dict[str, dict[str, Exposure]] = defaultdict(dict)
    for e in exposures:
        by_type[e.item_type].setdefault(e.item_id, e)
    chunks: list[str] = []
    for t in _ITEM_ORDER:
        items = by_type.get(t)
        if not items:
            continue
        n = len(items)
        chunk = f"{n} {_ITEM_NOUN[t][0 if n == 1 else 1]}"
        values = [e.value_at_risk for e in items.values() if e.value_at_risk is not None]
        if values and t in _VALUE_WORD:
            chunk += f" ({fmt_money(sum(values), currency)} {_VALUE_WORD[t]})"
        chunks.append(chunk)
    return ", ".join(chunks) if chunks else "No direct footprint match"


def cost_if_unprepared(change: Change, exposures: list[Exposure], currency: str) -> str:
    var = sum(e.value_at_risk or 0 for e in exposures)
    var_txt = f" on about {fmt_money(var, currency)} of spend and volume" if var else ""
    t = change.type
    if t in ("tariff", "regulation"):
        return (
            f"Duties, border holds and fines{var_txt}: shipments without the required paperwork "
            f"are stopped at the border and non-compliance penalties apply."
        )
    if t in ("sanction", "export_control"):
        return (
            f"Blocked transactions and licence refusals{var_txt}; penalties for dealing with "
            f"restricted parties or goods."
        )
    if t in ("chokepoint", "energy_price", "conflict"):
        return (
            f"7-14 extra transit days per voyage, war-risk and fuel surcharges, and spot-rate "
            f"premiums on the exposed lanes{var_txt}."
        )
    if t in ("strike", "unrest"):
        return (
            f"Missed shipments on the affected days, temporary site closures and overtime to "
            f"recover output{var_txt}."
        )
    if t in ("sovereign_stress", "fx"):
        return (
            f"Higher financing cost and wider hedging spreads on exposed currency and "
            f"counterparties{var_txt}; receivables and contract values move with the market."
        )
    if t == "election":
        return (
            f"Policy uncertainty: tariff, budget and regulatory direction can change after the vote, "
            f"re-pricing long-dated contracts{var_txt}."
        )
    if t == "weather":
        return f"Delayed or lost shipments and site downtime{var_txt}."
    return f"Disruption to the exposed items{var_txt}."


# Words that mark an action as belonging to a department. The best-matching line of what_to_do
# becomes that department's next action; the first line is the fallback.
_ACTION_WORDS: dict[str, tuple[str, ...]] = {
    "procurement": ("supplier", "source", "sourcing", "alternative", "negotiat", "category", "contract"),
    "logistics": ("lane", "shipment", "ship", "route", "rerout", "buffer", "carrier", "port", "customs", "transit", "lead time", "rail", "border hold"),
    "production": ("stock", "cover", "lead time", "parts", "line", "build", "capacity", "shift"),
    "finance": ("budget", "cost", "hedge", "financ", "pass the cost", "certificate", "bond", "spread", "borrow", "surcharge clause", "clauses"),
    "compliance": ("file", "statement", "obligation", "evidence", "due-diligence", "due diligence", "clause", "qualif", "reference number", "ledger", "paperwork"),
    "sustainability": ("emission", "data", "origin", "geolocation", "deforestation", "declaration"),
    "sales": ("customer", "price", "pricing", "market", "export", "demand"),
    "hr": ("staff", "travel", "site", "safety", "shift", "remote", "warn"),
    "leadership": ("scenario", "plan", "review", "policy"),
}


def pick_action(change: Change, department: str) -> str:
    lines = change.what_to_do or ["Review exposure with the owning team."]
    words = _ACTION_WORDS.get(department, ())
    best, best_hits = lines[0], 0
    for line in lines:
        low = line.lower()
        hits = sum(1 for w in words if w in low)
        if hits > best_hits:
            best, best_hits = line, hits
    return best


def next_action(change: Change, as_of: dt.date, days: int | None, department: str = "leadership") -> str:
    base = pick_action(change, department).rstrip(".")
    if change.effective_date:
        eff = parse_date(change.effective_date)
        assert eff is not None
        lead = _LEAD_DAYS.get(change.type, 14)
        target = eff - dt.timedelta(days=lead)
        if target <= as_of:
            target = as_of
        if days is not None and days < 0:
            return f"{base} — now; already in force since {change.effective_date}."
        return f"{base} — by {target.isoformat()}."
    if days == 0:
        return f"{base} — this week; situation is ongoing."
    if change.window_start:
        return f"{base} — before {change.window_start}."
    return f"{base} — this month."


def build_item(change: Change, department: Department, exposures: list[Exposure], footprint: Footprint, as_of: dt.date) -> BriefItem:
    days = days_until(change, as_of)
    also = [d for d in change.departments if d != department]
    return BriefItem(
        change_id=change.id,
        headline=headline(change, exposures),
        what_changes=change.summary,
        your_exposure=your_exposure(exposures, footprint.currency),
        cost_if_unprepared=cost_if_unprepared(change, exposures, footprint.currency),
        next_action=next_action(change, as_of, days, department),
        owner_role=OWNER_ROLE[department],
        also_notify=also,
        days_until=days,
        confidence=change.confidence,
        score=max(e.score for e in exposures),
        sources=change.sources,
    )


def build_briefs(
    footprint: Footprint,
    exposures: list[Exposure],
    changes: list[Change],
    as_of: str | dt.date,
) -> tuple[list[DepartmentBrief], list[BriefItem]]:
    """Return (briefs per department with items, leadership_top5)."""
    as_of_d = parse_date(as_of)
    assert as_of_d is not None
    by_change: dict[str, list[Exposure]] = defaultdict(list)
    for e in exposures:
        by_change[e.change_id].append(e)
    changes_by_id = {c.id: c for c in changes}

    items_by_dept: dict[str, list[BriefItem]] = defaultdict(list)
    leadership_candidates: list[BriefItem] = []

    for change_id, exps in by_change.items():
        change = changes_by_id.get(change_id)
        if change is None:
            continue
        for dept in change.departments:
            items_by_dept[dept].append(build_item(change, dept, exps, footprint, as_of_d))
        # Leadership always gets a view, even if the change does not list it.
        if "leadership" in change.departments:
            leadership_candidates.append(items_by_dept["leadership"][-1])
        else:
            leadership_candidates.append(build_item(change, "leadership", exps, footprint, as_of_d))

    briefs: list[DepartmentBrief] = []
    for dept in DEPARTMENTS:
        items = items_by_dept.get(dept)
        if not items:
            continue
        items.sort(key=lambda i: (-i.score, i.days_until if i.days_until is not None else 10**6, i.change_id))
        briefs.append(DepartmentBrief(department=dept, items=items[:MAX_ITEMS]))

    leadership_candidates.sort(key=lambda i: (-i.score, i.days_until if i.days_until is not None else 10**6, i.change_id))
    top5: list[BriefItem] = []
    seen: set[str] = set()
    for item in leadership_candidates:
        if item.change_id in seen:
            continue
        seen.add(item.change_id)
        top5.append(item)
        if len(top5) == 5:
            break
    return briefs, top5
