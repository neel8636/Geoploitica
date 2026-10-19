#!/usr/bin/env node
// Draft full layered reports (Dossier JSON) for events, from each event's entry, its
// connections and its wire headlines, using the Claude API. Drafts are written to
// src/content/dossiers/<event-id>.json and are live on the next build. Each carries a
// `generated` marker so the site labels it as auto-drafted until someone reviews it.
//
//   npm run draft -- <event-id>            one event (refuses to overwrite without --force)
//   npm run draft -- --all                 every event without a report
//   npm run draft -- --all --stale 7       also refresh developing events whose report is > 7 days old
//   npm run draft -- --all --dry-run       list what would be drafted
//   options: --model <id> (default claude-sonnet-5-5)  --force  --max <n>
//
// Review is a human edit of the JSON: set generated.reviewed to true (or delete the
// `generated` block) and the notice disappears. The script never edits events.ts.

import { readFile, writeFile, access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS, LINK_WORDS, getEvent, neighbours } from "../src/content/events.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const DOSSIERS = path.join(root, "src", "content", "dossiers");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const MODEL = opt("--model", "claude-sonnet-5-5");
const FORCE = flag("--force");
const DRY = flag("--dry-run");
const ALL = flag("--all");
const STALE_DAYS = Number(opt("--stale", "0")) || 0;
const MAX = Number(opt("--max", "0")) || Infinity;
const ids = args.filter((a) => !a.startsWith("--") && !["--model", "--stale", "--max"].includes(args[args.indexOf(a) - 1]));

if (!ALL && ids.length === 0) {
  console.log("usage: npm run draft -- <event-id> | --all [--stale <days>] [--dry-run] [--model <id>] [--force] [--max <n>]\n\nevents:");
  for (const e of EVENTS) console.log(`  ${e.id.padEnd(36)} ${e.title}`);
  process.exit(1);
}

const key = process.env.ANTHROPIC_API_KEY;
if (!key && !DRY) {
  console.error("ANTHROPIC_API_KEY is not set");
  process.exit(1);
}

// --- which events ------------------------------------------------------------

async function existing(id) {
  const file = path.join(DOSSIERS, `${id}.json`);
  try {
    await access(file);
    const s = await stat(file);
    let generated = null;
    try {
      generated = JSON.parse(await readFile(file, "utf8")).generated ?? null;
    } catch {}
    return { file, mtime: s.mtimeMs, generated };
  } catch {
    return null;
  }
}

const todo = [];
const today = Date.now();
for (const e of ALL ? EVENTS : ids.map((id) => getEvent(id)).filter(Boolean)) {
  const have = await existing(e.id);
  let reason = null;
  if (!have) reason = "no report yet";
  else if (FORCE) reason = "forced";
  else if (have.generated && !have.generated.reviewed && STALE_DAYS > 0 && e.status === "developing") {
    const age = (today - Date.parse(have.generated.at)) / 86_400_000;
    if (age > STALE_DAYS) reason = `auto-draft is ${Math.round(age)} days old`;
  }
  if (reason) todo.push({ e, reason });
}
if (!ALL) {
  for (const id of ids) if (!getEvent(id)) console.error(`no event with id "${id}"`);
}
const picked = todo.slice(0, MAX);

if (picked.length === 0) {
  console.log("nothing to draft");
  process.exit(0);
}
console.log(`${picked.length} report(s) to draft${todo.length > picked.length ? ` (of ${todo.length}, capped by --max)` : ""}:`);
for (const t of picked) console.log(`  ${t.e.id.padEnd(36)} ${t.reason}`);
if (DRY) process.exit(0);

// --- material shared by every draft --------------------------------------------

const types = await readFile(path.join(root, "src", "content", "types.ts"), "utf8");
const example = JSON.parse(await readFile(path.join(DOSSIERS, "france-unrest-2026.json"), "utf8"));
delete example.generated;

let wireItems = [];
try {
  wireItems = JSON.parse(await readFile(path.join(root, "src", "content", "wire.json"), "utf8")).items ?? [];
} catch {}

const todayIso = new Date().toISOString().slice(0, 10);

const system = `You draft layered geopolitical reports for a personal reading app. Output must be a single JSON object that satisfies the TypeScript \`Dossier\` interface below exactly: every required field present, correct types, ISO dates, no extra top-level keys, no markdown fences, no commentary. Do not include a "generated" field; the script adds it.

Rules of the house:
- Write for a smart generalist. Short sentences. Every claim that could be wrong is hedged or has a confidence entry.
- Use only facts that appear in the material or that you are highly confident of; where you must estimate, say so in the text and in evidence.confidence.
- Sources: list the real URLs given in the material. Never invent a URL. If you draw on general knowledge, cite it only with a well-known URL you are certain exists; otherwise leave it out and lower the confidence.
- The ripple rings are the heart of the report: first-order effects that follow directly, then second-order, then third-order. Each effect gets a short sector label. Three rings, 3-5 effects each.
- Predictions carry a probability (0-1), a horizon and a dated check so they can be scored later. Scenarios sum to roughly 1.
- slug must equal the event id. updated must be ${todayIso}. status "developing" unless the event is clearly over ("stable") or is a scheduled date ("developing" still, since the run-up moves).
- readingMinutes: card 1, brief 5, deep 15-25. Keep deep.chart only if you have real numbers for a series; otherwise omit it.
- evidence.method: one paragraph saying this was drafted from the listed sources and headlines and what was estimated.

TypeScript interfaces:
${types}

A finished example of the shape (content is for a different event; do not copy its facts):
${JSON.stringify(example)}`;

function materialFor(event) {
  const items = wireItems.filter((i) => i.eventIds.includes(event.id));
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

// --- one draft -----------------------------------------------------------------

async function callApi(text) {
  // rate limits and overloads are retried with a growing pause; other errors surface at once
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: `Draft the dossier for this event. Return only the JSON object.\n\n${text}` }],
      }),
    });
    if (res.ok) return res.json();
    const detail = (await res.text()).slice(0, 300);
    if ((res.status === 429 || res.status === 529 || res.status >= 500) && attempt < 5) {
      const wait = Math.min(120, 15 * attempt);
      process.stdout.write(`(${res.status}, retrying in ${wait}s) `);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }
}

async function draftOne(event) {
  const { text, items } = materialFor(event);
  const body = await callApi(text);
  const out = body.content.filter((c) => c.type === "text").map((c) => c.text).join("");
  const start = out.indexOf("{");
  const end = out.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no JSON object in the reply");
  const draft = JSON.parse(out.slice(start, end + 1));

  const problems = [];
  const need = (obj, keys, where) => {
    for (const k of keys) if (obj?.[k] === undefined) problems.push(`${where}.${k} missing`);
  };
  need(draft, ["slug", "title", "deck", "updated", "status", "region", "tags", "readingMinutes", "card", "brief", "deep", "evidence"], "dossier");
  need(draft.card, ["headline", "keyNumber", "impactMeter", "forYou", "ripple"], "card");
  need(draft.brief, ["whatHappened", "whyItMatters", "winners", "losers", "whatsNext", "predict", "recap"], "brief");
  need(draft.deep, ["timeline", "causes", "stakeholders", "sectors", "dailyLife", "scenarios", "predictions", "countermeasures", "analogues", "watch"], "deep");
  need(draft.evidence, ["sources", "confidence", "method", "changeLog"], "evidence");
  if (problems.length) throw new Error("incomplete draft: " + problems.join("; "));

  draft.slug = event.id;
  draft.updated = todayIso;
  const known = new Set([...event.sources.map((s) => s.url), ...items.map((i) => i.url)]);
  const unknown = (draft.evidence.sources ?? []).filter((s) => !known.has(s.url)).map((s) => s.url);
  draft.generated = {
    by: "Geoploitica draft script",
    at: new Date().toISOString(),
    model: MODEL,
    sources: event.sources.length,
    headlines: items.length,
    reviewed: false,
  };
  await writeFile(path.join(DOSSIERS, `${event.id}.json`), JSON.stringify(draft, null, 2) + "\n");
  return { tokens: body.usage?.output_tokens ?? 0, unknown };
}

// --- run ------------------------------------------------------------------------

let ok = 0;
let failed = 0;
for (const { e } of picked) {
  process.stdout.write(`drafting ${e.id} … `);
  try {
    const r = await draftOne(e);
    ok++;
    console.log(`ok (${r.tokens.toLocaleString()} tokens)${r.unknown.length ? `\n  verify these sources, not in the material: ${r.unknown.join(", ")}` : ""}`);
  } catch (err) {
    failed++;
    console.log(`failed: ${err.message}`);
  }
}
console.log(`\n${ok} drafted, ${failed} failed. Drafts are live on the next build; review by editing the JSON and setting generated.reviewed to true.`);
if (ok === 0 && failed > 0) process.exitCode = 1;
