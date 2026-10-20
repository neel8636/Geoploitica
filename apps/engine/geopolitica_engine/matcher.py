"""Exposure matching and deterministic scoring (api-contract.md, "Scoring (v0)")."""

from __future__ import annotations

import datetime as dt

from .calendar import days_until as _days_until, parse_date
from .models import Change, Exposure, Footprint, Lane, Part, Site, Supplier

# match weights, straight from the contract
W_HS = 1.0
W_COUNTRY = 0.7
W_CHOKEPOINT = 0.9
W_SITE = 0.8
W_MARKET = 0.6

MIN_SCORE = 15.0
BOOST = 1.15

_CONFIDENCE_WEIGHT = {"high": 1.0, "medium": 0.85, "low": 0.65}


def severity_weight(change: Change) -> float:
    return change.severity / 5


def proximity_weight(days: int | None) -> float:
    """days_until <= 0 -> 1.0; <= 90 -> 0.9; <= 180 -> 0.7; <= 365 -> 0.5; else 0.3.
    Undated (developing with no window, or anything else undated) -> 0.8."""
    if days is None:
        return 0.8
    if days <= 0:
        return 1.0
    if days <= 90:
        return 0.9
    if days <= 180:
        return 0.7
    if days <= 365:
        return 0.5
    return 0.3


def confidence_weight(change: Change) -> float:
    return _CONFIDENCE_WEIGHT[change.confidence]


def score(change: Change, days: int | None, match_weight: float, boosted: bool) -> float:
    s = severity_weight(change) * proximity_weight(days) * match_weight * confidence_weight(change) * 100
    if boosted:
        s *= BOOST
    return round(min(s, 100.0), 1)


# --- helpers ------------------------------------------------------------------


def _timing(change: Change, days: int | None) -> str:
    if change.effective_date:
        if days is not None and days < 0:
            return f"in force since {change.effective_date}"
        return f"takes effect {change.effective_date}"
    if change.window_start:
        if days == 0:
            return f"ongoing since {change.window_start}"
        return f"expected from {change.window_start}"
    return "timing not fixed"


def _lane_label(lane: Lane) -> str:
    via = f" via {'/'.join(lane.via)}" if lane.via else ""
    return f"{lane.origin_country}→{lane.destination_country} {lane.mode}{via}"


def _part_origins(part: Part, suppliers_by_id: dict[str, Supplier]) -> set[str]:
    origins: set[str] = set()
    if part.origin_country:
        origins.add(part.origin_country)
    for sid in part.supplier_ids:
        s = suppliers_by_id.get(sid)
        if s:
            origins.add(s.country)
    return origins


def _hs_match(part: Part, change: Change) -> str | None:
    """Return the matching prefix if the part's HS code falls under the change."""
    if not part.hs_code or not change.hs_prefixes:
        return None
    for prefix in change.hs_prefixes:
        if part.hs_code.startswith(prefix):
            return prefix
    return None


def _within_horizon(change: Change, as_of: dt.date, horizon_days: int) -> bool:
    if not change.effective_date:
        return True
    eff = parse_date(change.effective_date)
    assert eff is not None
    return eff <= as_of + dt.timedelta(days=horizon_days)


# --- matching -----------------------------------------------------------------


def match(footprint: Footprint, changes: list[Change], as_of: str | dt.date, horizon_days: int = 365) -> list[Exposure]:
    """Match every footprint item against every change and score the hits.

    Rules (weights in brackets):
      (a) supplier country in change.countries or affected_countries      [0.7]
      (b) part HS code under an hs_prefix and its origin (or any of its
          suppliers' countries) in change.countries/affected_countries   [1.0]
          For `regulation` changes the match also applies when the part is an
          import into the regulated market: home_country or a sales market is
          in change.countries and the part's origin is outside them.
      (c) lane via a listed chokepoint [0.9], else origin/destination in
          change.countries [0.7]
      (d) site country in change.countries                                [0.8]
      (e) sales market in change.countries or affected_countries         [0.6]

    Country-only rules (a), (c-country), (d), (e) are not applied to
    product-scoped changes (those carrying hs_prefixes): exposure to a product
    regulation or tariff comes through parts, otherwise every EU supplier and
    every lane ending in the EU would "match" every EU regulation. Chokepoint
    lane matches still apply to product-scoped changes.
    """
    as_of_d = parse_date(as_of)
    assert as_of_d is not None
    suppliers_by_id = {s.id: s for s in footprint.suppliers}
    markets = list(dict.fromkeys(footprint.sales_markets or []))
    home_and_markets = {footprint.home_country, *markets}

    exposures: list[Exposure] = []

    for change in changes:
        if not _within_horizon(change, as_of_d, horizon_days):
            continue
        days = _days_until(change, as_of_d)
        all_countries = change.all_countries
        origin_countries = set(change.countries)
        chokepoints = {c.upper() for c in (change.chokepoints or [])}
        product_scoped = bool(change.hs_prefixes)
        timing = _timing(change, days)

        def add(item_type: str, item_id: str, label: str, reason: str, weight: float, boosted: bool, var: float | None) -> None:
            s = score(change, days, weight, boosted)
            if s < MIN_SCORE:
                return
            exposures.append(
                Exposure(
                    change_id=change.id,
                    item_type=item_type,  # type: ignore[arg-type]
                    item_id=item_id,
                    item_label=label,
                    reason=reason,
                    score=s,
                    value_at_risk=var,
                    days_until=days,
                )
            )

        # (a) suppliers
        if not product_scoped:
            for s in footprint.suppliers:
                if s.country in all_countries:
                    reason = f"Supplier is in {s.country}; {change.title.lower()} {timing}."
                    add("supplier", s.id, s.name, reason, W_COUNTRY, bool(s.single_source), s.annual_spend)

        # (b) parts
        for p in footprint.parts or []:
            prefix = _hs_match(p, change)
            if prefix is None:
                continue
            origins = _part_origins(p, suppliers_by_id)
            hit_origin = sorted(origins & all_countries)
            reason: str | None = None
            # Regulations are market-side rules: prefer the "import into the regulated
            # market" framing when the part (or one of its sources) comes from outside.
            if change.type == "regulation" and origins and (home_and_markets & origin_countries):
                outside = sorted(origins - origin_countries)
                if outside:
                    market = sorted(home_and_markets & origin_countries)
                    reason = (
                        f"Part HS {p.hs_code} falls under prefix {prefix} and is imported from "
                        f"{'/'.join(outside)} into the regulated market ({'/'.join(market)}); {timing}."
                    )
            if reason is None and hit_origin:
                verb = "is placed on the market in" if change.type == "regulation" else "originates in"
                reason = f"Part HS {p.hs_code} falls under prefix {prefix} and {verb} {'/'.join(hit_origin)}; {timing}."
            if reason is None:
                continue
            add("part", p.id, p.name, reason, W_HS, bool(p.critical), p.annual_volume_value)

        # (c) lanes
        for lane in footprint.lanes or []:
            via_hit = sorted({v.upper() for v in (lane.via or [])} & chokepoints)
            if via_hit:
                reason = f"Lane routes via {'/'.join(via_hit)}; {change.title.lower()} {timing}."
                add("lane", lane.id, _lane_label(lane), reason, W_CHOKEPOINT, False, None)
                continue
            if product_scoped:
                continue
            ends = [c for c in (lane.origin_country, lane.destination_country) if c in origin_countries]
            if ends:
                reason = f"Lane touches {'/'.join(dict.fromkeys(ends))}; {change.title.lower()} {timing}."
                add("lane", lane.id, _lane_label(lane), reason, W_COUNTRY, False, None)

        # (d) sites
        if not product_scoped:
            for site in footprint.sites or []:
                if site.country in origin_countries:
                    reason = f"{site.type.capitalize()} is in {site.country}; {change.title.lower()} {timing}."
                    add("site", site.id, site.name, reason, W_SITE, False, None)

        # (e) sales markets
        if not product_scoped:
            for m in markets:
                if m in all_countries:
                    reason = f"Sales market {m} is affected; {change.title.lower()} {timing}."
                    add("market", m, f"{m} market", reason, W_MARKET, False, None)

    exposures.sort(key=lambda e: (-e.score, e.change_id, e.item_type, e.item_id))
    return exposures
