#!/usr/bin/env node
// Every connection in plain words (src/content/explain.json): a hook for the map, and the
// step-by-step chain plus what to watch for the report. The current graph was written by
// hand; this drafts any connection that has none yet (a new event or link), with Claude.
//
//   npm run explain              draft the missing ones (up to 20 a run)
//   npm run explain -- --dry-run list them
//
// Needs ANTHROPIC_API_KEY.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS, getEvent, LINK_WORDS } from "../src/content/events.ts";
import { DEFAULT_MODEL, extractJson } from "../src/content/drafting.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(here, "..", "src", "content", "explain.json");
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const key = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.EXPLAIN_MODEL || DEFAULT_MODEL;

const data = JSON.parse(await readFile(FILE, "utf8"));
const pk = (a, b) => [a, b].sort().join("~");
const todo = new Map();
for (const e of EVENTS)
  for (const l of e.links) {
    const k = pk(e.id, l.to);
    if (data[k] || !getEvent(l.to)) continue;
    if (!todo.has(k)) todo.set(k, []);
    todo.get(k).push({ from: e, to: getEvent(l.to), l });
  }
const keys = [...todo.keys()].slice(0, 20);
console.log(`${todo.size} connection(s) without an explanation; drafting ${keys.length}`);
for (const k of keys) console.log("  " + k);
if (DRY || !keys.length) process.exit(0);
if (!key) {
  console.log("no ANTHROPIC_API_KEY: skipping");
  process.exit(0);
}

const SYSTEM = `You explain how two world events connect, in plain words, for Geopolitica, a free map that shows how events ripple into each other. Readers are smart but not experts.

For each connection, write:
- hook: at most 16 words. Accurate and intriguing: make the reader want to know how. No exaggeration, no question marks, no clickbait.
- line: the whole connection in one plain sentence, at most 30 words.
- steps: exactly 3 short steps from cause to effect, at most 25 words each. Step 1 starts at the cause. For a shared driver, step 3 says neither caused the other.
- watch: one concrete thing to watch next, with a date if the material has one. At most 15 words.
Use only facts in the material. No em dashes. Answer with JSON only: {"items": [{"key": "", "hook": "", "line": "", "steps": ["", "", ""], "watch": ""}]}`;

const material = keys
  .map((k) => {
    const recs = todo.get(k);
    const r = recs[0];
    return `KEY ${k}\nA: ${r.from.title}. ${r.from.summary}\nB: ${r.to.title}. ${r.to.summary}\n${recs.map((x) => `LINK: "${x.from.title}" ${LINK_WORDS[x.l.kind]} "${x.to.title}"${x.l.via ? ` via ${x.l.via}` : ""}. Reason: ${x.l.why}`).join("\n")}`;
  })
  .join("\n\n");

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "content-type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": key },
  body: JSON.stringify({ model: MODEL, max_tokens: 6000, system: SYSTEM, messages: [{ role: "user", content: material }] }),
});
if (!res.ok) {
  console.log(`Claude API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  process.exit(0);
}
const body = await res.json();
const items = JSON.parse(extractJson(body.content.filter((c) => c.type === "text").map((c) => c.text).join(""))).items ?? [];
const clean = (s, n) => String(s ?? "").replace(/\s*[—–]\s*/g, ", ").trim().slice(0, n);
let n = 0;
for (const it of items) {
  if (!keys.includes(it.key) || !Array.isArray(it.steps) || it.steps.length < 2 || !it.hook) continue;
  data[it.key] = { hook: clean(it.hook, 140), line: clean(it.line, 260), steps: it.steps.slice(0, 3).map((s) => clean(s, 220)), ...(it.watch ? { watch: clean(it.watch, 140) } : {}) };
  n++;
}
await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
console.log(`${n}/${keys.length} explained`);
