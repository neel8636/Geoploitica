import type { WorldEvent } from "./events.ts";

/*
  What's fueling it: the small, concrete local events (a strike in one city, a court ruling,
  a port closure, a poll, a price jump) that feed a big event on the map. Claude reads the
  event's latest headlines and names them, each tied to the headlines that report it, with a
  place, the channel it feeds the big event through, and whether the big event also drives it
  back. Pure functions: the pipeline (scripts/fuel.mjs) and the enterprise server's
  /api/fuel call the API themselves.
*/

export interface FuelHeadline {
  title: string;
  url: string;
  publisher: string;
  published: string;
}

/*
  What a small event moves into the big one. Three families, each a colour on the map (money,
  goods, people), and ten aspects, each an icon, so colour is never the only cue.
*/
export type Family = "money" | "goods" | "people";
export const ASPECTS = {
  markets: { family: "money", label: "Markets and rates" },
  budget: { family: "money", label: "Public money" },
  energy: { family: "goods", label: "Energy" },
  trade: { family: "goods", label: "Trade and shipping" },
  food: { family: "goods", label: "Food and farming" },
  jobs: { family: "people", label: "Jobs and wages" },
  living: { family: "people", label: "Living costs" },
  politics: { family: "people", label: "Politics and protest" },
  security: { family: "people", label: "Security" },
  displacement: { family: "people", label: "People on the move" },
} as const satisfies Record<string, { family: Family; label: string }>;
export type Aspect = keyof typeof ASPECTS;
export const FAMILY_LABEL: Record<Family, string> = { money: "Money", goods: "Goods", people: "People" };

function guessAspect(text: string): Aspect {
  const t = text.toLowerCase();
  const rules: [Aspect, RegExp][] = [
    ["energy", /oil|fuel|diesel|gas|energy|power|electric|opec|brent|refin/],
    ["trade", /tariff|trade|export|import|ship|port|freight|supply|customs/],
    ["food", /food|grain|wheat|harvest|crop|farm|famine/],
    ["markets", /bond|yield|spread|rate|market|stock|currency|yen|euro|ruble|investor|bank/],
    ["budget", /budget|deficit|debt|tax|spending|aid fund|subsid/],
    ["jobs", /strike|union|wage|job|worker|layoff|pay/],
    ["living", /price|rent|housing|inflation|cost of living|bill/],
    ["security", /military|missile|troop|attack|clash|drone|army|navy|police|violence/],
    ["displacement", /refugee|displac|migra|flee|hunger|health/],
  ];
  return rules.find(([, re]) => re.test(t))?.[0] ?? "politics";
}

export interface FuelEvent {
  id: string;
  title: string; // short, concrete: "Lyon dock workers strike"
  when: string; // ISO date, or "ongoing"
  place: string;
  lat: number;
  lon: number;
  what: string; // one sentence
  via: string; // what moves into the big event: "higher diesel costs"
  aspect: Aspect;
  flow: "into" | "both"; // feeds the big event, or feeds it and is driven by it
  sources: { title: string; url: string; publisher: string }[];
}

export interface FuelSet {
  at: string; // ISO time of the run
  by: string; // "pipeline" | "reader"
  items: FuelEvent[];
}

export const FUEL_SYSTEM = `You map the small events that fuel a big world event, for Geopolitica Atlas, a free site that shows how events ripple into each other.

From the numbered headlines, pick 2 to 6 distinct, concrete, smaller events that feed the big event: a strike in one city, a court ruling, a port closure, a poll, a price jump, a clash at one border post, a minister's resignation. Rules:
- Every item must be reported by at least one of the numbered headlines; cite them by number. Never add an event, number or name that is not in the headlines.
- Skip general commentary, opinion and items that merely restate the big event.
- title: at most 8 words, concrete, no clickbait. what: one plain sentence, at most 30 words.
- via: 2 to 6 words naming what moves from the small event into the big one ("higher diesel costs", "union turnout", "investor fear").
- aspect: the part of the economy that carries it, one of: markets (bonds, rates, currencies, stocks), budget (public money, aid funding, investment), energy, trade (tariffs, shipping, supply chains), food (food supply, farming), jobs (strikes, wages, employment), living (prices, rents, cost of living), politics (votes, government, protest), security (military, violence), displacement (refugees, hunger, health).
- flow: "into" if it feeds the big event; "both" if it feeds it and is also clearly driven by it.
- place: the town or region; lat and lon: approximate coordinates of that place (city level is enough). when: the ISO date from the headline, or "ongoing".
- No em dashes.

Answer with JSON only: {"items": [{"title": "", "when": "", "place": "", "lat": 0, "lon": 0, "what": "", "via": "", "aspect": "energy", "flow": "into", "used": [1]}]}`;

export function fuelPrompt(event: WorldEvent, headlines: FuelHeadline[]): string {
  const list = headlines.map((h, n) => `${n + 1}. ${h.title} (${h.publisher}, ${h.published.slice(0, 10)})`).join("\n");
  return `Big event: ${event.title}\nWhere: ${event.region} (lat ${event.lat}, lon ${event.lon})\nSummary: ${event.summary}\n\nHeadlines, newest first:\n${list}`;
}

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60);

/* Checks the model's answer: keeps only items backed by the given headlines, with sane fields. */
export function finishFuel(raw: unknown, event: WorldEvent, headlines: FuelHeadline[]): FuelEvent[] {
  const items = (raw as { items?: unknown[] })?.items;
  if (!Array.isArray(items)) throw new Error("no items in the answer");
  const out: FuelEvent[] = [];
  const seen = new Set<string>();
  for (const it of items as Record<string, unknown>[]) {
    const used = (Array.isArray(it.used) ? it.used : []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= headlines.length);
    const title = String(it.title ?? "").replace(/\s*[—–]\s*/g, ", ").trim().slice(0, 90);
    if (!title || !used.length) continue;
    const id = slug(title);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    let lat = Number(it.lat);
    let lon = Number(it.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) {
      lat = event.lat;
      lon = event.lon;
    }
    const when = /^\d{4}-\d{2}-\d{2}/.test(String(it.when)) ? String(it.when).slice(0, 10) : "ongoing";
    out.push({
      id,
      title,
      when,
      place: String(it.place ?? event.region).slice(0, 60),
      lat,
      lon,
      what: String(it.what ?? "").replace(/\s*[—–]\s*/g, ", ").trim().slice(0, 240),
      via: String(it.via ?? "").trim().slice(0, 60),
      aspect: (String(it.aspect) in ASPECTS ? String(it.aspect) : guessAspect(`${it.via ?? ""} ${title} ${it.what ?? ""}`)) as Aspect,
      flow: it.flow === "both" ? "both" : "into",
      sources: used.map((n) => headlines[n - 1]).map((h) => ({ title: h.title, url: h.url, publisher: h.publisher })),
    });
    if (out.length >= 6) break;
  }
  return out;
}
