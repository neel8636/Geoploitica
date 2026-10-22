#!/usr/bin/env node
// New events from the news, behind a strict filter. The world feeds bring in headlines that no
// event on the map covers yet. This step groups them into stories and puts each through the
// ripple test: a story joins the map only if a state-level actor is involved, it moves money,
// goods or people across a border (or changes another country's choices), it matters beyond
// one city or company, and it is a new development rather than comment. Code then checks the
// evidence (3+ headlines from 2+ outlets) before Claude drafts the event, and checks the draft
// (real ids, real sources, valid fields) before it is saved. Every verdict, accepted or
// rejected, is logged with its reason in src/content/discovery-log.json.
//
// Added events live in src/content/events/discovered.json and join the map like any other:
// the later steps write their what-changed line, connections, plain words, fuel and report.
// An added event that goes 10 days without a new headline is retired.
//
//   npm run discover               screen and add (needs ANTHROPIC_API_KEY)
//   npm run discover -- --dry-run  show what would be screened
//   npm run discover -- --force    screen even if the last screen was recent
//
// Limits: at most 2 new events a run, 6 a day, 15 on the map at once.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS, LINK_WORDS, KIND_HELP } from "../src/content/events.ts";
import { DRIVERS } from "../src/content/drivers.ts";
import { DEFAULT_MODEL, extractJson } from "../src/content/drafting.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(here, "..", "src", "content");
const F = {
  wire: path.join(CONTENT, "wire.json"),
  found: path.join(CONTENT, "events", "discovered.json"),
  log: path.join(CONTENT, "discovery-log.json"),
};
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force");
const key = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.DISCOVER_MODEL || DEFAULT_MODEL;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WINDOW = 2 * DAY; // headlines considered
const MIN_NEW = 8; // unjudged headlines needed before screening again
const MIN_GAP = 3 * HOUR; // between screens
const MAX_SCREEN = 140; // headlines sent in one screen
const MAX_PER_RUN = 2;
const MAX_PER_DAY = 6;
const MAX_ACTIVE = 15;
const RETIRE_AFTER = 10 * DAY;
const MIN_HEADLINES = 3;
const MIN_PUBLISHERS = 2;
const TYPES = ["unrest", "conflict", "election", "economy", "markets", "energy", "regulation", "diplomacy", "trade", "disaster", "security"];
const KINDS = Object.keys(LINK_WORDS);
const EDITIONS = ["US", "GB", "CA", "IN", "PH", "KE", "IL", "AU"];

const wire = JSON.parse(await readFile(F.wire, "utf8"));
const found = JSON.parse(await readFile(F.found, "utf8"));
const log = JSON.parse(await readFile(F.log, "utf8"));
const now = Date.parse(wire.fetchedAt) || Date.now();
const iso = new Date(now).toISOString();
const run = { at: iso, screened: 0, accepted: [], rejected: [], existing: [], retired: [], skipped: "" };
let tagged = 0; // headlines handed to events already on the map

// --- 1. retire added events that have gone quiet ---------------------------------------
const lastNews = (id) => wire.items.filter((i) => i.eventIds.includes(id)).reduce((m, i) => Math.max(m, Date.parse(i.published) || 0), 0);
for (const e of [...found.events]) {
  const added = Date.parse(e.auto?.addedAt ?? e.date);
  const latest = Math.max(lastNews(e.id), added);
  if (now - latest > RETIRE_AFTER) {
    found.events = found.events.filter((x) => x.id !== e.id);
    run.retired.push({ id: e.id, title: e.title, reason: `no new headline since ${new Date(latest).toISOString().slice(0, 10)}` });
  }
}

// --- 2. the headlines no event covers ---------------------------------------------------
const JUNK = /^(live|watch|video|podcast|quiz|opinion|analysis|letters?|the briefing|in pictures|photos?|newsletter|explainer)\b|\b(live updates|as it happened|in pictures|quiz|crossword|horoscope|recipe)\b/i;
for (const [id, j] of Object.entries(log.judged ?? {})) if (now - Date.parse(j.at) > 4 * DAY) delete log.judged[id];
log.judged = log.judged ?? {};
const pool = wire.items
  .filter((i) => !i.eventIds.length && !i.found)
  .filter((i) => now - Date.parse(i.published) < WINDOW && Date.parse(i.published) <= now + HOUR)
  .filter((i) => !JUNK.test(i.title))
  .sort((a, b) => (a.published < b.published ? 1 : -1))
  .slice(0, MAX_SCREEN);
const unjudged = pool.filter((i) => !log.judged[i.id]);
const sinceLast = log.screenedAt ? now - Date.parse(log.screenedAt) : Infinity;
const todayAdded = (log.runs ?? []).filter((r) => r.at.slice(0, 10) === iso.slice(0, 10)).reduce((n, r) => n + r.accepted.length, 0);
const room = Math.min(MAX_PER_RUN, MAX_PER_DAY - todayAdded, MAX_ACTIVE - found.events.length);

console.log(`${pool.length} uncovered headlines in the last 2 days, ${unjudged.length} not yet judged; room for ${Math.max(0, room)} new events`);
let skip = "";
if (unjudged.length < MIN_NEW && !FORCE) skip = `only ${unjudged.length} new uncovered headlines`;
else if (sinceLast < MIN_GAP && !FORCE) skip = `last screen ${Math.round(sinceLast / 60000)} min ago`;
else if (room <= 0) skip = todayAdded >= MAX_PER_DAY ? "daily limit reached" : "map limit reached";
else if (!key && !DRY) skip = "no ANTHROPIC_API_KEY";
if (DRY) {
  console.log(skip ? `would skip: ${skip}` : `would screen ${pool.length} headlines`);
  process.exit(0);
}
if (skip) {
  run.skipped = skip;
  console.log(`skipping the screen: ${skip}`);
  await save();
  process.exit(0);
}

// --- 3. the ripple test ------------------------------------------------------------------
async function claude(system, user, maxTokens) {
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": key },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    if (res.status !== 429 && res.status < 500) break;
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
  }
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const body = await res.json();
  const out = body.content.filter((c) => c.type === "text").map((c) => c.text).join("");
  try {
    return JSON.parse(extractJson(out));
  } catch (err) {
    throw new Error(`${err.message} (stop: ${body.stop_reason})`);
  }
}

const mapList = EVENTS.map((e) => `- ${e.id}: ${e.title} (${e.region})`).join("\n");
const SCREEN = `You are the gatekeeper for Geopolitica, a free world map of events and how they ripple into each other. The map only shows events with a geopolitical ripple: something that changes what states do, or moves money, goods or people across borders. You get numbered headlines that no event on the map covers yet, and the list of events already on the map.

1. Group the headlines into stories (one story = one real-world development). Leave out headlines that fit no story.
2. Judge every story with the ripple test. ACCEPT only if all four hold:
   a. Actors: a government, state, military, central bank, international body, or a nationwide movement contesting state power drives it or is directly hit by it.
   b. Ripple: it plausibly moves money, goods or people across a border, or changes another country's decisions. Name the channel (for example oil prices, tariffs, migrant flows, arms supplies, interest rates, sanctions) and at least one country outside the origin that it reaches.
   c. Scale: it matters beyond one city or one company. Severity 1 is local, 3 regional, 5 a global shock; accept only 2 or more.
   d. Development: the headlines report something happening now or a decision with a date, not commentary, explainers, anniversaries, profiles or opinion.
   REJECT: crime and court cases with no effect abroad, celebrity, sport, culture, human-interest stories, local weather or accidents with no effect abroad, company or market news with no state or policy angle, routine statements and visits that decide nothing, opinion and analysis.
   EXISTING: if the story is really part of an event already on the map, mark it existing and give that event's id.
3. Be strict. When in doubt, reject. Most stories should be rejected. A story you accept must be something a reader of world news would expect on a map of geopolitics.

Answer with JSON only:
{"stories": [{"headlines": [1, 4], "title": "short and concrete", "verdict": "accept" | "reject" | "existing", "existing": "event id or null", "reason": "one sentence on why it passes or fails the test", "channel": "what moves across the border, or empty", "reaches": ["ISO-2 codes outside the origin"], "severity": 1, "connects_to": ["ids of map events it ripples into or out of"]}]}`;

const numbered = pool.map((h, n) => `${n + 1}. ${h.title} (${h.publisher}, ${h.published.slice(0, 16).replace("T", " ")} UTC)${log.judged[h.id] ? ` [judged before: ${log.judged[h.id].verdict}]` : ""}`).join("\n");
let stories = [];
try {
  stories = (await claude(SCREEN, `TODAY: ${iso.slice(0, 10)}\n\nEVENTS ON THE MAP:\n${mapList}\n\nHEADLINES NO EVENT COVERS:\n${numbered}`, 12000)).stories ?? [];
} catch (err) {
  run.skipped = `screen failed: ${err.message}`;
  console.log(run.skipped);
  await save();
  process.exit(0);
}
log.screenedAt = iso;
run.screened = pool.length;
const ids = new Set(EVENTS.map((e) => e.id));

// the evidence and the test, checked in code too
const candidates = [];
for (const s of stories) {
  const heads = [...new Set((s.headlines ?? []).map(Number))].filter((n) => n >= 1 && n <= pool.length).map((n) => pool[n - 1]);
  const publishers = new Set(heads.map((h) => h.publisher)).size;
  const conns = (s.connects_to ?? []).filter((x) => ids.has(x));
  const reaches = (s.reaches ?? []).filter((c) => /^[A-Z]{2}$/.test(c));
  const sev = Number(s.severity) || 0;
  let verdict = s.verdict;
  let reason = String(s.reason ?? "").trim();
  if (verdict === "accept") {
    const why = [];
    if (heads.length < MIN_HEADLINES) why.push(`only ${heads.length} headline${heads.length === 1 ? "" : "s"}`);
    if (publishers < MIN_PUBLISHERS) why.push(`only ${publishers} outlet`);
    if (sev < 2) why.push("severity below 2");
    if (!String(s.channel ?? "").trim()) why.push("no channel named");
    if (!reaches.length) why.push("no country reached abroad");
    if (why.length) {
      verdict = "reject";
      reason = `Passed the test but not the evidence check: ${why.join(", ")}.`;
    }
  }
  for (const h of heads) log.judged[h.id] = { at: iso, verdict };
  const entry = { title: String(s.title ?? "").slice(0, 120), reason, headlines: heads.length, publishers };
  if (verdict === "accept") candidates.push({ s, heads, conns, reaches, sev, publishers, entry });
  else if (verdict === "existing") {
    run.existing.push({ ...entry, event: s.existing ?? null });
    // its headlines now feed that event (what changed, fuel, the page's news)
    if (ids.has(s.existing)) {
      for (const h of heads) {
        const w = wire.items.find((x) => x.id === h.id);
        if (w && !w.eventIds.includes(s.existing)) {
          w.eventIds.push(s.existing);
          w.found = w.found ?? s.existing;
          tagged++;
        }
      }
    }
  }
  else run.rejected.push(entry);
}
for (const h of pool) if (!log.judged[h.id]) log.judged[h.id] = { at: iso, verdict: "no story" };
candidates.sort((a, b) => b.sev - a.sev || b.heads.length - a.heads.length);
for (const c of candidates.slice(room)) run.rejected.push({ ...c.entry, reason: `Passed the test; held back by the limit of ${MAX_PER_RUN} new events a run. It will be judged again with the next headlines.` });

// --- 4. draft each accepted story as an event --------------------------------------------
const DRAFT = `You write one event record for Geopolitica's world map from news headlines. The story has passed the ripple test. Use only facts in the headlines given; never invent numbers, names, dates or quotes. No em dashes.

Fields:
- id: lower-case words joined by hyphens, ending with the year, at most 6 words (e.g. "india-green-card-curbs-2026").
- title: at most 70 characters, concrete, what is happening.
- type: one of ${TYPES.join(", ")}.
- date: ISO date of the latest development in the headlines.
- status: "developing", or "scheduled" if it is a dated decision still to come.
- region: the place, as a reader would name it (a country, or "Country, Country").
- lat, lon: the place it is centred on.
- countries: ISO-2 codes directly involved.
- summary: two plain sentences: what happened, and why it matters beyond the country.
- severity: 1 to 5 (1 local, 3 regional, 5 global shock).
- keywords: 6 to 12 lower-case words or short phrases that headlines about this story contain and that are specific to it (names, places, programmes); no generic words like "government" or "economy".
- links: 0 to 4 connections to events already on the map (only real ones; an empty list is fine), each {"to": id, "kind": one of ${KINDS.join(", ")}, "why": one sentence of at most 30 words, "via": the channel in at most 6 words, read after "via", "driver": optional id from the drivers list}. Kinds: ${KINDS.map((k) => `${k} (${KIND_HELP[k]})`).join("; ")}. A link from this event to another means this event ${KINDS.map((k) => `${k}: "${LINK_WORDS[k]}"`).join(", ")} the other.
- news: a Google News search for this story's local coverage: {"q": query with OR and quotes, "edition": one of ${EDITIONS.join(", ")} closest to the place}.
- sources: the numbers of the 2 to 4 headlines that best support the summary.

Answer with JSON only, one object with exactly these fields.`;

const DRIVER_LIST = DRIVERS.map((d) => `${d.id}: ${d.name}`).join("; ");
for (const c of candidates.slice(0, Math.max(0, room))) {
  const heads = c.heads;
  const list = heads.map((h, n) => `${n + 1}. ${h.title} (${h.publisher}, ${h.published.slice(0, 10)})`).join("\n");
  const near = EVENTS.filter((e) => c.conns.includes(e.id) || c.reaches.some((r) => e.countries.includes(r))).slice(0, 12);
  const context = (near.length ? near : EVENTS.slice(0, 12)).map((e) => `- ${e.id}: ${e.title}. ${e.summary}`).join("\n");
  try {
    const d = await claude(
      DRAFT,
      `TODAY: ${iso.slice(0, 10)}\nSTORY: ${c.entry.title}\nWHY IT PASSED: ${c.entry.reason} Channel: ${c.s.channel}. Reaches: ${c.reaches.join(", ")}.\n\nHEADLINES:\n${list}\n\nEVENTS IT MAY CONNECT TO:\n${context}\n\nDRIVERS: ${DRIVER_LIST}\n\nALL EVENT IDS: ${[...ids].join(", ")}`,
      8000,
    );
    const ev = validate(d, heads, c);
    found.events.push(ev);
    ids.add(ev.id);
    // tag its headlines so the later steps (what changed, fuel) see them this run
    for (const h of heads) {
      const w = wire.items.find((x) => x.id === h.id);
      if (w && !w.eventIds.includes(ev.id)) w.eventIds.push(ev.id);
    }
    run.accepted.push({ id: ev.id, title: ev.title, reason: c.entry.reason, channel: ev.auto.channel, reaches: ev.auto.reaches, headlines: heads.length, publishers: c.publishers });
    console.log(`  + ${ev.id}: ${ev.title}`);
  } catch (err) {
    run.rejected.push({ ...c.entry, reason: `Passed the test, but the draft failed checks: ${err.message}` });
    console.log(`  ✗ ${c.entry.title}: ${err.message}`);
  }
}

function validate(d, heads, c) {
  const clean = (v, n) => String(v ?? "").replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, n);
  let id = String(d.id ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  if (!/^[a-z0-9]+(-[a-z0-9]+)+$/.test(id)) throw new Error("bad id");
  if (ids.has(id)) id = `${id}-b`;
  if (ids.has(id)) throw new Error("id already on the map");
  const title = clean(d.title, 90);
  if (title.length < 8) throw new Error("no title");
  if (!TYPES.includes(d.type)) throw new Error(`bad type ${d.type}`);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : iso.slice(0, 10);
  const lat = Number(d.lat), lon = Number(d.lon);
  if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) || (lat === 0 && lon === 0)) throw new Error("bad position");
  const countries = (d.countries ?? []).map(String).filter((x) => /^[A-Z]{2}$/.test(x));
  if (!countries.length) throw new Error("no countries");
  const summary = clean(d.summary, 420);
  if (summary.split(/\s+/).length < 12) throw new Error("summary too short");
  const severity = Math.min(5, Math.max(1, Math.round(Number(d.severity) || c.sev)));
  const keywords = [...new Set((d.keywords ?? []).map((k) => String(k).toLowerCase().trim()).filter((k) => k.length >= 3 && !["government", "economy", "world", "news", "country", "people"].includes(k)))].slice(0, 12);
  if (keywords.length < 4) throw new Error("too few keywords");
  const links = (d.links ?? [])
    .filter((l) => ids.has(l.to) && KINDS.includes(l.kind) && l.why)
    .slice(0, 4)
    .map((l) => ({ to: l.to, kind: l.kind, why: clean(l.why, 240), ...(l.via ? { via: clean(l.via, 60) } : {}), ...(DRIVERS.some((x) => x.id === l.driver) ? { driver: l.driver } : {}) }));
  const sources = [...new Set((d.sources ?? []).map(Number))]
    .filter((n) => n >= 1 && n <= heads.length)
    .slice(0, 4)
    .map((n) => heads[n - 1])
    .map((h) => ({ title: h.title, url: h.url, publisher: h.publisher, date: h.published.slice(0, 10) }));
  if (!sources.length) throw new Error("no sources");
  const news = d.news?.q && EDITIONS.includes(d.news.edition) ? { q: clean(d.news.q, 200), edition: d.news.edition } : { q: keywords.slice(0, 3).map((k) => `"${k}"`).join(" OR "), edition: "US" };
  return {
    id,
    title,
    type: d.type,
    date,
    status: d.status === "scheduled" ? "scheduled" : "developing",
    region: clean(d.region, 60) || countries.join(", "),
    lat,
    lon,
    countries,
    summary,
    severity,
    keywords,
    links,
    sources,
    news,
    auto: { addedAt: iso, reason: c.entry.reason, channel: clean(c.s.channel, 80), reaches: c.reaches, headlines: heads.length, publishers: c.publishers },
  };
}

await save();
console.log(`screened ${run.screened}: ${run.accepted.length} added, ${run.existing.length} belong to events on the map, ${run.rejected.length} rejected, ${run.retired.length} retired`);

async function save() {
  log.runs = [run, ...(log.runs ?? [])].slice(0, 40);
  await writeFile(F.found, JSON.stringify(found, null, 2) + "\n");
  await writeFile(F.log, JSON.stringify(log, null, 2) + "\n");
  if (run.accepted.length || tagged) await writeFile(F.wire, JSON.stringify(wire, null, 2) + "\n");
}
