// TypeScript mirror of docs/api-contract.md. Keep in sync with apps/engine/geopolitica_engine/models.py.

export type Department =
  | "procurement" | "logistics" | "production" | "finance" | "compliance"
  | "sustainability" | "sales" | "hr" | "leadership";

export const DEPARTMENT_LABELS: Record<Department, string> = {
  procurement: "Procurement",
  logistics: "Logistics",
  production: "Production planning",
  finance: "Finance and treasury",
  compliance: "Compliance and legal",
  sustainability: "Sustainability",
  sales: "Sales",
  hr: "HR and safety",
  leadership: "Leadership",
};

export type ChangeType =
  | "tariff" | "sanction" | "export_control" | "regulation" | "chokepoint" | "strike" | "unrest"
  | "conflict" | "energy_price" | "fx" | "sovereign_stress" | "weather" | "election";

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  tariff: "Tariff", sanction: "Sanction", export_control: "Export control", regulation: "Regulation",
  chokepoint: "Chokepoint", strike: "Strike", unrest: "Unrest", conflict: "Conflict",
  energy_price: "Energy price", fx: "Currency", sovereign_stress: "Sovereign stress",
  weather: "Weather", election: "Election",
};

export interface Source { title: string; url: string; publisher?: string; accessed: string }

export interface Change {
  id: string; type: ChangeType; title: string; summary: string;
  status: "scheduled" | "proposed" | "developing" | "in_force";
  effective_date?: string; window_start?: string; window_end?: string;
  countries: string[]; affected_countries?: string[]; hs_prefixes?: string[]; chokepoints?: string[];
  sectors?: string[]; severity: 1 | 2 | 3 | 4 | 5; confidence: "low" | "medium" | "high";
  departments: Department[]; what_to_do: string[]; sources: Source[]; dossier_slug?: string;
}

export interface Supplier { id: string; name: string; country: string; region?: string; tier: 1 | 2 | 3; category?: string; annual_spend?: number; single_source?: boolean }
export interface Part { id: string; name: string; hs_code?: string; supplier_ids: string[]; origin_country?: string; annual_volume_value?: number; critical?: boolean }
export interface Lane { id: string; origin_country: string; destination_country: string; mode: "sea" | "air" | "road" | "rail"; via?: string[]; annual_shipments?: number; lead_time_days?: number }
export interface Site { id: string; name: string; country: string; type: "plant" | "warehouse" | "office"; headcount?: number }
export interface Footprint { company_name: string; currency: string; home_country: string; sales_markets?: string[]; suppliers: Supplier[]; parts?: Part[]; lanes?: Lane[]; sites?: Site[] }

export interface Exposure {
  change_id: string; item_type: "supplier" | "part" | "lane" | "site" | "market"; item_id: string; item_label: string;
  reason: string; score: number; value_at_risk?: number; days_until?: number;
}
export interface BriefItem {
  change_id: string; headline: string; what_changes: string; your_exposure: string; cost_if_unprepared: string;
  next_action: string; owner_role: string; also_notify: Department[]; days_until?: number;
  confidence: "low" | "medium" | "high"; score: number; sources: Source[];
}
export interface DepartmentBrief { department: Department; items: BriefItem[] }
export interface FootprintSummary { suppliers: number; parts: number; lanes: number; sites: number; countries: string[]; total_spend?: number }
export interface AnalysisResult {
  as_of: string; footprint: FootprintSummary; exposures: Exposure[];
  by_country: { country: string; spend: number; suppliers: number; max_score: number }[];
  by_change: { change_id: string; title: string; type: ChangeType; effective_date?: string; days_until?: number; exposures: number; value_at_risk: number; max_score: number }[];
  briefs: DepartmentBrief[]; leadership_top5: BriefItem[];
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Engine error ${res.status}`;
    try { const j = await res.json(); msg = j.error ?? (typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail ?? j)); } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function fetchChanges(): Promise<Change[]> {
  const r = await handle<{ changes: Change[] }>(await fetch("/api/engine/changes"));
  return r.changes;
}

export async function analyzeFootprint(footprint: Footprint, as_of?: string): Promise<AnalysisResult> {
  return handle(await fetch("/api/engine/analyze", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ footprint, as_of }),
  }));
}

export async function analyzeCsv(form: FormData): Promise<AnalysisResult> {
  return handle(await fetch("/api/engine/analyze/csv", { method: "POST", body: form }));
}

export function money(v: number | undefined, currency: string): string {
  if (v === undefined || v === null) return "";
  const abs = Math.abs(v);
  const s = abs >= 1e9 ? `${(v / 1e9).toFixed(1)}bn` : abs >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : abs >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`;
  return `${currency} ${s}`;
}
