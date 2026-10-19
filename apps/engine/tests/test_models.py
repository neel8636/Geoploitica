import pytest
from pydantic import ValidationError

from geoploitica_engine.models import Change, Footprint, Lane, Part, Site, Supplier, summarize_footprint


def _supplier(**over):
    base = dict(id="S1", name="Acme", country="DE", tier=1)
    base.update(over)
    return Supplier(**base)


def test_supplier_ok():
    s = _supplier(annual_spend=100.0, single_source=True, region="Bayern")
    assert s.country == "DE" and s.tier == 1


@pytest.mark.parametrize("bad", ["de", "DEU", "D", "1A", ""])
def test_country_must_be_iso2_upper(bad):
    with pytest.raises(ValidationError):
        _supplier(country=bad)


@pytest.mark.parametrize("bad", [0, 4, "x"])
def test_tier_enum(bad):
    with pytest.raises(ValidationError):
        _supplier(tier=bad)


def test_negative_spend_rejected():
    with pytest.raises(ValidationError):
        _supplier(annual_spend=-5)


@pytest.mark.parametrize("bad", ["401", "4016.93", "40169300001", "ABCD"])
def test_hs_code_digits_4_to_10(bad):
    with pytest.raises(ValidationError):
        Part(id="P", name="p", hs_code=bad, supplier_ids=[])


def test_hs_code_ok_and_optional():
    assert Part(id="P", name="p", hs_code="4016", supplier_ids=["S1"]).hs_code == "4016"
    assert Part(id="P", name="p", supplier_ids=[]).hs_code is None


def test_lane_mode_enum_and_via_upper():
    lane = Lane(id="L", origin_country="CN", destination_country="DE", mode="sea", via=["suez", " red_sea "])
    assert lane.via == ["SUEZ", "RED_SEA"]
    with pytest.raises(ValidationError):
        Lane(id="L", origin_country="CN", destination_country="DE", mode="truck")


def test_site_type_enum():
    with pytest.raises(ValidationError):
        Site(id="S", name="x", country="DE", type="factory")


@pytest.mark.parametrize("bad", ["eur", "EU", "EURO", "12E"])
def test_currency_iso4217(bad):
    with pytest.raises(ValidationError):
        Footprint(company_name="X", currency=bad, home_country="DE", suppliers=[_supplier()])


def test_footprint_requires_suppliers_list():
    with pytest.raises(ValidationError):
        Footprint(company_name="X", currency="EUR", home_country="DE")


def test_footprint_summary(nordwerk):
    s = summarize_footprint(nordwerk)
    assert (s.suppliers, s.parts, s.lanes, s.sites) == (12, 10, 5, 3)
    assert "MY" in s.countries and "US" in s.countries
    assert s.total_spend == pytest.approx(13370000)


def test_change_enums_and_dates():
    base = dict(
        id="x", type="tariff", title="t", summary="s", status="scheduled", countries=["US"],
        severity=3, confidence="high", departments=["procurement"], what_to_do=["do"], sources=[],
    )
    assert Change(**base).type == "tariff"
    with pytest.raises(ValidationError):
        Change(**{**base, "type": "pandemic"})
    with pytest.raises(ValidationError):
        Change(**{**base, "severity": 6})
    with pytest.raises(ValidationError):
        Change(**{**base, "departments": ["marketing"]})
    with pytest.raises(ValidationError):
        Change(**{**base, "effective_date": "2026-13-40"})
    with pytest.raises(ValidationError):
        Change(**{**base, "hs_prefixes": ["40.11"]})
