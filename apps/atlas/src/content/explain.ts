import data from "./explain.json" with { type: "json" };

/*
  Every connection on the map, in plain words. Two layers:
    hook   one short, accurate line that makes a reader want the rest (free, on the map)
    steps  the chain from cause to effect, three short steps; the map shows only the first
    watch  the one thing to watch next
    line   the whole connection in a sentence (the report's lead for it)
  The full chain and "watch" live in the event's report, behind a free account. Keyed by the
  two event ids, sorted and joined with "~", so either direction finds it. Written by hand
  for the current graph; scripts/explain.mjs drafts any new connection with Claude.
*/
export interface Explain {
  hook: string;
  line: string;
  steps: string[];
  watch?: string;
}

const ALL = data as Record<string, Explain>;
export const pairKey = (a: string, b: string) => [a, b].sort().join("~");
export function explainFor(a: string, b: string): Explain | undefined {
  return ALL[pairKey(a, b)];
}
