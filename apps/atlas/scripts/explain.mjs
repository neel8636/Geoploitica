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
const PLAIN = path.join(here, "..", "src", "content", "plain.json");
const plain = JSON.parse(await readFile(PLAIN, "utf8"));
const pk = (a, b) => [a, b].sort().join("~");
const todo = new Map();
for (const e of EVENTS)
  for (const l of e.links) {
    const k = pk(e.id, l.to);
    if (data[k] || !getEvent(l.to)) continue;
    if (!todo.has(k)) todo.set(k, []);
    todo.get(k).push({ from: e, to: getEvent(l.to), l });
  }
// the free part (hook, first step, how much more) for browser code; the full chains stay server side
const PUBLIC = path.join(here, "..", "src", "content", "explain-public.json");
async function writePublic() {
  const pub = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { hook: v.hook, first: v.steps[0], more: Math.max(0, v.steps.length - 1), watch: Boolean(v.watch) }]));
  await writeFile(PUBLIC, JSON.stringify(pub, null, 2) + "\n");
}

const keys = [...todo.keys()].slice(0, 20);
console.log(`${todo.size} connection(s) without an explanation; drafting ${keys.length}`);
for (const k of keys) console.log("  " + k);
const noPlain = EVENTS.filter((e) => !plain[e.id]).slice(0, 10);
console.log(`${noPlain.length} event(s) without a plain headline`);
if (DRY) process.exit(0);

// each new event's ripple in one plain sentence: the headline of its page
if (noPlain.length && key) {
  const SYS = `Write one plain sentence per event, at most 25 words, saying what feeds the event and what it moves next, from the connections given. It is the headline of the event's page for a smart non-expert. Use only facts given. No em dashes. JSON only: {"items": [{"id": "", "headline": ""}]}`;
  const mat = noPlain.map((e) => `ID ${e.id}\n${e.title}. ${e.summary}\nCONNECTIONS: ${e.links.map((l) => `${LINK_WORDS[l.kind]} ${getEvent(l.to)?.title ?? l.to}${l.via ? ` via ${l.via}` : ""}`).join("; ")}`).join("\n\n");
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": key },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, system: SYS, messages: [{ role: "user", content: mat }] }),
    });
    if (r.ok) {
      const b = await r.json();
      for (const it of JSON.parse(extractJson(b.content.filter((c) => c.type === "text").map((c) => c.text).join(""))).items ?? []) {
        if (noPlain.some((e) => e.id === it.id) && it.headline) plain[it.id] = String(it.headline).replace(/\s*[—–]\s*/g, ", ").trim().slice(0, 220);
      }
      await writeFile(PLAIN, JSON.stringify(plain, null, 2) + "\n");
      console.log("plain headlines written");
    }
  } catch (err) {
    console.log(`plain headlines failed: ${err.message}`);
  }
}
if (!keys.length || !key) {
  if (!key && keys.length) console.log("no ANTHROPIC_API_KEY: skipping");
  await writePublic();
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
await writePublic();
console.log(`${n}/${keys.length} explained`);
