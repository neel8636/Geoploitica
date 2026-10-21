import { DASHED_KINDS, getEvent, neighbours, type Flow, type LinkKind } from "./events.ts";
import { ASPECTS, type Aspect } from "./fueling.ts";
import { explainFor } from "./explain.ts";

/*
  The full "How it connects" chains for one event, for the report. Server side only: pages
  call this and hand the rows to the report, so the chains never ship in browser code.
*/
export interface ConnRow {
  id: string;
  from: string;
  to: string;
  flow: Flow;
  kind: LinkKind;
  aspect: Aspect;
  family: string;
  label: string;
  via?: string;
  line: string;
  steps: string[];
  watch?: string;
}

const rank = (flow: Flow, kind: LinkKind) => (DASHED_KINDS.includes(kind) ? 3 : flow === "in" ? 0 : flow === "both" ? 1 : 2);

export function connectionsFor(eventId: string): ConnRow[] {
  const me = getEvent(eventId);
  if (!me) return [];
  return neighbours(eventId)
    .map((n): ConnRow | null => {
      const ex = explainFor(eventId, n.event.id);
      if (!ex) return null;
      const [from, to] = n.flow === "in" ? [n.event.title, me.title] : [me.title, n.event.title];
      return { id: n.event.id, from, to, flow: n.flow, kind: n.kind, aspect: n.aspect, family: ASPECTS[n.aspect]?.family ?? "people", label: ASPECTS[n.aspect]?.label ?? "", via: n.via, line: ex.line, steps: ex.steps, watch: ex.watch };
    })
    .filter((r): r is ConnRow => r !== null)
    .sort((a, b) => rank(a.flow, a.kind) - rank(b.flow, b.kind));
}
