// The event graph. One node per world event worth tracking; edges say how events connect.
// Keep this file the single source of truth; the wire and the draft-report script read it.

import { linkAspect, type Aspect } from "./fueling.ts";

export type EventType =
  | "unrest" | "conflict" | "election" | "economy" | "markets" | "energy" | "regulation"
  | "diplomacy" | "trade" | "disaster" | "security";

export type LinkKind = "causes" | "amplifies" | "responds_to" | "shares_driver" | "affects" | "competes_with";

export const LINK_WORDS: Record<LinkKind, string> = {
  causes: "feeds into",
  amplifies: "amplifies",
  responds_to: "is a response to",
  shares_driver: "shares a driver with",
  affects: "affects",
  competes_with: "competes with",
};

export interface Source { title: string; url: string; publisher: string; date?: string }

export interface Link {
  to: string; // event id
  kind: LinkKind;
  why: string; // one sentence
  via?: string; // the channel the ripple travels through, read after "via": "fuel and freight prices"
  driver?: string; // a DRIVERS id: the force behind a dotted link (or behind a solid one, when obvious)
}

// How each kind of line reads, in plain words: what the reader should take from it.
export const DASHED_KINDS: LinkKind[] = ["shares_driver", "competes_with"];
export const KIND_HELP: Record<LinkKind, string> = {
  causes: "One is part of the reason the other is happening.",
  affects: "One changes the other's course or odds, without having started it.",
  responds_to: "One is happening because of the other.",
  amplifies: "The other was already happening; this one makes it bigger or spreads it.",
  shares_driver: "Neither caused the other: the same underlying force is pushing both.",
  competes_with: "Both pull on the same limited thing, so a gain for one is a loss for the other.",
};

export interface WorldEvent {
  id: string;
  title: string;
  type: EventType;
  date: string; // ISO; the date of the latest development
  status: "developing" | "scheduled" | "stable";
  region: string;
  lat: number;
  lon: number;
  countries: string[]; // ISO-2
  summary: string; // two sentences, plain
  severity: 1 | 2 | 3 | 4 | 5;
  keywords: string[]; // lower-case; the wire matcher uses these
  links: Link[];
  dossierSlug?: string; // a full layered report exists
  sources: Source[];
  auto?: AutoAdded; // added by the pipeline from the news (scripts/discover.mjs), not by hand
}

/* Why the pipeline added an event: the ripple test it passed. */
export interface AutoAdded {
  addedAt: string; // ISO
  reason: string; // one sentence: why it passes the ripple test
  channel: string; // what moves across the border
  reaches: string[]; // ISO-2 codes outside the origin
  headlines: number; // how many headlines backed it when it was added
  publishers: number;
}

export const TYPE_LABELS: Record<EventType, string> = {
  unrest: "Unrest", conflict: "Conflict", election: "Election", economy: "Economy", markets: "Markets",
  energy: "Energy", regulation: "Regulation", diplomacy: "Diplomacy", trade: "Trade", disaster: "Disaster", security: "Security",
};

import { EUROPE } from "./events/europe.ts";
import { AMERICAS } from "./events/americas.ts";
import { ASIA_PACIFIC } from "./events/asia-pacific.ts";
import { MEA } from "./events/middle-east-africa.ts";
import discovered from "./events/discovered.json" with { type: "json" };

// Events the pipeline added from the news after they passed the ripple test (scripts/discover.mjs).
export const DISCOVERED: WorldEvent[] = (discovered as unknown as { events: WorldEvent[] }).events;

// All events, in region files under ./events plus the discovered ones. Order does not matter; ids must be unique.
export const EVENTS: WorldEvent[] = [...EUROPE, ...AMERICAS, ...ASIA_PACIFIC, ...MEA, ...DISCOVERED];

export function getEvent(id: string): WorldEvent | undefined {
  return EVENTS.find((e) => e.id === id);
}

/* Edges in both directions, de-duplicated, so the map can draw each connection once. */
export interface Edge { a: string; b: string; kind: LinkKind; why: string; via?: string; driver?: string; flow: Flow; aspect: Aspect } // flow seen from a; aspect: what moves along it

export function allEdges(): Edge[] {
  const seen = new Set<string>();
  const out: Edge[] = [];
  for (const e of EVENTS) {
    for (const l of e.links) {
      const key = [e.id, l.to].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ a: e.id, b: l.to, kind: l.kind, why: l.why, via: l.via, driver: l.driver, flow: flowBetween(e.id, l.to), aspect: linkAspect(l.via, l.why) });
    }
  }
  return out;
}

/* Everything connected to one event: outgoing links plus events that link to it. */
export interface Neighbour {
  event: WorldEvent;
  kind: LinkKind;
  why: string;
  via?: string;
  driver?: string;
  direction: "out" | "in"; // which event's record holds the link
  flow: Flow; // which way the effect travels, seen from the event being looked at
  aspect: Aspect; // the part of the economy it moves through (money, goods or people)
}

/*
  Which way a ripple travels. "out": this event drives the other; "in": the other drives this
  one; "both": each drives the other (links recorded both ways); "shared": a dotted line, no
  direction, a common driver pushes both. Read from what each link means, not from which
  event's record it sits in: "A is a response to B" is an effect running from B to A.
*/
export type Flow = "out" | "in" | "both" | "shared";

function effectsBetween(a: string, b: string): { ab: boolean; ba: boolean; shared: boolean } {
  const r = { ab: false, ba: false, shared: false };
  const mark = (from: string, l: Link) => {
    const other = l.to;
    if (DASHED_KINDS.includes(l.kind)) {
      r.shared = true;
      return;
    }
    // causes, affects, amplifies run from the record's event to the other; responds_to the reverse
    const forward = l.kind !== "responds_to";
    const src = forward ? from : other;
    if (src === a) r.ab = true;
    else r.ba = true;
  };
  for (const l of getEvent(a)?.links ?? []) if (l.to === b) mark(a, l);
  for (const l of getEvent(b)?.links ?? []) if (l.to === a) mark(b, l);
  return r;
}

export function flowBetween(me: string, other: string): Flow {
  const r = effectsBetween(me, other);
  if (r.ab && r.ba) return "both";
  if (r.ab) return "out";
  if (r.ba) return "in";
  return "shared";
}

export function neighbours(id: string): Neighbour[] {
  const me = getEvent(id);
  if (!me) return [];
  const out: Neighbour[] = [];
  for (const l of me.links) {
    const event = getEvent(l.to);
    if (event) out.push({ event, kind: l.kind, why: l.why, via: l.via, driver: l.driver, direction: "out", flow: flowBetween(id, event.id), aspect: linkAspect(l.via, l.why) });
  }
  const ins: Neighbour[] = EVENTS.flatMap((e) =>
    e.links.filter((l) => l.to === id).map((l) => ({ event: e, kind: l.kind, why: l.why, via: l.via, driver: l.driver, direction: "in" as const, flow: flowBetween(id, e.id), aspect: linkAspect(l.via, l.why) })),
  ).filter((x) => !out.some((o) => o.event.id === x.event.id));
  return [...out, ...ins];
}

/* The sentence a connection reads as, from the point of view of the event being looked at. */
export function linkPhrase(n: Pick<Neighbour, "kind" | "direction">): string {
  const w = LINK_WORDS[n.kind];
  if (DASHED_KINDS.includes(n.kind) || n.direction === "out") return `This ${w}`;
  return `${w[0].toUpperCase()}${w.slice(1)} this`;
}
