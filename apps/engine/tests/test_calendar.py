import datetime as dt

from geopolitica_engine import calendar
from geopolitica_engine.calendar import days_until, get_change, get_changes


def test_loaded_and_unique():
    assert len(calendar.CHANGES) >= 10
    ids = [c.id for c in calendar.CHANGES]
    assert len(ids) == len(set(ids))


def test_sorted_by_effective_date_asc():
    changes = get_changes()
    anchors = [calendar.anchor_date(c) for c in changes]
    assert anchors == sorted(anchors)


def test_filter_type():
    regs = get_changes(type="regulation")
    assert regs and all(c.type == "regulation" for c in regs)
    assert get_changes(type="weather") == []


def test_filter_country_includes_affected():
    fr = get_changes(country="FR")
    ids = {c.id for c in fr}
    assert "fr-national-strike-2026-11-05" in ids
    assert "eu-eudr-operators-2026-12-30" in ids  # FR is an EU member in countries
    assert "gulf-war-energy-shock-2026" in ids  # FR in affected_countries
    assert "it-cost-of-living-unrest-2026-10" not in ids
    assert get_changes(country="fr") == fr  # case-insensitive


def test_filter_date_window():
    nov = get_changes(from_date="2026-11-01", to_date="2026-11-30")
    ids = {c.id for c in nov}
    assert "fr-national-strike-2026-11-05" in ids
    assert "es-strike-2026-11" in ids  # window_start used when no effective_date
    assert "eu-eudr-operators-2026-12-30" not in ids
    assert "fr-moodys-review-2026-10-23" not in ids


def test_get_change():
    c = get_change("eu-eudr-operators-2026-12-30")
    assert c is not None and c.effective_date == "2026-12-30"
    assert get_change("nope") is None


def test_days_until_dated():
    c = get_change("eu-eudr-operators-2026-12-30")
    assert days_until(c, "2026-10-19") == 72
    assert days_until(c, dt.date(2027, 1, 1)) == -2  # negative once past


def test_days_until_developing_in_past_is_zero():
    c = get_change("fr-unrest-2026-10")  # developing, window_start 2026-09-25
    assert days_until(c, "2026-10-19") == 0
    assert days_until(c, "2026-09-01") == 24  # not yet started -> positive


def test_days_until_proposed_window():
    c = get_change("es-strike-2026-11")  # proposed, window_start 2026-11-01
    assert days_until(c, "2026-10-19") == 13
    assert days_until(c, "2026-11-10") == -9  # proposed (not developing) stays negative


def test_days_until_none_when_undated():
    c = get_change("fr-unrest-2026-10").model_copy(update={"window_start": None, "effective_date": None})
    assert days_until(c, "2026-10-19") is None
