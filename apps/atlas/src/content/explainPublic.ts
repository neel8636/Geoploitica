import data from "./explain-public.json" with { type: "json" };

/*
  The free part of each connection, for anything that runs in the browser (the map, postcards,
  event pages): the hook, the first step, and how much more the report holds. The full chains
  (explain.json) stay out of the browser code; only the report renders them.
  scripts/explain.mjs writes this file from explain.json.
*/
export interface Teaser {
  hook: string;
  first: string;
  more: number; // steps left for the report
  watch: boolean; // the report also says what to watch
}

const ALL = data as Record<string, Teaser>;
export function teaserFor(a: string, b: string): Teaser | undefined {
  return ALL[[a, b].sort().join("~")];
}
