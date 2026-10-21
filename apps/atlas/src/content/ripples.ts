import fs from "node:fs";
import path from "node:path";
import { EVENTS, TYPE_LABELS, neighbours, type WorldEvent } from "@/content/events";
import { getDossier } from "@/content/dossiers";
import { loadWire, type Wire } from "@/content/wire";
import type { RippleRing } from "@/content/types";

/*
  One "ripple card" per event: what the postcard pop-up and Today's ripples show. Built at
  export time (the site rebuilds every hour) from the event, its own report when it has one,
  and the wire. Server-only; the browser gets it as /ripples.json.
*/
export interface RippleCard {
  id: string;
  title: string;
  kicker: string; // type · region · status
  headline: string; // one line: the report's card headline, or the event summary's first sentence
  keyNumber?: { value: string; label: string };
  impact: number; // 1-5
  rings: RippleRing[];
  trust: "reviewed" | "checked" | "auto" | "outdated" | "none"; // how far the report has been checked
  fresh: number; // matched headlines published in the 48 hours before the latest wire pull
  latest?: { title: string; publisher: string; url: string }; // the newest of them
  pulse: Pulse; // how fast the news on this event is moving
  recent: { title: string; publisher: string; url: string; published: string }[]; // newest first, up to 12
  update?: EventUpdate; // the latest AI line on what changed, when there is one
  incoming?: { id: string; title: string; day: number; via?: string }[]; // rising events that drive this one
  updated: string; // ISO date the card's content last changed
}

const DAY = 86_400_000;

export interface Pulse {
  day: number; // headlines in the last 24 hours
  perDay: number; // average per day over the three days before that
  trend: "rising" | "steady" | "cooling" | "quiet";
}

export interface EventUpdate {
  at: string; // ISO
  text: string; // one or two sentences: what changed
  sources: { title: string; url: string; publisher: string }[];
}

let updatesCache: Record<string, EventUpdate[]> | null = null;
export function loadUpdates(): Record<string, EventUpdate[]> {
  if (updatesCache) return updatesCache;
  try {
    updatesCache = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src", "content", "updates.json"), "utf8")) as Record<string, EventUpdate[]>;
  } catch {
    updatesCache = {};
  }
  return updatesCache;
}

function firstSentence(s: string): string {
  const m = /^(.+?[.!?])(\s|$)/.exec(s);
  return (m ? m[1] : s).slice(0, 220);
}

// The wire matches on title and summary, which is loose; a card only counts and shows headlines
// whose own title names the event (one of its keywords, as a whole word).
function namesEvent(title: string, e: WorldEvent): number {
  const t = title.toLowerCase();
  return e.keywords.filter((k) => new RegExp(`(^|[^\\p{L}])${k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`, "u").test(t)).length;
}

// Headlines that belong to an event: found by its own local-news search, or matched by the
// world feeds with the event named in the title.
function headlinesFor(e: WorldEvent, wire: Wire) {
  const now = Date.parse(wire.fetchedAt ?? "") || 0;
  return wire.items
    .map((i) => ({ ...i, hits: i.found === e.id ? 3 : i.eventIds.includes(e.id) ? namesEvent(i.title, e) : 0 }))
    .filter((i) => i.hits > 0)
    // items without a real date carry the fetch time; they say nothing about freshness
    .filter((i) => i.published !== wire.fetchedAt && Date.parse(i.published) <= now + 3_600_000)
    .sort((a, b) => (a.published < b.published ? 1 : -1));
}

function freshFor(e: WorldEvent, wire: Wire) {
  const now = Date.parse(wire.fetchedAt ?? "") || 0;
  const all = headlinesFor(e, wire);
  const age = (i: { published: string }) => now - Date.parse(i.published);
  const items = all.filter((i) => age(i) < 2 * DAY);
  const day = all.filter((i) => age(i) < DAY).length;
  const before = all.filter((i) => age(i) >= DAY && age(i) < 4 * DAY).length / 3;
  const trend: Pulse["trend"] = day === 0 && before < 0.5 ? "quiet" : day >= Math.max(4, before * 1.8) ? "rising" : day <= before * 0.5 ? "cooling" : "steady";
  // the card's "latest" is the newest headline that names the event most clearly
  const best = Math.max(0, ...items.map((i) => i.hits));
  return {
    n: items.length,
    latest: items.find((i) => i.hits === best),
    pulse: { day, perDay: Math.round(before * 10) / 10, trend },
    recent: all.slice(0, 12).map((i) => ({ title: i.title, publisher: i.publisher, url: i.url, published: i.published })),
  };
}

export function rippleFor(e: WorldEvent, wire: Wire = loadWire()): RippleCard {
  const d = getDossier(e.id);
  const own = d?.slug === e.id ? d : undefined;
  const links = neighbours(e.id);
  const rings: RippleRing[] = own
    ? own.card.ripple
    : [
        { label: "Directly linked", effects: links.filter((l) => ["causes", "affects", "responds_to"].includes(l.kind)).map((l) => ({ text: `${l.event.title}: ${l.why}`, sector: l.event.region })) },
        { label: "Shared drivers", effects: links.filter((l) => ["shares_driver", "amplifies", "competes_with"].includes(l.kind)).map((l) => ({ text: `${l.event.title}: ${l.why}`, sector: l.event.region })) },
      ].filter((r) => r.effects.length > 0);
  const g = own?.generated;
  const trust: RippleCard["trust"] = !own ? "none" : g?.outdated ? "outdated" : !g || g.reviewed ? "reviewed" : g.sourceChecked ? "checked" : "auto";
  const f = freshFor(e, wire);
  const status = e.status === "scheduled" ? "coming up" : e.status;
  return {
    id: e.id,
    title: own?.title ?? e.title,
    kicker: `${TYPE_LABELS[e.type]} · ${e.region} · ${status}`,
    headline: own && trust !== "outdated" ? own.card.headline : firstSentence(e.summary),
    keyNumber: own && trust !== "outdated" ? { value: own.card.keyNumber.value, label: own.card.keyNumber.label } : undefined,
    impact: own && trust !== "outdated" ? own.card.impactMeter : e.severity,
    rings,
    trust,
    fresh: f.n,
    latest: f.latest ? { title: f.latest.title, publisher: f.latest.publisher, url: f.latest.url } : undefined,
    pulse: f.pulse,
    recent: f.recent,
    update: loadUpdates()[e.id]?.[0],
    updated: own?.updated ?? e.date,
  };
}

let cache: { at: string | null; cards: RippleCard[] } | null = null;
export function allRipples(): RippleCard[] {
  const wire = loadWire();
  if (cache && cache.at === wire.fetchedAt) return cache.cards;
  const first = EVENTS.map((e) => rippleFor(e, wire));
  // a ripple incoming: a connected event that drives this one and whose news is rising
  const byId = new Map(first.map((c) => [c.id, c]));
  const cards = first.map((c) => ({
    ...c,
    incoming: neighbours(c.id)
      .filter((n) => (n.flow === "in" || n.flow === "both") && byId.get(n.event.id)?.pulse.trend === "rising")
      .map((n) => ({ id: n.event.id, title: n.event.title, day: byId.get(n.event.id)!.pulse.day, via: n.via })),
  }));
  cache = { at: wire.fetchedAt, cards };
  return cards;
}

export function pulseMap(): Record<string, Pulse["trend"]> {
  return Object.fromEntries(allRipples().map((r) => [r.id, r.pulse.trend]));
}

/*
  Today's ripples: the events the news is moving on right now. Ranked by fresh headlines,
  then severity, then how far the report has been checked; recomputed on every hourly build,
  so the set changes as the news does. Only events with a ripple worth showing qualify.
*/
export function todaysRipples(n = 5): RippleCard[] {
  const trustScore = { reviewed: 3, checked: 3, auto: 1, outdated: -5, none: 0 } as const;
  const severity = new Map(EVENTS.map((e) => [e.id, e.severity]));
  return allRipples()
    .filter((r) => r.rings.length >= 2 && r.trust !== "outdated")
    .map((r) => ({ r, score: Math.min(r.fresh, 8) * 3 + (severity.get(r.id) ?? 0) * 2 + trustScore[r.trust] }))
    .sort((a, b) => b.score - a.score || a.r.id.localeCompare(b.r.id))
    .slice(0, n)
    .map((x) => x.r);
}
