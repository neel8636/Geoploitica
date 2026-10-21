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

const ASPECT_RULES: [Aspect, RegExp][] = [
  ["energy", /\b(oil|fuel|diesel|gas|lng|energy|power|electricity|opec|brent|refin\w*|crude|petrol)\b/],
  ["trade", /\b(tariffs?|trade|exports?|imports?|shipping|ships?|ports?|freight|supply chains?|customs|suppl\w+|sanctions?|chips?|investment deals?)\b/],
  ["food", /\b(food|grain|wheat|harvests?|crops?|farm\w*|famine|fertili[sz]er)\b/],
  ["markets", /\b(bonds?|yields?|spreads?|rates?|markets?|stocks?|currenc\w+|yen|euro|ruble|dollar|investors?|banks?|borrowing|credit)\b/],
  ["budget", /\b(budgets?|deficits?|debt|tax\w*|spending|aid|subsid\w+|funding|money)\b/],
  ["jobs", /\b(strikes?|unions?|wages?|jobs?|workers?|layoffs?|pay|pensions?)\b/],
  ["living", /\b(prices?|rents?|housing|inflation|cost of living|bills?|living costs)\b/],
  ["security", /\b(military|missiles?|troops?|attacks?|clash\w*|drones?|army|navy|police|violence|war|weapons?|arms|security|deterren\w+|nuclear)\b/],
  ["displacement", /\b(refugees?|displac\w+|migra\w+|flee\w*|hunger|health|people on the move)\b/],
];

function guessAspect(text: string): Aspect {
  const t = text.toLowerCase();
  return ASPECT_RULES.find(([, re]) => re.test(t))?.[0] ?? "politics";
}

/*
  The part of the economy a connection between two events moves through, read from its
  channel ("via diesel and fuel prices" → energy), else from the reason given. So the lines
  between big events carry the same money / goods / people colours as the small fuel dots.
*/
// phrases in the link channels that the general rules would misread ("household budget" is a
// living cost, not public money; "interest bill" is the bond market)
const LINK_RULES: [Aspect, RegExp][] = [
  ["living", /household/],
  ["markets", /interest bill|money flowing|capital/],
  ["energy", /urals|quota/],
  ["trade", /compliance|eudr|cbam/],
  ["displacement", /refugee/],
  ["politics", /blockade|protest|campaign|talks|summit|vote|voters/],
];

export function linkAspect(via?: string, why?: string): Aspect {
  const t = (via ?? "").toLowerCase();
  const hit = t ? [...LINK_RULES, ...ASPECT_RULES].find(([, re]) => re.test(t))?.[0] : undefined;
  return hit ?? guessAspect(why ?? via ?? "");
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
  news?: FuelNews[]; // the event's local headlines that belong to this item (added when the site is built)
}

export interface FuelNews {
  title: string;
  url: string;
  publisher: string;
  published?: string;
}

const STOP = new Set("the a an and or of to in on at for with by from as is are was were be after over amid into its it this that new says say said leader leaders government minister president officials official report reports ahead week weekend latest live news urge urges calls".split(" "));
const words = (s: string) => new Set(s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]+/gu, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));

/*
  Divide an event's headlines among its fueling items: a headline an item cites goes to it;
  any other headline goes to the item it shares the most words with (at least two), so each
  small dot carries its own slice of the local news. What fits none is returned as "other".
*/
export function divideNews(items: FuelEvent[], headlines: FuelNews[], common = ""): { items: FuelEvent[]; other: FuelNews[] } {
  // words every headline about this event shares (its name, place, actors) say nothing about
  // which small event a story belongs to, so they are left out of the matching
  const skip = words(common);
  const keys = items.map((f) => {
    const k = words(`${f.title} ${f.what} ${f.via}`);
    for (const w of skip) k.delete(w);
    return k;
  });
  const out = items.map((f) => ({ ...f, news: [] as FuelNews[] }));
  const other: FuelNews[] = [];
  for (const h of headlines) {
    let at = items.findIndex((f) => f.sources.some((s) => s.url === h.url || s.title === h.title));
    if (at < 0) {
      const hw = words(h.title);
      for (const w of skip) hw.delete(w);
      let best = 1;
      keys.forEach((k, i) => {
        let n = 0;
        for (const w of hw) if (k.has(w)) n++;
        if (n > best) {
          best = n;
          at = i;
        }
      });
    }
    if (at >= 0) out[at].news.push(h);
    else other.push(h);
  }
  // an item's cited sources always count as its news, even when older than the headlines given
  for (const f of out) for (const s of f.sources) if (!f.news.some((n) => n.url === s.url)) f.news.push(s);
  return { items: out, other };
}

export interface FuelSet {
  at: string; // ISO time of the run
  by: string; // "pipeline" | "reader"
  items: FuelEvent[];
}

export const FUEL_SYSTEM = `You map the small events that fuel a big world event, for Geopolitica Atlas, a free site that shows how events ripple into each other.

From the numbered headlines, pick 3 to 6 distinct, concrete, smaller events that feed the big event: a strike in one city, a court ruling, a port closure, a poll, a price jump, a clash at one border post, a minister's resignation. Spread them across different parts of the economy where the headlines allow: readers see each as a coloured dot (money, goods, people), and the event's report is built around them, so aim for at least three different aspects. Never stretch a headline to reach three; two well-backed items beat three where one is invented. Rules:
- Every item must be reported by at least one of the numbered headlines; cite them by number. Never add an event, number or name that is not in the headlines.
- Only inputs: things that push the big event along. Leave out consequences, the effects the big event has elsewhere (a trade deficit it causes in another country, inflation it raises abroad); those belong in its ripple, not its fuel. Use flow "both" only when a consequence also clearly feeds back into the big event.
- One item per development: if several headlines report the same thing, make one item and cite them all.
- Skip general commentary, opinion and items that merely restate the big event.
- A scheduled event (a vote, a summit, a central-bank decision) has not happened yet: its fuel is what is shaping it in the run-up, such as a poll, a price or inflation figure, a position a government has taken, a deal being prepared, a protest.
- title: at most 8 words, concrete, no clickbait. what: one plain sentence, at most 30 words.
- via: 2 to 6 words naming what moves from the small event into the big one ("higher diesel costs", "union turnout", "investor fear").
- aspect: the part of the economy that carries it, one of: markets (bonds, rates, currencies, stocks), budget (public money, aid funding, investment), energy, trade (tariffs, shipping, supply chains), food (food supply, farming), jobs (strikes, wages, employment), living (prices, rents, cost of living), politics (votes, government, protest), security (military, violence), displacement (refugees, hunger, health).
- flow: "into" if it feeds the big event; "both" if it feeds it and is also clearly driven by it.
- place: the town or region; lat and lon: approximate coordinates of that place (city level is enough). when: the ISO date from the headline, or "ongoing".
- No em dashes.

Answer with JSON only: {"items": [{"title": "", "when": "", "place": "", "lat": 0, "lon": 0, "what": "", "via": "", "aspect": "energy", "flow": "into", "used": [1]}]}`;

export function fuelPrompt(event: WorldEvent, headlines: FuelHeadline[]): string {
  const list = headlines.map((h, n) => `${n + 1}. ${h.title} (${h.publisher}, ${h.published.slice(0, 10)})`).join("\n");
  const when = event.status === "scheduled" ? `\nStatus: scheduled for ${event.date}; map what is shaping it in the run-up` : `\nStatus: ${event.status}`;
  return `Big event: ${event.title}\nWhere: ${event.region} (lat ${event.lat}, lon ${event.lon})${when}\nSummary: ${event.summary}\n\nHeadlines, newest first:\n${list}`;
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
