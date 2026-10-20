from collections import defaultdict

import pytest

from geopolitica_engine import calendar
from geopolitica_engine.briefs import OWNER_ROLE, build_briefs, fmt_money, your_exposure
from geopolitica_engine.matcher import match

AS_OF = "2026-10-19"


@pytest.fixture(scope="module")
def result(nordwerk):
    exposures = match(nordwerk, calendar.CHANGES, AS_OF, 365)
    briefs, top5 = build_briefs(nordwerk, exposures, calendar.CHANGES, AS_OF)
    return exposures, briefs, top5


def test_every_department_of_each_matched_change_gets_an_item(result):
    exposures, briefs, _ = result
    matched = {e.change_id for e in exposures}
    items = defaultdict(set)
    for b in briefs:
        for i in b.items:
            items[b.department].add(i.change_id)
    for cid in matched:
        change = calendar.get_change(cid)
        for dept in change.departments:
            assert cid in items[dept], f"{dept} missing {cid}"


def test_one_item_per_change_per_department(result):
    _, briefs, _ = result
    for b in briefs:
        ids = [i.change_id for i in b.items]
        assert len(ids) == len(set(ids))
        assert len(ids) <= 10
        assert [i.score for i in b.items] == sorted((i.score for i in b.items), reverse=True)


def test_item_fields(result):
    exposures, briefs, _ = result
    for b in briefs:
        for i in b.items:
            change = calendar.get_change(i.change_id)
            assert len(i.headline) <= 90
            assert i.what_changes == change.summary
            assert i.owner_role == OWNER_ROLE[b.department]
            assert b.department not in i.also_notify
            assert set(i.also_notify) == set(change.departments) - {b.department}
            assert i.confidence == change.confidence
            assert i.sources == change.sources
            assert i.score == max(e.score for e in exposures if e.change_id == i.change_id)
            assert any(i.next_action.startswith(line.rstrip(".")) for line in change.what_to_do)
            assert i.cost_if_unprepared


def test_exposure_text_counts_and_currency(result):
    exposures, briefs, _ = result
    logistics = next(b for b in briefs if b.department == "logistics")
    strike = next(i for i in logistics.items if i.change_id == "fr-national-strike-2026-11-05")
    assert strike.your_exposure.startswith("2 suppliers (EUR 3.0M spend)")
    assert "1 lane" in strike.your_exposure and "1 site" in strike.your_exposure
    assert "1 sales market" in strike.your_exposure
    assert strike.days_until == 17
    assert "by 2026-10-29" in strike.next_action  # 7-day lead before 2026-11-05
    assert "Missed shipments" in strike.cost_if_unprepared


def test_regulation_next_action_date(result):
    _, briefs, _ = result
    compliance = next(b for b in briefs if b.department == "compliance")
    eudr = next(i for i in compliance.items if i.change_id == "eu-eudr-operators-2026-12-30")
    assert "by 2026-11-15" in eudr.next_action  # effective_date minus 45 days
    assert "Duties" in eudr.cost_if_unprepared or "border holds" in eudr.cost_if_unprepared
    assert eudr.owner_role == "Trade compliance lead"


def test_leadership_top5(result):
    exposures, briefs, top5 = result
    assert 1 <= len(top5) <= 5
    ids = [i.change_id for i in top5]
    assert len(ids) == len(set(ids))
    assert [i.score for i in top5] == sorted((i.score for i in top5), reverse=True)
    assert all(i.owner_role == "COO" for i in top5)
    # best change overall is in top5 even though EUDR does not list leadership
    best = max(exposures, key=lambda e: e.score).change_id
    assert best in ids
    assert "leadership" not in calendar.get_change(best).departments


def test_fmt_money():
    assert fmt_money(1_234_567, "EUR") == "EUR 1.2M"
    assert fmt_money(42_000, "USD") == "USD 42k"
    assert fmt_money(900, "GBP") == "GBP 900"


def test_your_exposure_empty():
    assert your_exposure([], "EUR") == "No direct footprint match"
