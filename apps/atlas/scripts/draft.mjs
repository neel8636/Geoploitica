#!/usr/bin/env node
// Draft a full layered report (a Dossier JSON) for one event, from the event entry,
// its connections and its wire headlines, using the Claude API. The draft is written
// to src/content/dossiers/<event-id>.json for you to read, correct and register.
//
//   ANTHROPIC_API_KEY=... npm run draft -- france-debt-stress
//   npm run draft -- france-debt-stress --model claude-sonnet-4-5 --force
//
// Nothing is published automatically: the script never edits events.ts or dossiers.ts.
// After reviewing the JSON, import it in src/content/dossiers.ts and set
// dossierSlug: "<event-id>" on the event. Numbers and quotes in a draft are only as
// good as the headlines it was given; check every figure against the cited source.

import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS, LINK_WORDS, getEvent, neighbours } from "../src/content/events.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
const modelArg = args.indexOf("--model");
const MODEL = modelArg >= 0 ? args[modelArg + 1] : "claude-sonnet-4-5";
const FORCE = args.includes("--force");

if (!id) {
  console.log("usage: npm run draft -- <event-id> [--model <id>] [--force]\n\nevents:");
  for (const e of EVENTS) console.log(`  ${e.id.padEnd(32)} ${e.dossierSlug ? "(has report) " : ""}${e.title}`);
  process.exit(1);
}
const event = getEvent(id);
if (!event) {
  console.error(`no event with id "${id}"; run without arguments to list them`);
  process.exit(1);
}
const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error("ANTHROPIC_API_KEY is not set");
  process.exit(1);
}

const out = path.join(root, "src", "content", "dossiers", `${event.id}.json`);
try {
  await access(out);
  if (!FORCE) {
    console.error(`${path.relative(process.cwd(), out)} already exists; pass --force to overwrite`);
    process.exit(1);
  }
} catch {}

// --- gather material ---------------------------------------------------------

const types = await readFile(path.join(root, "src", "content", "types.ts"), "utf8");
const example = JSON.parse(await readFile(path.join(root, "src", "content", "dossiers", "france-unrest-2026.json"), "utf8"));

let wireItems = [];
try {
  const wire = JSON.parse(await readFile(path.join(root, "src", "content", "wire.json"), "utf8"));
  wireItems = wire.items.filter((i) => i.eventIds.includes(event.id));
} catch {}

const links = neighbours(event.id).map((l) =>
  l.direction === "out"
    ? `- This event ${LINK_WORDS[l.kind]} "${l.event.title}" (${l.event.id}): ${l.why}`
    : `- "${l.event.title}" (${l.event.id}) ${LINK_WORDS[l.kind]} this event: ${l.why}`,
);

const today = new Date().toISOString().slice(0, 10);

const material = `
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

WIRE HEADLINES MATCHED TO THIS EVENT (${wireItems.length})
${wireItems.map((i) => `- [${i.published.slice(0, 10)}] ${i.title} — ${i.publisher} — ${i.url}${i.summary ? `\n  ${i.summary}` : ""}`).join("\n") || "- none"}
`.trim();

const system = `You draft layered geopolitical reports for a personal reading app. Output must be a single JSON object that satisfies the TypeScript \`Dossier\` interface below exactly: every required field present, correct types, ISO dates, no extra top-level keys, no markdown fences, no commentary.

Rules of the house:
- Write for a smart generalist. Short sentences. Every claim that could be wrong is hedged or has a confidence entry.
- Use only facts that appear in the material or that you are highly confident of; where you must estimate, say so in the text and in evidence.confidence.
- Sources: list the real URLs given in the material. Never invent a URL. If you draw on general knowledge, cite it as a source with a real, well-known URL only if you are certain it exists; otherwise leave it out and lower the confidence.
- The ripple rings are the heart of the report: first-order effects that follow directly, then second-order, then third-order. Each effect gets a short sector label.
- Predictions carry a probability (0-1), a horizon, and a dated check so they can be scored later.
- Scenarios sum to a probability of roughly 1.
- slug must equal the event id. updated must be ${today}. status "developing" unless the event is clearly over.
- readingMinutes: card 1, brief 5, deep 15-25.
- Keep deep.chart only if you have real numbers for a series; otherwise omit it.

TypeScript interfaces:
${types}

A finished example of the shape (content is for a different event; do not copy its facts):
${JSON.stringify(example)}`;

// --- call the API ------------------------------------------------------------

console.log(`drafting "${event.title}" with ${MODEL} from ${event.sources.length} sources, ${links.length} connections and ${wireItems.length} headlines…`);

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: `Draft the dossier for this event. Return only the JSON object.\n\n${material}` }],
  }),
});
if (!res.ok) {
  console.error(`API error ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const body = await res.json();
const text = body.content.filter((c) => c.type === "text").map((c) => c.text).join("");

// Tolerate a stray fence or preamble.
const start = text.indexOf("{");
const end = text.lastIndexOf("}");
if (start < 0 || end < 0) {
  console.error("the model did not return a JSON object:\n" + text.slice(0, 500));
  process.exit(1);
}
let draft;
try {
  draft = JSON.parse(text.slice(start, end + 1));
} catch (err) {
  console.error(`could not parse the draft as JSON: ${err.message}`);
  await writeFile(out + ".raw.txt", text);
  console.error(`raw output saved to ${path.relative(process.cwd(), out)}.raw.txt`);
  process.exit(1);
}

// --- light validation ----------------------------------------------------------

const problems = [];
const need = (obj, keys, where) => {
  for (const k of keys) if (obj?.[k] === undefined) problems.push(`${where}.${k} missing`);
};
need(draft, ["slug", "title", "deck", "updated", "status", "region", "tags", "readingMinutes", "card", "brief", "deep", "evidence"], "dossier");
need(draft.card, ["headline", "keyNumber", "impactMeter", "forYou", "ripple"], "card");
need(draft.brief, ["whatHappened", "whyItMatters", "winners", "losers", "whatsNext", "predict", "recap"], "brief");
need(draft.deep, ["timeline", "causes", "stakeholders", "sectors", "dailyLife", "scenarios", "predictions", "countermeasures", "analogues", "watch"], "deep");
need(draft.evidence, ["sources", "confidence", "method", "changeLog"], "evidence");
if (draft.slug !== event.id) {
  problems.push(`slug "${draft.slug}" set to "${event.id}"`);
  draft.slug = event.id;
}
const known = new Set([...event.sources.map((s) => s.url), ...wireItems.map((i) => i.url)]);
for (const s of draft.evidence?.sources ?? []) {
  if (!known.has(s.url)) problems.push(`source not in the material, verify it exists: ${s.url}`);
}

await writeFile(out, JSON.stringify(draft, null, 2) + "\n");

console.log(`\nwrote ${path.relative(process.cwd(), out)} (${(body.usage?.output_tokens ?? 0).toLocaleString()} output tokens)`);
if (problems.length) {
  console.log("\ncheck before publishing:");
  for (const p of problems) console.log(`  - ${p}`);
}
console.log(`
next:
  1. read the file; fix facts, tighten wording, delete anything you cannot stand behind
  2. import it in src/content/dossiers.ts and add it to the registry
  3. set dossierSlug: "${event.id}" on the event in src/content/events.ts
  4. npm run build, then open /events/${event.id}`);
