#!/usr/bin/env node
// Each event's views in plain words (src/content/inplain.json): the quick take in three lines,
// how it connects in three short paragraphs, and what its report says in three short
// paragraphs. Drafts events that have none, or whose summary, links or report changed since
// (up to INPLAIN_MAX a run, default 8).
//
//   npm run inplain              draft the missing or stale ones
//   npm run inplain -- --dry-run list them
//
// Needs ANTHROPIC_API_KEY.

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS, DASHED_KINDS, LINK_WORDS, getEvent, neighbours } from "../src/content/events.ts";
import { explainFor } from "../src/content/explain.ts";
import { DEFAULT_MODEL, extractJson } from "../src/content/drafting.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(here, "..", "src", "content", "inplain.json");
const DOSSIERS = path.join(here, "..", "src", "content", "dossiers");
const DRY = process.argv.includes("--dry-run");
const key = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.INPLAIN_MODEL || process.env.EXPLAIN_MODEL || DEFAULT_MODEL;
const MAX = Math.max(1, Number(process.env.INPLAIN_MAX || 8));

const data = JSON.parse(await readFile(FILE, "utf8"));
for (const id of Object.keys(data)) if (!getEvent(id)) delete data[id];

const dossiers = new Map();
for (const f of (await readdir(DOSSIERS)).filter((f) => f.endsWith(".json"))) {
  try {
    const d = JSON.parse(await readFile(path.join(DOSSIERS, f), "utf8"));
    if (d?.slug && d.card && d.brief) dossiers.set(d.slug, d);
  } catch {}
}

// everything the summaries are written from, so they are redrafted when any of it changes
function material(e) {
  const links = neighbours(e.id).map((n) => {
    const ex = explainFor(e.id, n.event.id);
    const dir = DASHED_KINDS.includes(n.kind) ? "RELATED (shared driver, not cause and effect)" : n.flow === "in" ? "FEEDS IT" : n.flow === "both" ? "BOTH WAYS" : "IT FEEDS";
    return `- ${dir}: ${n.event.title} (${LINK_WORDS[n.kind]}${n.via ? `, via ${n.via}` : ""}). ${n.event.summary}${ex ? `\n  Chain: ${ex.steps.join(" ")}${ex.watch ? ` Watch: ${ex.watch}` : ""}` : ""}`;
  });
  const d = dossiers.get(e.id) ?? (e.dossierSlug ? dossiers.get(e.dossierSlug) : undefined);
  const report = d
    ? `REPORT (${d.slug === e.id ? "this event's own" : `the parent report "${d.title}"`}, updated ${d.updated}):
Headline: ${d.card.headline}
Key number: ${d.card.keyNumber.value}, ${d.card.keyNumber.label}
What happened: ${d.brief.whatHappened.join(" ")}
Why it matters: ${d.brief.whyItMatters.join(" ")}
Wins: ${d.brief.winners.map((w) => `${w.who} (${w.why})`).join("; ")}
Loses: ${d.brief.losers.map((w) => `${w.who} (${w.why})`).join("; ")}
What comes next: ${d.brief.whatsNext.join(" ")}`
    : "REPORT: none yet";
  return { text: `EVENT: ${e.title} (${e.region}, ${e.status}, ${e.date})\n${e.summary}\n\nCONNECTIONS:\n${links.join("\n") || "none"}\n\n${report}`, hasReport: Boolean(d) };
}
// bump to redraft every event after a change to the instructions
const VERSION = "2";
const sum = (s) => createHash("sha1").update(VERSION + s).digest("hex").slice(0, 12);
const TODAY = new Date().toISOString().slice(0, 10);

const todo = [];
for (const e of EVENTS) {
  const m = material(e);
  if (data[e.id]?.sum !== sum(m.text)) todo.push({ e, m });
}
const batch = todo.slice(0, MAX);
console.log(`${todo.length} event(s) need plain-words summaries; drafting ${batch.length}`);
for (const t of batch) console.log("  " + t.e.id);
if (DRY) process.exit(0);
if (!key) {
  console.log("no ANTHROPIC_API_KEY: skipping");
  process.exit(0);
}

const SYSTEM = `You write the plain-words summaries for Geopolitica, a free map that shows how world events ripple into each other. Readers are smart but not experts and lose focus with walls of text. Each summary must be easy to follow: short sentences, everyday words, the important part first, real dates and numbers where the material has them.

Write three things for the event:

1. quick: three single sentences, at most 25 words each.
   happened: what happened or is about to happen.
   matters: why it matters to people far from it.
   next: what comes next, with a date if the material has one. Only dates after TODAY; never something that has already happened.

2. connect: how the event connects to what feeds it and what it moves, as a title and exactly 3 short paragraphs (each at most 45 words, at most 3 sentences).
   title: "How <the event, short> connects to <its one or two most important connections, short>, in plain words" (at most 18 words).
   Paragraph 1: the basic relationship anyone can picture (who sells, buys, needs or fears what).
   Paragraph 2: the other side's change or pressure, with dates.
   Paragraph 3: this event, and what it decides or changes along that chain.
   Pick the one or two connections that matter most; do not list them all.
   Example of the style (a different event):
   title: "How the Brazil run-off connects to the EU's EUDR and CBAM deadlines, in plain words"
   1: "Brazil sells Europe a lot of soy, beef and coffee."
   2: "Europe is changing the rules for those imports. From 30 December 2026, the EU's deforestation law (EUDR) requires big importers to prove these products didn't come from cleared forest. Small firms follow from June 2027."
   3: "Brazil chooses its president on 25 October. The winner decides how Brazil handles that rule: help its farmers prove clean supply chains, or push back and seek delays."

3. report: only if a REPORT is given, what it says, as a title and exactly 3 short paragraphs (same limits). title: "What the report says, in plain words". Paragraph 1: the situation and the key number. Paragraph 2: who wins and who loses. Paragraph 3: what comes next. If no report is given, report is null.

TODAY is given at the top of the material. Anything dated before TODAY has happened: write it in the past tense, never as "next".
Use only facts in the material. Never invent dates, numbers or quotes. No em dashes, no jargon without a three-word explanation, no hype.
Answer with JSON only: {"quick": {"happened": "", "matters": "", "next": ""}, "connect": {"title": "", "paras": ["", "", ""]}, "report": {"title": "", "paras": ["", "", ""]} | null}`;

const clean = (s, n) => String(s ?? "").replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, n);
const plainSet = (p) =>
  p && typeof p.title === "string" && Array.isArray(p.paras) && p.paras.length
    ? { title: clean(p.title, 160), paras: p.paras.slice(0, 3).map((x) => clean(x, 360)).filter(Boolean) }
    : undefined;

async function draft({ e, m }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": key },
    body: JSON.stringify({ model: MODEL, max_tokens: 3000, system: SYSTEM, messages: [{ role: "user", content: `TODAY: ${TODAY}\n\n${m.text}` }] }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const body = await res.json();
  const j = JSON.parse(extractJson(body.content.filter((c) => c.type === "text").map((c) => c.text).join("")));
  const q = j.quick ?? {};
  if (!q.happened || !q.matters || !q.next || !j.connect?.paras?.length) throw new Error("incomplete answer");
  data[e.id] = {
    sum: sum(m.text),
    quick: { happened: clean(q.happened, 240), matters: clean(q.matters, 240), next: clean(q.next, 240) },
    connect: plainSet(j.connect),
    ...(m.hasReport && j.report ? { report: plainSet(j.report) } : {}),
  };
}

// two at a time, each tried twice, failures kept in inplain-errors.json so they can be read
const ERRORS = path.join(here, "..", "src", "content", "inplain-errors.json");
const errors = {};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0;
const queue = [...batch];
await Promise.all(
  Array.from({ length: 2 }, async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await draft(t);
          ok++;
          delete errors[t.e.id];
          break;
        } catch (err) {
          errors[t.e.id] = { at: new Date().toISOString(), error: String(err.message).slice(0, 300) };
          console.log(`  ${t.e.id} (try ${attempt}): ${err.message}`);
          if (attempt === 1) await wait(/ 429| 529| 5\d\d/.test(err.message) ? 20000 : 3000);
        }
      }
    }
  }),
);
await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
await writeFile(ERRORS, JSON.stringify(errors, null, 2) + "\n");
console.log(`${ok}/${batch.length} drafted`);
