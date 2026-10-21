#!/usr/bin/env node
// What's fueling it: for events whose news is moving, ask Claude which small local events in
// the latest headlines feed the big event, and keep them in src/content/fuel.json. The map,
// postcards and event pages draw them as small dots tied into the big one.
//
//   npm run fuel                 every event on the map (live and upcoming) with 2+ recent
//                                headlines and no run in the last 12 h; never-mapped first
//   npm run fuel -- --max 8      cap per run (default 8)
//   npm run fuel -- --dry-run    list what would run
//
// Needs ANTHROPIC_API_KEY and src/content/wire.json (run `npm run wire` first).

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS } from "../src/content/events.ts";
import { DEFAULT_MODEL, extractJson } from "../src/content/drafting.ts";
import { FUEL_SYSTEM, fuelPrompt, finishFuel } from "../src/content/fueling.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(here, "..", "src", "content");
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const MAX = Number(opt("--max", "8")) || 8;
const DRY = args.includes("--dry-run");
const MODEL = opt("--model", process.env.FUEL_MODEL || DEFAULT_MODEL);
const key = process.env.ANTHROPIC_API_KEY;
if (!key && !DRY) {
  console.log("no ANTHROPIC_API_KEY: skipping fuel");
  process.exit(0);
}

const wire = JSON.parse(await readFile(path.join(CONTENT, "wire.json"), "utf8"));
let fuel = {};
try {
  fuel = JSON.parse(await readFile(path.join(CONTENT, "fuel.json"), "utf8"));
} catch {}

const DAY = 86_400_000;
const now = Date.parse(wire.fetchedAt) || Date.now();
const names = (title, e) => e.keywords.some((k) => title.toLowerCase().includes(k.toLowerCase()));
// the last 48 hours; a quiet event (or one still to come) reaches back up to a week, so every
// dot on the map, big or small, gets what is feeding it
const headlines = (e, days = 2) =>
  wire.items
    .filter((i) => i.published !== wire.fetchedAt && (i.found === e.id || (i.eventIds.includes(e.id) && names(i.title, e))))
    .filter((i) => now - Date.parse(i.published) < days * DAY)
    .sort((a, b) => (a.published < b.published ? 1 : -1))
    .slice(0, 25)
    .map((i) => ({ title: i.title, url: i.url, publisher: i.publisher, published: i.published }));
const recent = (e) => {
  const h = headlines(e);
  return h.length >= 6 ? h : headlines(e, 7);
};

const todo = EVENTS.map((e) => ({ e, h: recent(e), last: fuel[e.id] }))
  .filter((t) => t.h.length >= 2 && (!t.last || now - Date.parse(t.last.at) > 12 * 3_600_000))
  // never mapped (or mapped empty) first, so no dot waits behind the busy ones
  .sort((a, b) => Number(Boolean(a.last?.items.length)) - Number(Boolean(b.last?.items.length)) || b.h.length - a.h.length);
const picked = todo.slice(0, MAX);
console.log(`${todo.length} events due; mapping ${picked.length}`);
for (const t of picked) console.log(`  ${String(t.h.length).padStart(3)} headlines  ${t.e.title}`);
if (DRY || !picked.length) process.exit(0);

async function ask(e, h) {
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": key },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: FUEL_SYSTEM, messages: [{ role: "user", content: fuelPrompt(e, h) }] }),
    });
    if (res.status !== 429 && res.status < 500) break;
    await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
  }
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const body = await res.json();
  const text = body.content.filter((c) => c.type === "text").map((c) => c.text).join("");
  return finishFuel(JSON.parse(extractJson(text)), e, h);
}

let ok = 0;
for (const { e, h } of picked) {
  try {
    let items = await ask(e, h);
    // nothing clear in two days of news: look again across the week before settling for none
    if (!items.length) {
      const week = headlines(e, 7);
      if (week.length > h.length) items = await ask(e, week);
    }
    // an empty answer is an answer: the latest news holds no clear inputs. Kept, so the event
    // waits the usual 12 hours instead of being asked again (and paid for) every run.
    fuel[e.id] = { at: new Date(now).toISOString(), by: "pipeline", items };
    ok++;
    console.log(`  ✓ ${e.id}: ${items.length ? items.map((i) => i.title).join(" | ") : "no clear inputs in the latest news"}`);
  } catch (err) {
    console.log(`  ✗ ${e.id}: ${err.message}`);
  }
}
await writeFile(path.join(CONTENT, "fuel.json"), JSON.stringify(fuel, null, 2) + "\n");
console.log(`${ok}/${picked.length} mapped`);
