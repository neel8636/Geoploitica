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
`apps/atlas`, every hour (at :17), and on demand from the Actions tab:

1. **Wire** — `npm run wire` pulls the feeds and matches headlines to events.
2. **Reports** — when the run can reach the Claude API, `npm run draft -- --all --stale 7`
   writes a full layered report for every event that has none, and re-drafts auto-drafted
   reports of developing events older than seven days. Two ways to give it access:
   - **Keyless (preferred):** workload identity federation. In the Claude Console, Organization
     settings → Workload identity → Connect workload → GitHub Actions, with subject
     `repo:neel8636/Geopolitica:ref:refs/heads/main` and audience `https://api.anthropic.com`.
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
(`claude-sonnet-5-5`); the hourly refresh only touches missing or stale reports.

By hand: `ANTHROPIC_API_KEY=… npm run draft -- <event-id>` (or `--all`, `--dry-run`,
`--model <id>`, `--force`, `--max <n>`). Any JSON file in `src/content/dossiers/` is a
published report; nothing needs registering. Add events by appending to the region files
under `src/content/events/`.

## Reader accounts and the sign-up line

Open to everyone: the map, every event page, its 30-second card, ripple, connections, headlines
and sources, and each report's evidence section. Behind a free account: the 5-minute brief and
the deep dive (`<MembersOnly>` in `src/components/auth/MembersOnly.tsx`), and on-demand report
generation. Readers sign up in place, or at `/join`, with email and password or Google.

Accounts live in Firebase Authentication (project `geopolitica-941b0`), with a profile per reader
in Firestore at `users/{uid}`: name, email, country, what brings them here, first and last visit,
and `source`, where they first arrived from. The rules in
[`firebase/firestore.rules`](firebase/firestore.rules) let each reader touch only their own profile.

The Pages workflow builds with that project's web config (public by design: it names the project,
and Auth plus the rules do the protecting); repository variables `FIREBASE_API_KEY`,
`FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `FIREBASE_STORAGE_BUCKET`,
`FIREBASE_MESSAGING_SENDER_ID` and `FIREBASE_MEASUREMENT_ID` override it. Local builds have no
config, so every layer is open.

This is a reading wall, not access control: the site is static and the repository is public.

## Ripples: postcards, Today's ripples, live updates

- **Postcards.** Clicking any event (a map dot, a title in a list, a connection) opens its ripple
  as a postcard over the page (`src/components/ripple/`): headline, key number, impact, the
  ripple rings, how far the report has been checked, fresh headlines, and "Ripples on to" chips
  that open the next event's card in place. Ctrl/Cmd-click still goes to the event page.
  Cards come from `/ripples.json`, built from `src/content/ripples.ts` on every export.
- **Today's ripples.** The home page shows the five events the news is moving on, ranked by
  headlines in the last 48 hours (only headlines whose title names the event), then severity,
  then how far the report has been checked. Rebuilt every hour, so the set changes with the news.
- **Live updates.** Open pages check `/live.json` every five minutes and when the tab comes back
  into view; when a newer hourly build is out they offer a one-click refresh.

## Sharing and measuring

- **Share cards.** Every event has a 1200×630 card at `/share/<event-id>.png` (and the site one at
  `/share/atlas.png`), built at export time and set as its `og:image`, so a link posted on
  LinkedIn, Reddit, X or WhatsApp shows the event and the first ring of its ripple.
- **Tracking links.** Add `?utm_source=reddit&utm_campaign=launch` (or `?ref=linkedin`) to a shared
  link. The first visit's source is kept in the browser and saved with the reader's profile at
  sign-up, so Firestore → `users` shows sign-ups by channel. Without a tag, the referring site is used.
- **Analytics.** Page views, `sign_up` and `login` go to Google Analytics through Firebase
  (measurement ID in the build).
- **Sitemap.** `/sitemap.xml` lists every page; submit it in Google Search Console.
- **Corrections.** Every event page and report links to a prefilled GitHub issue
  (`label: correction`); the guide's "How reports are made" section explains the method.

## Stack

Next.js 16 (App Router, cache components), React 19, Tailwind 4, d3-geo + world-atlas for the
map, self-hosted Newsreader and IBM Plex Sans. The two scripts are plain Node (22+), importing
`events.ts` directly.
