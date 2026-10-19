# Engine API contract (v0)

The impact engine (`apps/engine`, FastAPI) is the single source of truth for exposure matching and department briefs. The web app (`apps/web`, Next.js) calls it over HTTP. All bodies are JSON. All dates are ISO `YYYY-MM-DD`. All money is in the company's reporting currency, given as `currency` in the footprint.

## Shared vocabulary

- **Footprint**: what a company shares about itself. Four levels of detail; the engine works with whatever is present.
- **Change**: a dated or developing external event that can affect a footprint. Sourced. Has a type, geography, affected HS-code prefixes, and a date window.
- **Exposure**: one footprint item (supplier, part, lane, site, market) matched to one change, with a score.
- **Brief**: the per-department translation of exposures into obstacles and actions.

## Departments (fixed enum)

`procurement`, `logistics`, `production`, `finance`, `compliance`, `sustainability`, `sales`, `hr`, `leadership`

## Change types (fixed enum)

`tariff`, `sanction`, `export_control`, `regulation`, `chokepoint`, `strike`, `unrest`, `conflict`, `energy_price`, `fx`, `sovereign_stress`, `weather`, `election`

## Endpoints

### `GET /health`
`{ "status": "ok", "version": "0.1.0", "changes": <int count> }`

### `GET /changes`
Query: `from`, `to` (ISO dates, optional), `type` (optional), `country` (optional ISO-2).
Returns `{ "changes": Change[] }` sorted by `effective_date` ascending.

### `GET /changes/{id}`
Returns one `Change`.

### `POST /footprint/validate`
Body: `Footprint`. Returns `{ "ok": true, "summary": FootprintSummary, "warnings": string[] }` or 422 with field errors.

### `POST /analyze`
Body: `{ "footprint": Footprint, "as_of": "YYYY-MM-DD" (optional, default today), "horizon_days": 365 (optional) }`
Returns `AnalysisResult`.

### `POST /analyze/csv`
Multipart: `suppliers` (CSV, required), `parts` (CSV, optional), `lanes` (CSV, optional), `sites` (CSV, optional), plus form fields `company_name`, `currency`, `home_country`.
Parses with the templates in `data/templates/`, then behaves like `/analyze`.

## Types

```ts
type Country = string; // ISO-3166 alpha-2, upper case

interface Supplier {
  id: string;            // customer's own id
  name: string;
  country: Country;
  region?: string;       // free text, e.g. "Jiangsu"
  tier: 1 | 2 | 3;
  category?: string;     // free text, e.g. "castings"
  annual_spend?: number; // in footprint.currency
  single_source?: boolean;
}

interface Part {
  id: string;
  name: string;
  hs_code?: string;      // 4-10 digits, no dots
  supplier_ids: string[];
  origin_country?: Country;
  annual_volume_value?: number;
  critical?: boolean;
}

interface Lane {
  id: string;
  origin_country: Country;
  destination_country: Country;
  mode: "sea" | "air" | "road" | "rail";
  via?: string[];        // chokepoint codes, see below
  annual_shipments?: number;
  lead_time_days?: number;
}

interface Site {
  id: string;
  name: string;
  country: Country;
  type: "plant" | "warehouse" | "office";
  headcount?: number;
}

interface Footprint {
  company_name: string;
  currency: string;      // ISO-4217
  home_country: Country;
  sales_markets?: Country[];
  suppliers: Supplier[];
  parts?: Part[];
  lanes?: Lane[];
  sites?: Site[];
}

interface Source { title: string; url: string; publisher?: string; accessed: string; }

interface Change {
  id: string;            // slug, e.g. "eu-eudr-2026-12-30"
  type: ChangeType;
  title: string;
  summary: string;       // 1-2 plain sentences
  status: "scheduled" | "proposed" | "developing" | "in_force";
  effective_date?: string;      // when it bites, if dated
  window_start?: string;        // for developing situations
  window_end?: string;
  countries: Country[];         // where it originates or applies
  affected_countries?: Country[]; // trading partners hit, if different
  hs_prefixes?: string[];       // e.g. ["4011", "40"]
  chokepoints?: string[];       // e.g. ["HORMUZ", "SUEZ", "RED_SEA", "MALACCA", "TAIWAN_STRAIT", "PANAMA", "BOSPORUS"]
  sectors?: string[];           // free text tags
  severity: 1 | 2 | 3 | 4 | 5;  // 5 = stops trade
  confidence: "low" | "medium" | "high";
  departments: Department[];    // who primarily acts
  what_to_do: string[];         // generic actions, 1-4 lines
  sources: Source[];
  dossier_slug?: string;        // link to a public dossier if one exists
}

interface Exposure {
  change_id: string;
  item_type: "supplier" | "part" | "lane" | "site" | "market";
  item_id: string;
  item_label: string;
  reason: string;         // one plain sentence, e.g. "Supplier is in FR; national strike called for 2026-11-05"
  score: number;          // 0-100, see scoring
  value_at_risk?: number; // spend or volume value touched, in footprint.currency
  days_until?: number;    // to effective_date or window_start, may be negative
}

interface BriefItem {
  change_id: string;
  headline: string;       // <= 90 chars
  what_changes: string;
  your_exposure: string;  // counts and values from the footprint
  cost_if_unprepared: string;
  next_action: string;
  owner_role: string;     // e.g. "Trade compliance lead"
  also_notify: Department[];
  days_until?: number;
  confidence: "low" | "medium" | "high";
  score: number;          // max exposure score behind it
  sources: Source[];
}

interface DepartmentBrief {
  department: Department;
  items: BriefItem[];     // sorted by score desc, max 10
}

interface FootprintSummary {
  suppliers: number; parts: number; lanes: number; sites: number;
  countries: Country[];
  total_spend?: number;
}

interface AnalysisResult {
  as_of: string;
  footprint: FootprintSummary;
  exposures: Exposure[];          // all, sorted by score desc
  by_country: { country: Country; spend: number; suppliers: number; max_score: number }[];
  by_change: { change_id: string; title: string; type: ChangeType; effective_date?: string; days_until?: number; exposures: number; value_at_risk: number; max_score: number }[];
  briefs: DepartmentBrief[];      // one per department that has items
  leadership_top5: BriefItem[];
}
```

## Scoring (v0, deterministic)

`score = severity_weight * proximity_weight * match_weight * confidence_weight * 100`, capped at 100.

- `severity_weight = severity / 5`
- `proximity_weight`: `days_until <= 0` → 1.0; `<= 90` → 0.9; `<= 180` → 0.7; `<= 365` → 0.5; else 0.3; undated developing → 0.8
- `match_weight`: exact HS-prefix match 1.0; country-only match 0.7; chokepoint-on-lane 0.9; sales-market match 0.6; site-country match 0.8
- `confidence_weight`: high 1.0, medium 0.85, low 0.65
- Multiply by 1.15 if the supplier is `single_source` or the part is `critical`, then cap at 100.

Exposures below score 15 are dropped.

## Brief generation (v0)

Rule-based templates per change type and department, filled from the footprint. No LLM in the request path. Every BriefItem carries the change's sources. `leadership_top5` = top 5 BriefItems across departments by score, de-duplicated by change.
