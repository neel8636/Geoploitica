import data from "./plain.json" with { type: "json" };
import { getEvent } from "./events.ts";

/*
  Each event's ripple in one plain sentence: what feeds it and what it moves next. It is the
  headline of the event page, above the event's formal title. Written by hand for the current
  events; scripts/explain.mjs drafts one for any new event.
*/
const ALL = data as Record<string, string>;
export function plainHeadline(id: string): string {
  const own = ALL[id];
  if (own) return own;
  const s = getEvent(id)?.summary ?? "";
  return s.split(/(?<=\.)\s/)[0] ?? s;
}
