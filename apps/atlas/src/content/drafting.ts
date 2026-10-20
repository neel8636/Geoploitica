import { LINK_WORDS, neighbours, type WorldEvent } from "./events.ts";

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

export function systemPrompt(inputs: DraftInputs): string {
  const example = { ...(inputs.example as Record<string, unknown>) };
  delete example.generated;
  return `You draft layered geopolitical reports for a reading app. Output must be a single JSON object that satisfies the TypeScript \`Dossier\` interface below exactly: every required field present, correct types, ISO dates, no extra top-level keys, no markdown fences, no commentary. Do not include a "generated" field; the caller adds it.

Rules of the house:
- Write for a smart generalist. Short sentences. Every claim that could be wrong is hedged or has a confidence entry.
- Use only facts that appear in the material or that you are highly confident of; where you must estimate, say so in the text and in evidence.confidence.
- Sources: list the real URLs given in the material. Never invent a URL. If you draw on general knowledge, cite it only with a well-known URL you are certain exists; otherwise leave it out and lower the confidence.
- The ripple rings are the heart of the report: first-order effects that follow directly, then second-order, then third-order. Each effect gets a short sector label. Three rings, 3-5 effects each.
- Predictions carry a probability (0-1), a horizon and a dated check so they can be scored later. Scenarios sum to roughly 1.
- slug must equal the event id. updated must be ${inputs.today}. status "developing" unless the event is clearly over ("stable") or is a scheduled date ("developing" still, since the run-up moves).
- readingMinutes: card 1, brief 5, deep 15-25. Keep deep.chart only if you have real numbers for a series; otherwise omit it.
- evidence.method: one paragraph saying this was drafted from the listed sources and headlines and what was estimated.

TypeScript interfaces:
${inputs.typesSource}

A finished example of the shape (content is for a different event; do not copy its facts):
${JSON.stringify(example)}`;
}

export function materialFor(event: WorldEvent, wire: WireHeadline[]): { text: string; items: WireHeadline[] } {
  const items = wire.filter((i) => i.eventIds.includes(event.id));
  const links = neighbours(event.id).map((l) =>
    l.direction === "out"
      ? `- This event ${LINK_WORDS[l.kind]} "${l.event.title}" (${l.event.id}): ${l.why}\n  ${l.event.summary}`
      : `- "${l.event.title}" (${l.event.id}) ${LINK_WORDS[l.kind]} this event: ${l.why}\n  ${l.event.summary}`,
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
  meta: { model: string; by: string; today: string },
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
  const known = new Set([...event.sources.map((s) => s.url), ...items.map((i) => i.url)]);
  const unknownSources = ((draft.evidence.sources ?? []) as { url: string }[]).filter((s) => !known.has(s.url)).map((s) => s.url);
  draft.generated = {
    by: meta.by,
    at: new Date().toISOString(),
    model: meta.model,
    sources: event.sources.length,
    headlines: items.length,
    reviewed: false,
  };
  return { draft, unknownSources };
}
