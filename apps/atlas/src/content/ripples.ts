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
  updated: string; // ISO date the card's content last changed
}

const DAY = 86_400_000;

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

function freshFor(e: WorldEvent, wire: Wire) {
  const id = e.id;
  const now = Date.parse(wire.fetchedAt ?? "") || 0;
  const items = wire.items
    .map((i) => ({ ...i, hits: i.eventIds.includes(id) ? namesEvent(i.title, e) : 0 }))
    .filter((i) => i.hits > 0)
    // items without a real date carry the fetch time; they say nothing about freshness
    .filter((i) => i.published !== wire.fetchedAt && now - Date.parse(i.published) < 2 * DAY && Date.parse(i.published) <= now + 3_600_000)
    .sort((a, b) => (a.published < b.published ? 1 : -1));
  // the card's "latest" is the newest headline that names the event most clearly
  const best = Math.max(0, ...items.map((i) => i.hits));
  return { n: items.length, latest: items.find((i) => i.hits === best) };
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
    updated: own?.updated ?? e.date,
  };
}

export function allRipples(): RippleCard[] {
  const wire = loadWire();
  return EVENTS.map((e) => rippleFor(e, wire));
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
