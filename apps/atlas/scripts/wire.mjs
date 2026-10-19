#!/usr/bin/env node
// Pull world-news headlines from public RSS feeds, match them to the events in
// src/content/events.ts by keyword, and write src/content/wire.json.
//
//   npm run wire              fetch all feeds
//   npm run wire -- --days 3  only keep items from the last 3 days (default 7)
//
// No dependencies: Node's fetch plus a small RSS/Atom parser. Feeds that fail are
// reported and skipped, so one dead feed never blanks the wire.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { EVENTS } from "../src/content/events.ts";

const FEEDS = [
  { publisher: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { publisher: "BBC Europe", url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml" },
  { publisher: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { publisher: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { publisher: "The Guardian World", url: "https://www.theguardian.com/world/rss" },
  { publisher: "France 24", url: "https://www.france24.com/en/rss" },
  { publisher: "Deutsche Welle", url: "https://rss.dw.com/rdf/rss-en-world" },
  { publisher: "Euronews", url: "https://www.euronews.com/rss?level=theme&name=news" },
  { publisher: "CNBC World", url: "https://www.cnbc.com/id/100727362/device/rss/rss.html" },
  { publisher: "NPR World", url: "https://feeds.npr.org/1004/rss.xml" },
  { publisher: "UN News", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml" },
];

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, "..", "src", "content", "wire.json");

const args = process.argv.slice(2);
const daysArg = args.indexOf("--days");
const DAYS = daysArg >= 0 ? Number(args[daysArg + 1]) || 7 : 7;
const cutoff = Date.now() - DAYS * 86_400_000;

// --- tiny RSS / Atom parser ---------------------------------------------------

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

function atomLink(block) {
  const m = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ?? block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return m ? m[1] : "";
}

function parseFeed(xml) {
  const items = [];
  const rss = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  for (const b of rss) {
    items.push({
      title: tag(b, "title"),
      url: tag(b, "link") || (b.match(/<guid[^>]*>(https?:[^<]+)<\/guid>/i)?.[1] ?? ""),
      published: tag(b, "pubDate") || tag(b, "dc:date"),
      summary: tag(b, "description"),
    });
  }
  const atom = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  for (const b of atom) {
    items.push({
      title: tag(b, "title"),
      url: atomLink(b),
      published: tag(b, "updated") || tag(b, "published"),
      summary: tag(b, "summary") || tag(b, "content"),
    });
  }
  return items;
}

// --- matching -----------------------------------------------------------------

const index = EVENTS.map((e) => ({ id: e.id, keywords: e.keywords.map((k) => k.toLowerCase()) }));

function matchEvents(text) {
  const t = text.toLowerCase();
  const scored = index
    .map((e) => ({ id: e.id, hits: e.keywords.filter((k) => t.includes(k)).length }))
    .filter((e) => e.hits >= 2) // two keyword hits, so "strike" alone doesn't drag a cricket story into France
    .sort((a, b) => b.hits - a.hits);
  return scored.map((e) => e.id);
}

// --- run ----------------------------------------------------------------------

const seen = new Set();
const items = [];
let ok = 0;

for (const feed of FEEDS) {
  try {
    const res = await fetch(feed.url, { headers: { "user-agent": "geoploitica-atlas/0.1 (personal wire)" }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const parsed = parseFeed(await res.text());
    let kept = 0;
    for (const it of parsed) {
      if (!it.title || !it.url) continue;
      const when = Date.parse(it.published);
      if (Number.isFinite(when) && when < cutoff) continue;
      const key = it.url.replace(/[?#].*$/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: createHash("sha1").update(key).digest("hex").slice(0, 12),
        title: it.title,
        url: it.url,
        publisher: feed.publisher,
        published: Number.isFinite(when) ? new Date(when).toISOString() : new Date().toISOString(),
        summary: it.summary ? it.summary.slice(0, 280) : undefined,
        eventIds: matchEvents(`${it.title} ${it.summary ?? ""}`),
      });
      kept++;
    }
    ok++;
    console.log(`${feed.publisher.padEnd(20)} ${String(kept).padStart(3)} items`);
  } catch (err) {
    console.log(`${feed.publisher.padEnd(20)} skipped: ${err.message}`);
  }
}

// The sources already cited on each event join the wire too, so the page has a
// backbone of vetted reporting even on a day when every feed is down.
for (const e of EVENTS) {
  for (const s of e.sources) {
    const key = s.url.replace(/[?#].*$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: createHash("sha1").update(key).digest("hex").slice(0, 12),
      title: s.title,
      url: s.url,
      publisher: s.publisher,
      published: s.date ? `${s.date}T00:00:00.000Z` : new Date().toISOString(), // undated pages count from the fetch
      eventIds: [e.id],
    });
  }
}

items.sort((a, b) => (a.published < b.published ? 1 : -1));
const matched = items.filter((i) => i.eventIds.length).length;

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), items }, null, 2) + "\n");

console.log(`\n${ok}/${FEEDS.length} feeds · ${items.length} headlines in the last ${DAYS} days · ${matched} matched to events`);
for (const e of EVENTS) {
  const n = items.filter((i) => i.eventIds.includes(e.id)).length;
  if (n) console.log(`  ${String(n).padStart(3)}  ${e.title}`);
}
console.log(`\nwrote ${path.relative(process.cwd(), OUT)}`);
if (ok === 0) process.exitCode = 1;
