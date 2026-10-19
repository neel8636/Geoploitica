// The event graph. One node per world event worth tracking; edges say how events connect.
// Keep this file the single source of truth; the wire and the draft-report script read it.

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
}

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
}

export const TYPE_LABELS: Record<EventType, string> = {
  unrest: "Unrest", conflict: "Conflict", election: "Election", economy: "Economy", markets: "Markets",
  energy: "Energy", regulation: "Regulation", diplomacy: "Diplomacy", trade: "Trade", disaster: "Disaster", security: "Security",
};

import { EUROPE } from "./events/europe.ts";
import { AMERICAS } from "./events/americas.ts";
import { ASIA_PACIFIC } from "./events/asia-pacific.ts";
import { MEA } from "./events/middle-east-africa.ts";

// All events, in region files under ./events. Order does not matter; ids must be unique.
export const EVENTS: WorldEvent[] = [...EUROPE, ...AMERICAS, ...ASIA_PACIFIC, ...MEA];

export function getEvent(id: string): WorldEvent | undefined {
  return EVENTS.find((e) => e.id === id);
}

/* Edges in both directions, de-duplicated, so the map can draw each connection once. */
export function allEdges(): { a: string; b: string; kind: LinkKind; why: string }[] {
  const seen = new Set<string>();
  const out: { a: string; b: string; kind: LinkKind; why: string }[] = [];
  for (const e of EVENTS) {
    for (const l of e.links) {
      const key = [e.id, l.to].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ a: e.id, b: l.to, kind: l.kind, why: l.why });
    }
  }
  return out;
}

/* Everything connected to one event: outgoing links plus events that link to it. */
export function neighbours(id: string): { event: WorldEvent; kind: LinkKind; why: string; direction: "out" | "in" }[] {
  const me = getEvent(id);
  if (!me) return [];
  const out = me.links
    .map((l) => ({ event: getEvent(l.to), kind: l.kind, why: l.why, direction: "out" as const }))
    .filter((x): x is { event: WorldEvent; kind: LinkKind; why: string; direction: "out" } => Boolean(x.event));
  const ins = EVENTS.flatMap((e) =>
    e.links.filter((l) => l.to === id).map((l) => ({ event: e, kind: l.kind, why: l.why, direction: "in" as const })),
  ).filter((x) => !out.some((o) => o.event.id === x.event.id));
  return [...out, ...ins];
}
