# geopolitica-engine

The impact engine behind Geopolitica: a FastAPI service that matches a company's
footprint (suppliers, parts, lanes, sites, sales markets) against a sourced
calendar of dated geopolitical changes, scores each exposure deterministically
and writes rule-based department briefs. No LLM in the request path.

The contract is `../../docs/api-contract.md`. This package implements it exactly.

## Run

```bash
cd apps/engine
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python -m geopolitica_engine          # serves on $PORT, default 8000
python -m pytest -q                   # tests
```

Environment:

| Variable       | Default | Meaning                                              |
| -------------- | ------- | ---------------------------------------------------- |
| `PORT`         | `8000`  | HTTP port                                            |
| `HOST`         | `0.0.0.0` | Bind address                                       |
| `CORS_ORIGINS` | `*`     | Comma-separated list of allowed origins              |
| `LOG_LEVEL`    | `info`  | uvicorn log level                                    |

Docker:

```bash
docker build -t geopolitica-engine .
docker run -p 8000:8000 -e PORT=8000 geopolitica-engine
```

## Endpoints

| Method | Path                  | Body / query                                                                                   | Returns                                            |
| ------ | --------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| GET    | `/health`             |                                                                                                | `{status, version, changes}`                       |
| GET    | `/changes`            | `from`, `to` (ISO dates), `type` (change type), `country` (ISO-2); all optional                | `{changes: Change[]}` sorted by effective date asc |
| GET    | `/changes/{id}`       |                                                                                                | `Change` or 404                                    |
| POST   | `/footprint/validate` | `Footprint` JSON                                                                               | `{ok, summary, warnings}` or 422 with field errors |
| POST   | `/analyze`            | `{footprint, as_of?, horizon_days?}`                                                           | `AnalysisResult`                                   |
| POST   | `/analyze/csv`        | multipart: `suppliers` (required), `parts`, `lanes`, `sites` CSVs + form fields `company_name`, `currency`, `home_country`, optional `sales_markets` (comma list), `as_of`, `horizon_days` | `AnalysisResult`, or 422 with per-row errors |

`as_of` defaults to today. `horizon_days` defaults to 365; changes whose
`effective_date` is beyond `as_of + horizon_days` are ignored. Undated,
developing changes always stay in.

Example:

```bash
curl -s -X POST localhost:8000/analyze \
  -H 'content-type: application/json' \
  -d "{\"footprint\": $(cat geopolitica_engine/data/examples/nordwerk.json), \"as_of\": \"2026-10-19\"}" | jq '.leadership_top5[0]'
```

## CSV formats

Templates with example rows live in `geopolitica_engine/data/templates/`.
Headers are case-insensitive, blank optional cells are fine, and `,` `;` or
tab delimiters are detected. Multi-value cells use `|` as the separator.
Booleans accept `true/false`, `yes/no`, `1/0`.

**suppliers.csv** (required)

| column          | required | notes                              |
| --------------- | -------- | ---------------------------------- |
| `id`            | yes      | your own id, referenced by parts   |
| `name`          | yes      |                                    |
| `country`       | yes      | ISO-2, e.g. `FR`                   |
| `region`        |          | free text                          |
| `tier`          | yes      | `1`, `2` or `3` (blank → 1)        |
| `category`      |          | free text                          |
| `annual_spend`  |          | number, in the footprint currency  |
| `single_source` |          | boolean                            |

**parts.csv**

| column                | required | notes                                   |
| --------------------- | -------- | --------------------------------------- |
| `id`, `name`          | yes      |                                         |
| `hs_code`             |          | 4-10 digits, dots are stripped          |
| `supplier_ids`        |          | pipe-separated supplier ids             |
| `origin_country`      |          | ISO-2                                   |
| `annual_volume_value` |          | number, in the footprint currency       |
| `critical`            |          | boolean                                 |

**lanes.csv**

| column                                 | required | notes                                                            |
| -------------------------------------- | -------- | ---------------------------------------------------------------- |
| `id`                                   | yes      |                                                                  |
| `origin_country`, `destination_country`| yes      | ISO-2                                                            |
| `mode`                                 | yes      | `sea`, `air`, `road`, `rail`                                     |
| `via`                                  |          | pipe-separated chokepoint codes: `HORMUZ`, `SUEZ`, `RED_SEA`, `BAB_EL_MANDEB`, `MALACCA`, `TAIWAN_STRAIT`, `PANAMA`, `BOSPORUS` |
| `annual_shipments`                     |          | count                                                            |
| `lead_time_days`                       |          | number                                                           |

**sites.csv**

| column       | required | notes                             |
| ------------ | -------- | --------------------------------- |
| `id`, `name` | yes      |                                   |
| `country`    | yes      | ISO-2                             |
| `type`       | yes      | `plant`, `warehouse`, `office`    |
| `headcount`  |          | integer                           |

## Matching and scoring

Scoring follows the contract: `severity/5 × proximity × match_weight × confidence × 100`,
×1.15 for single-source suppliers or critical parts, capped at 100, exposures
below 15 dropped.

Match rules:

- supplier country in `countries`/`affected_countries` → 0.7
- part HS code under an `hs_prefix` and the part's origin (or one of its
  suppliers' countries) in the change's countries → 1.0. For `regulation`
  changes the match also applies to imports into the regulated market: the
  footprint's home country or a sales market is in the change's countries and
  the part comes from outside them.
- lane `via` a listed chokepoint → 0.9, otherwise lane origin/destination in
  `countries` → 0.7
- site country in `countries` → 0.8
- sales market in `countries`/`affected_countries` → 0.6

Country-only rules are not applied to product-scoped changes (those with
`hs_prefixes`); exposure to a product regulation comes through parts and
chokepoint lanes, not through every supplier located in the EU.

## Layout

```
geopolitica_engine/
  models.py     Pydantic models for every contract type
  calendar.py   loads data/changes.json; filters; days_until
  matcher.py    match() and scoring
  briefs.py     rule-based BriefItem / DepartmentBrief / leadership_top5
  csvio.py      CSV → Footprint
  analysis.py   analyze() → AnalysisResult (rollups by country and change)
  api.py        FastAPI app
  data/changes.json, data/templates/*.csv, data/examples/nordwerk.json
tests/
```
