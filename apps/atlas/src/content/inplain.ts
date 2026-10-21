import data from "./inplain.json" with { type: "json" };
import { DASHED_KINDS, getEvent, neighbours } from "./events.ts";
import { explainFor } from "./explain.ts";

/*
  Every view of an event opens with a short summary in plain words, so a reader gets the point
  before any detail:
    - quick:   what happened, why it matters, what comes next (one sentence each)
    - connect: how the event connects to what feeds it and what it moves, in three short
               paragraphs (the "Brazil sells Europe a lot of soy…" style)
    - report:  what the event's report says, in three short paragraphs
  scripts/inplain.mjs drafts them with Claude in the hourly run and redrafts when the event, its
  links or its report change. Until an event has them, these fall back to what is already
  written (the summary's sentences, the connections' one-line explanations). Server side only:
  pages pass the text into the views, which sit behind a free account.
*/
export interface Plain {
  title: string;
  paras: string[];
}
export interface QuickPoint {
  label: string;
  text: string;
}
type Stored = {
  sum: string;
  quick?: { happened: string; matters: string; next: string };
  connect?: Plain;
  report?: Plain;
};
const ALL = data as Record<string, Stored>;

const sentences = (s: string) =>
  s
    .split(/(?<=[.!?])\s+(?=[A-Z0-9'"‘“])/)
    .map((t) => t.trim())
    .filter(Boolean);

export function quickPoints(id: string): QuickPoint[] {
  const q = ALL[id]?.quick;
  if (q?.happened && q.matters && q.next)
    return [
      { label: "What happened", text: q.happened },
      { label: "Why it matters", text: q.matters },
      { label: "What comes next", text: q.next },
    ];
  const s = sentences(getEvent(id)?.summary ?? "");
  const labels = ["What happened", "The background", "What comes next"];
  return s.slice(0, 3).map((text, i) => ({ label: labels[i], text }));
}

export function connectInPlain(id: string): Plain | null {
  const c = ALL[id]?.connect;
  if (c?.paras?.length) return c;
  const me = getEvent(id);
  if (!me) return null;
  const lines = neighbours(id)
    .filter((n) => !DASHED_KINDS.includes(n.kind))
    .map((n) => explainFor(id, n.event.id)?.line)
    .filter((l): l is string => Boolean(l))
    .slice(0, 3);
  return lines.length ? { title: `How ${me.title} connects, in plain words`, paras: lines } : null;
}

export function reportInPlain(id: string): Plain | null {
  const r = ALL[id]?.report;
  return r?.paras?.length ? r : null;
}
