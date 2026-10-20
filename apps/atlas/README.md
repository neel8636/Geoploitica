# Geopolitica Atlas — personal edition

A private version of Geopolitica for one reader: the world's events on a map, the lines
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
| `src/content/dossiers/*.json` | Full layered reports, one per event. A file named after an event id is that event's report; `dossierSlug` on an event can point at a parent report instead. Every file in the folder is live. |
| `src/content/wire.json` | Output of `npm run wire`. Safe to commit or ignore. |

## Keeping it current

The published site runs a pipeline (`.github/workflows/atlas-pages.yml`) on every push to
`apps/atlas`, once a day at 06:17 UTC, and on demand from the Actions tab:

1. **Wire** — `npm run wire` pulls the feeds and matches headlines to events.
2. **Reports** — when the run can reach the Claude API, `npm run draft -- --all --stale 7`
   writes a full layered report for every event that has none, and re-drafts auto-drafted
   reports of developing events older than seven days. Two ways to give it access:
   - **Keyless (preferred):** workload identity federation. In the Claude Console, Organization
     settings → Workload identity → Connect workload → GitHub Actions, with subject
     `repo:neel8636/Geoploitica:ref:refs/heads/main` and audience `https://api.anthropic.com`.
     Put the IDs it gives you in the repository's Actions **variables**:
     `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID`
     (and `ANTHROPIC_WORKSPACE_ID` if the rule spans workspaces). Each run mints a short-lived
     token; nothing long-lived is stored.
   - **API key:** a repository secret `ANTHROPIC_API_KEY`. It takes precedence if both exist. Each draft carries a `generated` marker and the site labels it
   "Auto-drafted" until someone sets `generated.reviewed` to `true` in the JSON.
3. **Commit** — new wire and reports are committed back to `main`.
4. **Publish** — the static site is built and pushed to `gh-pages`.

Without the secret, steps 1, 3 and 4 still run; reports are then only the hand-written ones.
A full first run over ~30 events costs a few dollars of API usage with the default model
(`claude-sonnet-5-5`); the daily refresh only touches missing or stale reports.

By hand: `ANTHROPIC_API_KEY=… npm run draft -- <event-id>` (or `--all`, `--dry-run`,
`--model <id>`, `--force`, `--max <n>`). Any JSON file in `src/content/dossiers/` is a
published report; nothing needs registering. Add events by appending to the region files
under `src/content/events/`.

## Stack

Next.js 16 (App Router, cache components), React 19, Tailwind 4, d3-geo + world-atlas for the
map, self-hosted Newsreader and IBM Plex Sans. The two scripts are plain Node (22+), importing
`events.ts` directly.
