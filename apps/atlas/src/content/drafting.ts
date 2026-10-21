import { LINK_WORDS, neighbours, type WorldEvent } from "./events.ts";
import { ASPECTS, type FuelEvent } from "./fueling.ts";

/*
  The report generator, shared by the draft script (batch, in CI) and the enterprise
  edition's on-demand endpoint. Pure functions only: the caller reads files and talks to
  the API, so this module runs under Node's type stripping and inside Next alike.
*/

export interface WireHeadline {
  title: string;
  url: string;
  publisher: string;
  published: string;
  summary?: string;
  eventIds: string[];
}

export interface DraftInputs {
  typesSource: string; // the text of types.ts, so the model sees the exact interface
  example: unknown; // a finished dossier to copy the shape of
  wire: WireHeadline[];
  today: string; // ISO date
}

export const DEFAULT_MODEL = "claude-sonnet-5-5";

/*
  How big a report the reader asks for. Every size keeps the same four layers (card, brief,
  deep dive, evidence), so the format never changes; the size sets how much goes in each.
*/
export type ReportSize = "snapshot" | "brief" | "deep";
export const REPORT_SIZES: Record<ReportSize, { label: string; minutes: number; blurb: string; maxTokens: number; rules: string }> = {
  snapshot: {
    label: "Snapshot",
    minutes: 3,
    blurb: "The 30-second card and a short brief, with the deep dive kept to the essentials.",
    maxTokens: 8000,
    rules: `SIZE: snapshot. Keep every layer but make it short. Ripple: three rings, 3 effects each. Brief: 1-2 short paragraphs per section, 2 winners, 2 losers, 2 recap questions. Deep: 3-4 timeline entries, 2 cause layers, 3 stakeholders, one sector per fuel aspect, 2 daily-life items, 2-3 scenarios, 2 predictions, 2 countermeasures, 1 analogue, 3 watch items; no chart. readingMinutes: card 1, brief 2, deep 4.`,
  },
  brief: {
    label: "Standard",
    minutes: 10,
    blurb: "The card, the full five-minute brief, and a focused deep dive.",
    maxTokens: 12000,
    rules: `SIZE: standard. Ripple: three rings, 3-4 effects each. Brief: full. Deep: 5-7 timeline entries, 3 cause layers, 4-5 stakeholders, 4-5 sectors, 3 daily-life items, 3 scenarios, 3 predictions, 3 countermeasures, 2 analogues, 4 watch items. readingMinutes: card 1, brief 5, deep 8-10.`,
  },
  deep: {
    label: "Deep dive",
    minutes: 25,
    blurb: "Everything: the full brief and every deep-dive module at full depth, with the evidence.",
    maxTokens: 16000,
    rules: `SIZE: deep dive. Ripple: three rings, 3-5 effects each. Brief: full. Deep: every module at full depth (8+ timeline entries, 5-7 stakeholders, 5-7 sectors, 3-4 scenarios, 4-5 predictions, 3 analogues, 5+ watch items). readingMinutes: card 1, brief 5, deep 15-25.`,
  },
};
export const isReportSize = (s: unknown): s is ReportSize => typeof s === "string" && s in REPORT_SIZES;

export function systemPrompt(inputs: DraftInputs, size: ReportSize = "deep"): string {
  const example = { ...(inputs.example as Record<string, unknown>) };
  delete example.generated;
  return `You draft layered geopolitical reports for a reading app. Output must be a single JSON object that satisfies the TypeScript \`Dossier\` interface below exactly: every required field present, correct types, ISO dates, no extra top-level keys, no markdown fences, no commentary. Do not include a "generated" field; the caller adds it.

Rules of the house:
- Write for a smart generalist. Short sentences. Every claim that could be wrong is hedged or has a confidence entry.
- Use only facts that appear in the material or that you are highly confident of; where you must estimate, say so in the text and in evidence.confidence.
- Sources: list the real URLs given in the material. Never invent a URL. If you draw on general knowledge, cite it only with a well-known URL you are certain exists; otherwise leave it out and lower the confidence.
- The ripple rings are the heart of the report: first-order effects that follow directly, then second-order, then third-order. Each effect gets a short sector label. Three rings; how many effects per ring is set by SIZE below.
- Predictions carry a probability (0-1), a horizon and a dated check so they can be scored later. Scenarios sum to roughly 1.
- slug must equal the event id. updated must be ${inputs.today}. status "developing" unless the event is clearly over ("stable") or is a scheduled date ("developing" still, since the run-up moves).
- readingMinutes: as SIZE below says. Keep deep.chart only if you have real numbers for a series; otherwise omit it.
- evidence.method: one paragraph saying this was drafted from the listed sources and headlines and what was estimated.
- fuel: the spine of the report. 3 to 5 entries, one per part of the economy that is feeding the event, taken from WHAT'S FUELING IT and the connections in the material (each connection notes what it moves through). Use at least three different aspects when the material supports it, never invent one to reach three. Then build the report around them: brief.whyItMatters takes each fuel aspect in turn, deep.sectors covers the sector each one feeds, and the first ripple ring's sector labels use them where they fit. Keep every fact sourced; sourceIndex points into evidence.sources.
- ${REPORT_SIZES[size].rules}

TypeScript interfaces:
${inputs.typesSource}

A finished example of the shape (content is for a different event; do not copy its facts):
${JSON.stringify(example)}`;
}

export function materialFor(event: WorldEvent, wire: WireHeadline[], fuel: FuelEvent[] = []): { text: string; items: WireHeadline[] } {
  const items = wire.filter((i) => i.eventIds.includes(event.id));
  const through = (l: { via?: string; aspect: keyof typeof ASPECTS }) => `\n  moves through: ${ASPECTS[l.aspect].label} (${l.aspect})${l.via ? `, via ${l.via}` : ""}`;
  const links = neighbours(event.id).map((l) =>
    l.direction === "out"
      ? `- This event ${LINK_WORDS[l.kind]} "${l.event.title}" (${l.event.id}): ${l.why}${through(l)}\n  ${l.event.summary}`
      : `- "${l.event.title}" (${l.event.id}) ${LINK_WORDS[l.kind]} this event: ${l.why}${through(l)}\n  ${l.event.summary}`,
  );
  const fueling = fuel.map(
    (f) => `- [${f.aspect}: ${ASPECTS[f.aspect]?.label ?? f.aspect}] ${f.title} (${f.place}${f.when !== "ongoing" ? `, ${f.when}` : ""}): ${f.what} Moves in: ${f.via}.${f.sources.length ? `\n  ${f.sources.map((s) => `${s.publisher} — ${s.url}`).join("; ")}` : ""}`,
  );
  const text = `
EVENT
id: ${event.id}
title: ${event.title}
type: ${event.type}; status: ${event.status}; date: ${event.date}; region: ${event.region}; countries: ${event.countries.join(", ")}
severity: ${event.severity}/5
summary: ${event.summary}

CONNECTIONS (already judged; keep them consistent)
${links.join("\n") || "- none recorded"}

WHAT'S FUELING IT (small developments in the latest news, by the part of the economy they move through)
${fueling.join("\n") || "- not mapped yet; work the fuel out from the headlines and connections"}

SOURCES CITED ON THE EVENT
${event.sources.map((s) => `- ${s.title} — ${s.publisher}${s.date ? `, ${s.date}` : ""} — ${s.url}`).join("\n")}

WIRE HEADLINES MATCHED TO THIS EVENT (${items.length})
${items.map((i) => `- [${i.published.slice(0, 10)}] ${i.title} — ${i.publisher} — ${i.url}${i.summary ? `\n  ${i.summary}` : ""}`).join("\n") || "- none"}
`.trim();
  return { text, items };
}

export function userPrompt(materialText: string): string {
  return `Draft the dossier for this event. Return only the JSON object.\n\n${materialText}`;
}

// The first complete JSON object in a reply, found by brace depth (string-aware), so a
// trailing remark or a second object after the report does not break the parse.
export function extractJson(text: string): string {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("no JSON object in the reply");
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("JSON object in the reply is not closed");
}

/* Checks a draft has every layer, stamps slug/updated/generated, and reports unknown sources. */
export function finishDraft(
  raw: unknown,
  event: WorldEvent,
  items: WireHeadline[],
  meta: { model: string; by: string; today: string; size?: ReportSize },
  extraSources: string[] = [], // further URLs given in the material (the fuel items' headlines)
): { draft: Record<string, unknown>; unknownSources: string[] } {
  const draft = raw as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const problems: string[] = [];
  const need = (obj: Record<string, unknown> | undefined, keys: string[], where: string) => {
    for (const k of keys) if (obj?.[k] === undefined) problems.push(`${where}.${k} missing`);
  };
  need(draft, ["slug", "title", "deck", "updated", "status", "region", "tags", "readingMinutes", "card", "brief", "deep", "evidence"], "dossier");
  need(draft.card, ["headline", "keyNumber", "impactMeter", "forYou", "ripple"], "card");
  need(draft.brief, ["whatHappened", "whyItMatters", "winners", "losers", "whatsNext", "predict", "recap"], "brief");
  need(draft.deep, ["timeline", "causes", "stakeholders", "sectors", "dailyLife", "scenarios", "predictions", "countermeasures", "analogues", "watch"], "deep");
  need(draft.evidence, ["sources", "confidence", "method", "changeLog"], "evidence");
  if (problems.length) throw new Error("incomplete draft: " + problems.join("; "));

  draft.slug = event.id;
  draft.updated = meta.today;
  // the fuel spine: keep entries with a known aspect and some text, at most five
  if (Array.isArray(draft.fuel)) {
    draft.fuel = (draft.fuel as Record<string, unknown>[])
      .filter((f) => typeof f?.aspect === "string" && f.aspect in ASPECTS && typeof f.title === "string" && typeof f.how === "string")
      .slice(0, 5);
    if (!draft.fuel.length) delete draft.fuel;
  } else delete draft.fuel;
  const known = new Set([...event.sources.map((s) => s.url), ...items.map((i) => i.url), ...extraSources]);
  const unknownSources = ((draft.evidence.sources ?? []) as { url: string }[]).filter((s) => !known.has(s.url)).map((s) => s.url);
  draft.generated = {
    by: meta.by,
    at: new Date().toISOString(),
    model: meta.model,
    sources: event.sources.length,
    headlines: items.length,
    reviewed: false,
    ...(meta.size ? { size: meta.size } : {}),
  };
  return { draft, unknownSources };
}
