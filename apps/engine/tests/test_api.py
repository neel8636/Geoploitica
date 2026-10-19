import pytest
from fastapi.testclient import TestClient

from geoploitica_engine import calendar
from geoploitica_engine.api import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body == {"status": "ok", "version": "0.1.0", "changes": len(calendar.CHANGES)}


def test_cors_header(client):
    r = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert r.headers.get("access-control-allow-origin") == "*"


def test_changes_list_and_filters(client):
    r = client.get("/changes")
    assert r.status_code == 200
    changes = r.json()["changes"]
    assert len(changes) == len(calendar.CHANGES)
    dated = [c["effective_date"] for c in changes if c.get("effective_date")]
    assert dated == sorted(dated)

    r = client.get("/changes", params={"type": "strike", "country": "FR"})
    assert [c["id"] for c in r.json()["changes"]] == ["fr-national-strike-2026-11-05"]

    r = client.get("/changes", params={"from": "2027-01-01", "to": "2027-12-31"})
    ids = {c["id"] for c in r.json()["changes"]}
    assert "eu-cbam-certificates-2027-02-01" in ids and "fr-national-strike-2026-11-05" not in ids

    assert client.get("/changes", params={"from": "yesterday"}).status_code == 422
    assert client.get("/changes", params={"type": "pandemic"}).status_code == 422


def test_change_by_id(client):
    r = client.get("/changes/eu-eudr-operators-2026-12-30")
    assert r.status_code == 200
    assert r.json()["type"] == "regulation"
    assert client.get("/changes/does-not-exist").status_code == 404


def test_validate_footprint(client, nordwerk_json):
    r = client.post("/footprint/validate", json=nordwerk_json)
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["summary"]["suppliers"] == 12
    assert isinstance(body["warnings"], list)

    bad = dict(nordwerk_json)
    bad["currency"] = "euro"
    r = client.post("/footprint/validate", json=bad)
    assert r.status_code == 422
    assert any("currency" in str(e["loc"]) for e in r.json()["detail"])


def test_analyze_nordwerk(client, nordwerk_json):
    r = client.post("/analyze", json={"footprint": nordwerk_json, "as_of": "2026-10-19"})
    assert r.status_code == 200
    body = r.json()
    assert body["as_of"] == "2026-10-19"
    assert body["footprint"]["parts"] == 10
    assert body["exposures"], "expected exposures for the example footprint"
    scores = [e["score"] for e in body["exposures"]]
    assert scores == sorted(scores, reverse=True)
    assert body["exposures"][0]["change_id"] == "eu-eudr-operators-2026-12-30"
    assert body["exposures"][0]["item_id"] == "P-1001"

    depts = {b["department"] for b in body["briefs"]}
    assert {"compliance", "logistics", "procurement", "finance", "leadership"} <= depts
    for b in body["briefs"]:
        assert len(b["items"]) <= 10
    assert 1 <= len(body["leadership_top5"]) <= 5

    by_change = {c["change_id"]: c for c in body["by_change"]}
    assert by_change["gulf-war-energy-shock-2026"]["exposures"] >= 2
    assert by_change["eu-eudr-operators-2026-12-30"]["effective_date"] == "2026-12-30"
    assert by_change["eu-eudr-operators-2026-12-30"]["days_until"] == 72

    by_country = {c["country"]: c for c in body["by_country"]}
    assert by_country["FR"]["suppliers"] == 2
    assert by_country["FR"]["spend"] == pytest.approx(2970000)


def test_analyze_defaults_as_of_today(client, nordwerk_json):
    r = client.post("/analyze", json={"footprint": nordwerk_json})
    assert r.status_code == 200
    assert len(r.json()["as_of"]) == 10


def test_analyze_horizon(client, nordwerk_json):
    r = client.post("/analyze", json={"footprint": nordwerk_json, "as_of": "2026-10-19", "horizon_days": 30})
    ids = {e["change_id"] for e in r.json()["exposures"]}
    assert "eu-eudr-operators-2026-12-30" not in ids
    assert "fr-national-strike-2026-11-05" in ids


def test_analyze_csv_with_templates(client, templates):
    files = {
        "suppliers": ("suppliers.csv", templates["suppliers"], "text/csv"),
        "parts": ("parts.csv", templates["parts"], "text/csv"),
        "lanes": ("lanes.csv", templates["lanes"], "text/csv"),
        "sites": ("sites.csv", templates["sites"], "text/csv"),
    }
    data = {
        "company_name": "Nordwerk Industrial GmbH",
        "currency": "EUR",
        "home_country": "DE",
        "sales_markets": "DE,FR,IT,US",
        "as_of": "2026-10-19",
    }
    r = client.post("/analyze/csv", files=files, data=data)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["footprint"] == {
        "suppliers": 3, "parts": 3, "lanes": 3, "sites": 3,
        "countries": sorted({"DE", "FR", "CN", "TR", "MY", "IT", "US"}),
        "total_spend": 5550000.0,
    }
    pairs = {(e["change_id"], e["item_id"]) for e in body["exposures"]}
    assert ("eu-eudr-operators-2026-12-30", "P-1001") in pairs  # rubber seal from MY
    assert ("gulf-war-energy-shock-2026", "L-01") in pairs  # CN->DE via SUEZ|RED_SEA
    assert ("fr-national-strike-2026-11-05", "SUP-001") in pairs
    assert ("fr-national-strike-2026-11-05", "S-03") in pairs


def test_analyze_csv_suppliers_only(client, templates):
    r = client.post(
        "/analyze/csv",
        files={"suppliers": ("suppliers.csv", templates["suppliers"], "text/csv")},
        data={"company_name": "X", "currency": "EUR", "home_country": "DE"},
    )
    assert r.status_code == 200
    assert r.json()["footprint"]["parts"] == 0


def test_analyze_csv_bad_rows_422(client):
    bad = b"id,name,country,region,tier,category,annual_spend,single_source\nS1,Acme,Germany,,1,,100,\n"
    r = client.post(
        "/analyze/csv",
        files={"suppliers": ("suppliers.csv", bad, "text/csv")},
        data={"company_name": "X", "currency": "EUR", "home_country": "DE"},
    )
    assert r.status_code == 422
    detail = r.json()["detail"]
    assert detail[0]["file"] == "suppliers" and detail[0]["row"] == 2
