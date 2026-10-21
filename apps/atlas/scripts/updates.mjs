#!/usr/bin/env node
// "What changed": for events whose news is moving, ask Claude for one or two plain sentences
// on what is new, written only from the latest headlines, and keep a short history per event
// in src/content/updates.json. The tracker, the postcards and the map read it; this is what
// makes the dots change between hand edits of the event graph.
//
//   npm run updates                 events with at least 3 new headlines since their last line
//   npm run updates -- --max 6      cap the number of events per run (default 6)
//   npm run updates -- --dry-run    show which events would be updated
//
// Needs ANTHROPIC_API_KEY. Headlines come from src/content/wire.json (run `npm run wire` first).

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS } from "../src/content/events.ts";
import { DEFAULT_MODEL, extractJson } from "../src/content/drafting.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(here, "..", "src", "content");
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const MAX = Number(opt("--max", "6")) || 6;
const DRY = args.includes("--dry-run");
const MIN_NEW = 3;
const KEEP = 8; // lines of history per event
const MODEL = opt("--model", process.env.UPDATES_MODEL || DEFAULT_MODEL);
const key = process.env.ANTHROPIC_API_KEY;
if (!key && !DRY) {
  console.log("no ANTHROPIC_API_KEY: skipping updates");
  process.exit(0);
}

const wire = JSON.parse(await readFile(path.join(CONTENT, "wire.json"), "utf8"));
let updates = {};
try {
  updates = JSON.parse(await readFile(path.join(CONTENT, "updates.json"), "utf8"));
} catch {}

const DAY = 86_400_000;
const now = Date.parse(wire.fetchedAt) || Date.now();
const words = (e) => e.keywords.map((k) => k.toLowerCase());
const names = (title, e) => words(e).some((k) => title.toLowerCase().includes(k));

function headlines(e) {
  return wire.items
    .filter((i) => i.published !== wire.fetchedAt && (i.found === e.id || (i.eventIds.includes(e.id) && names(i.title, e))))
    .filter((i) => now - Date.parse(i.published) < 2 * DAY)
    .sort((a, b) => (a.published < b.published ? 1 : -1));
}

const todo = [];
for (const e of EVENTS) {
  const last = updates[e.id]?.[0];
  const since = last ? Date.parse(last.at) : now - 2 * DAY;
  const fresh = headlines(e).filter((i) => Date.parse(i.published) > since);
  if (fresh.length >= MIN_NEW) todo.push({ e, fresh, all: headlines(e).slice(0, 15), last });
}
todo.sort((a, b) => b.fresh.length - a.fresh.length);
const picked = todo.slice(0, MAX);
console.log(`${todo.length} events have ${MIN_NEW}+ new headlines; updating ${picked.length}`);
for (const t of picked) console.log(`  ${String(t.fresh.length).padStart(3)} new  ${t.e.title}`);
if (DRY || !picked.length) process.exit(0);

const SYSTEM = `You write the "what changed" line for one world event on Geopolitica Atlas, a free site that helps people follow how world events connect.

Rules:
- Use ONLY the numbered headlines you are given. Never add facts, numbers or names that are not in them. Headlines can be wrong or partial; say "reports say" when a claim comes from one outlet.
- One or two plain sentences, at most 45 words, present tense, no hype, no em dashes.
- Say what is new compared with the event summary and the previous line. If nothing material is new, say so in one short sentence.
- Cite the headlines you used by number.

Answer with JSON only: {"text": "...", "used": [1, 3]}`;

let ok = 0;
for (const { e, all, last } of picked) {
  const list = all.map((h, n) => `${n + 1}. ${h.title} (${h.publisher}, ${h.published.slice(0, 16).replace("T", " ")} UTC)`).join("\n");
  const user = `Event: ${e.title}\nSummary on the site: ${e.summary}\n${last ? `Previous line (${last.at.slice(0, 16)}): ${last.text}\n` : ""}\nHeadlines, newest first:\n${list}`;
  try {
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": key },
        body: JSON.stringify({ model: MODEL, max_tokens: 400, system: SYSTEM, messages: [{ role: "user", content: user }] }),
      });
      if (res.status !== 429 && res.status < 500) break;
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
    }
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const body = await res.json();
    const out = body.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    const parsed = JSON.parse(extractJson(out));
    const text = String(parsed.text ?? "").replace(/\s*[—–]\s*/g, ", ").trim();
    if (!text) throw new Error("empty line");
    const used = (Array.isArray(parsed.used) ? parsed.used : []).map(Number).filter((n) => n >= 1 && n <= all.length);
    const sources = (used.length ? used : [1]).map((n) => all[n - 1]).map((h) => ({ title: h.title, url: h.url, publisher: h.publisher }));
    updates[e.id] = [{ at: new Date(now).toISOString(), text, sources }, ...(updates[e.id] ?? [])].slice(0, KEEP);
    ok++;
    console.log(`  ✓ ${e.id}: ${text}`);
  } catch (err) {
    console.log(`  ✗ ${e.id}: ${err.message}`);
  }
}

await writeFile(path.join(CONTENT, "updates.json"), JSON.stringify(updates, null, 2) + "\n");
console.log(`${ok}/${picked.length} updated`);
