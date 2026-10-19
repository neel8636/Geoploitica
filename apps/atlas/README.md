# Geoploitica Atlas — personal edition

A private version of Geoploitica for one reader: the world's events on a map, the lines
between them, and a click on any event opens an interactive report on what it is and how it
connects to the rest of the world. No accounts, no enterprise layer, no engine to run.

## Run it

```bash
cd apps/atlas
npm install
npm run wire      # pull headlines from public RSS feeds and match them to events
npm run dev       # http://localhost:3000
```

`npm run build && npm run start` serves the production build.

## What is on the screen

- **Map (`/`)** — every tracked event as a dot (size = severity, amber = severe, hollow =
  scheduled) with great-circle arcs between connected events. Hover lights up a
  neighbourhood; click opens the report. A World / Europe toggle refits the map, since most
  tracked events sit in Europe.
- **Event report (`/events/<id>`)** — summary and impact meter; the map focused on the
  event; a ripple map of its effects; *How it connects to the rest of the world*, every link
  with the one sentence that justifies it; matched wire headlines; sources; and, where one
  exists, the full layered report (30-second card → 5-minute brief → deep dive → evidence).
- **Events (`/events`)** — everything tracked, filterable by kind.
- **Wire (`/wire`)** — headlines grouped by the event they match, plus the unmatched ones
  that may deserve a new entry.

## Where the content lives

| File | What it is |
| --- | --- |
| `src/content/events.ts` | The event graph: one entry per event with coordinates, severity, keywords for the wire matcher, links to other events (each with a `why` sentence) and sources. The single source of truth. |
| `src/content/dossiers/*.json` | Full layered reports, one per event that has one. Registered in `src/content/dossiers.ts`; an event points at its report with `dossierSlug`. |
| `src/content/wire.json` | Output of `npm run wire`. Safe to commit or ignore. |

## Keeping it current

1. **Add an event**: append to `EVENTS` in `events.ts` with coordinates, keywords and links.
   Links are directional; `allEdges()` and `neighbours()` handle the rest.
2. **Refresh headlines**: `npm run wire` (optionally `-- --days 3`). Feeds that fail are
   skipped and listed. The sources already cited on events join the wire, so it is never empty.
3. **Draft a full report**: `ANTHROPIC_API_KEY=… npm run draft -- <event-id>` writes
   `src/content/dossiers/<event-id>.json` from the event, its connections and its matched
   headlines. Read it, fix it, then import it in `dossiers.ts` and set `dossierSlug` on the
   event. Nothing is published without that step; the script lists any source URL that was
   not in the material so you can verify it.

## Stack

Next.js 16 (App Router, cache components), React 19, Tailwind 4, d3-geo + world-atlas for the
map, self-hosted Newsreader and IBM Plex Sans. The two scripts are plain Node (22+), importing
`events.ts` directly.
