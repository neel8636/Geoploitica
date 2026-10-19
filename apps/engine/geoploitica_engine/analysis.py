"""Glue: footprint + calendar -> AnalysisResult."""

from __future__ import annotations

import datetime as dt
from collections import defaultdict

from . import calendar
from .briefs import build_briefs
from .matcher import match
from .models import AnalysisResult, ChangeRollup, CountryRollup, Footprint, summarize_footprint


def analyze(footprint: Footprint, as_of: str | dt.date | None = None, horizon_days: int = 365) -> AnalysisResult:
    as_of_d = calendar.parse_date(as_of) or dt.date.today()
    changes = calendar.CHANGES
    exposures = match(footprint, changes, as_of_d, horizon_days)
    briefs, top5 = build_briefs(footprint, exposures, changes, as_of_d)

    # by_country: supplier spend and count per supplier country, max exposure score touching it.
    spend: dict[str, float] = defaultdict(float)
    count: dict[str, int] = defaultdict(int)
    for s in footprint.suppliers:
        count[s.country] += 1
        spend[s.country] += s.annual_spend or 0.0
    max_score: dict[str, float] = defaultdict(float)
    sup_country = {s.id: s.country for s in footprint.suppliers}
    site_country = {s.id: s.country for s in (footprint.sites or [])}
    part_country = {p.id: p.origin_country for p in (footprint.parts or [])}
    lane_countries = {l.id: (l.origin_country, l.destination_country) for l in (footprint.lanes or [])}
    for e in exposures:
        touched: list[str] = []
        if e.item_type == "supplier" and e.item_id in sup_country:
            touched = [sup_country[e.item_id]]
        elif e.item_type == "site" and e.item_id in site_country:
            touched = [site_country[e.item_id]]
        elif e.item_type == "part" and part_country.get(e.item_id):
            touched = [part_country[e.item_id]]  # type: ignore[list-item]
        elif e.item_type == "lane" and e.item_id in lane_countries:
            touched = list(lane_countries[e.item_id])
        elif e.item_type == "market":
            touched = [e.item_id]
        for c in touched:
            max_score[c] = max(max_score[c], e.score)
    countries = set(count) | set(max_score)
    by_country = [
        CountryRollup(country=c, spend=round(spend.get(c, 0.0), 2), suppliers=count.get(c, 0), max_score=max_score.get(c, 0.0))
        for c in countries
    ]
    by_country.sort(key=lambda r: (-r.max_score, -r.spend, r.country))

    # by_change
    grouped = defaultdict(list)
    for e in exposures:
        grouped[e.change_id].append(e)
    by_change = []
    for cid, exps in grouped.items():
        ch = calendar.get_change(cid)
        if ch is None:
            continue
        by_change.append(
            ChangeRollup(
                change_id=cid,
                title=ch.title,
                type=ch.type,
                effective_date=ch.effective_date,
                days_until=calendar.days_until(ch, as_of_d),
                exposures=len(exps),
                value_at_risk=round(sum(e.value_at_risk or 0.0 for e in exps), 2),
                max_score=max(e.score for e in exps),
            )
        )
    by_change.sort(key=lambda r: (-r.max_score, r.change_id))

    return AnalysisResult(
        as_of=as_of_d.isoformat(),
        footprint=summarize_footprint(footprint),
        exposures=exposures,
        by_country=by_country,
        by_change=by_change,
        briefs=briefs,
        leadership_top5=top5,
    )
