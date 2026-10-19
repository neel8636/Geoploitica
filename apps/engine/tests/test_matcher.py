import pytest

from geoploitica_engine import calendar
from geoploitica_engine.matcher import MIN_SCORE, match, proximity_weight, score
from geoploitica_engine.models import Footprint, Lane, Part, Site, Supplier

AS_OF = "2026-10-19"


def _by(exposures, change_id, item_type=None, item_id=None):
    return [
        e
        for e in exposures
        if e.change_id == change_id
        and (item_type is None or e.item_type == item_type)
        and (item_id is None or e.item_id == item_id)
    ]


@pytest.fixture(scope="module")
def exposures(nordwerk):
    return match(nordwerk, calendar.CHANGES, AS_OF, 365)


def test_sorted_desc_and_floor(exposures):
    scores = [e.score for e in exposures]
    assert scores == sorted(scores, reverse=True)
    assert all(s >= MIN_SCORE for s in scores)
    assert all(0 <= s <= 100 for s in scores)


def test_eudr_matches_rubber_seal(exposures):
    hits = _by(exposures, "eu-eudr-operators-2026-12-30", "part", "P-1001")
    assert len(hits) == 1
    e = hits[0]
    assert "4016" in e.reason and "MY" in e.reason
    assert e.days_until == 72
    assert e.value_at_risk == 380000
    # hand computed: 4/5 * 0.9 (72 days) * 1.0 (HS) * 1.0 (high) * 100 = 72, critical -> x1.15 = 82.8
    assert e.score == pytest.approx(82.8)
    # the wooden crate (HS 4415 under prefix 44) from BE is also EUDR scope; steel castings are not
    assert _by(exposures, "eu-eudr-operators-2026-12-30", "part", "P-1009")
    assert not _by(exposures, "eu-eudr-operators-2026-12-30", "part", "P-1002")


def test_eudr_does_not_match_every_eu_supplier(exposures):
    # product-scoped regulation: exposure comes through parts, not through supplier country
    assert not _by(exposures, "eu-eudr-operators-2026-12-30", "supplier")
    assert not _by(exposures, "eu-eudr-operators-2026-12-30", "site")
    assert not _by(exposures, "eu-eudr-operators-2026-12-30", "market")
    assert not _by(exposures, "eu-eudr-operators-2026-12-30", "lane")


def test_cbam_matches_imported_steel_castings_not_domestic_only(exposures):
    hits = {e.item_id for e in _by(exposures, "eu-cbam-certificates-2027-02-01", "part")}
    assert {"P-1002", "P-1003", "P-1005", "P-1008"} <= hits  # CN/TR/CN imports of 73/76
    # part from a German supplier placed on the German market still falls under the prefix
    assert "P-1010" in hits


def test_red_sea_suez_matches_sea_lane(exposures):
    lane_hits = {e.item_id: e for e in _by(exposures, "gulf-war-energy-shock-2026", "lane")}
    assert set(lane_hits) == {"L-01", "L-04"}
    e = lane_hits["L-01"]
    assert "SUEZ" in e.reason and "RED_SEA" in e.reason
    assert e.days_until == 0  # developing, window already open
    assert e.value_at_risk is None  # shipments are a count, not a value
    # 4/5 * 1.0 (ongoing) * 0.9 (chokepoint) * 1.0 (high) * 100 = 72
    assert e.score == pytest.approx(72.0)


def test_hormuz_lane_matches():
    fp = Footprint(
        company_name="X", currency="USD", home_country="US",
        suppliers=[Supplier(id="S", name="s", country="US", tier=1)],
        lanes=[Lane(id="L", origin_country="AE", destination_country="US", mode="sea", via=["HORMUZ"])],
    )
    ex = match(fp, calendar.CHANGES, AS_OF)
    assert _by(ex, "gulf-war-energy-shock-2026", "lane", "L")


def test_french_strike_matches_fr_supplier_and_site(exposures):
    strike = _by(exposures, "fr-national-strike-2026-11-05")
    sup_ids = {e.item_id for e in strike if e.item_type == "supplier"}
    site_ids = {e.item_id for e in strike if e.item_type == "site"}
    assert sup_ids == {"SUP-001", "SUP-007"}
    assert site_ids == {"S-03"}
    assert not {e.item_id for e in strike if e.item_type == "supplier" and e.item_id == "SUP-008"}  # DE untouched

    single = next(e for e in strike if e.item_id == "SUP-007")
    plain = next(e for e in strike if e.item_id == "SUP-001")
    site = next(e for e in strike if e.item_id == "S-03")
    assert single.days_until == 17
    # 2/5 * 0.9 * 0.7 * 1.0 * 100 = 25.2 ; single source x1.15 = 28.98 -> 29.0
    assert plain.score == pytest.approx(25.2)
    assert single.score == pytest.approx(29.0)
    assert single.value_at_risk == 1120000
    # site: 2/5 * 0.9 * 0.8 * 1.0 * 100 = 28.8
    assert site.score == pytest.approx(28.8)
    assert "FR" in site.reason and "2026-11-05" in site.reason


def test_sales_market_match(exposures):
    hits = _by(exposures, "fr-unrest-2026-10", "market")
    assert [e.item_id for e in hits] == ["FR"]
    # 3/5 * 1.0 * 0.6 * 1.0 * 100 = 36
    assert hits[0].score == pytest.approx(36.0)


def test_horizon_filters_far_dated_changes(nordwerk):
    short = match(nordwerk, calendar.CHANGES, AS_OF, horizon_days=60)
    ids = {e.change_id for e in short}
    assert "eu-eudr-operators-2026-12-30" not in ids  # 72 days out
    assert "fr-national-strike-2026-11-05" in ids
    assert "gulf-war-energy-shock-2026" in ids  # undated developing stays in


def test_low_scores_dropped():
    fp = Footprint(
        company_name="X", currency="EUR", home_country="DE",
        suppliers=[Supplier(id="S", name="s", country="ES", tier=1)],
    )
    # es-strike: 2/5 * 0.9 (13 days) * 0.7 * 0.85 = 21.4 -> kept
    ex = match(fp, calendar.CHANGES, AS_OF)
    assert _by(ex, "es-strike-2026-11", "supplier", "S")[0].score == pytest.approx(21.4)
    # a year later the strike is still "proposed", not developing: days very negative -> 1.0, kept.
    # drop case: election affected_country PL supplier: 3/5*0.7(181d)*0.7*1.0=29.4 kept; make it low confidence
    low = calendar.get_change("fr-presidential-election-2027-04-18").model_copy(update={"confidence": "low", "severity": 1})
    ex2 = match(Footprint(company_name="X", currency="EUR", home_country="DE",
                          suppliers=[Supplier(id="S", name="s", country="PL", tier=1)]), [low], AS_OF)
    assert ex2 == []  # 1/5*0.7*0.7*0.65*100 = 6.4 < 15


def test_proximity_bands():
    assert proximity_weight(-3) == 1.0
    assert proximity_weight(0) == 1.0
    assert proximity_weight(90) == 0.9
    assert proximity_weight(91) == 0.7
    assert proximity_weight(180) == 0.7
    assert proximity_weight(365) == 0.5
    assert proximity_weight(366) == 0.3
    assert proximity_weight(None) == 0.8


def test_score_cap():
    c = calendar.get_change("eu-eudr-operators-2026-12-30").model_copy(update={"severity": 5})
    assert score(c, 0, 1.0, True) == 100.0
