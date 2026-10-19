# Geoploitica

One site to see the ripple effects of events across the globe and what you should be ready for.

Two products share one research pipeline:

- **Dossiers** (`/dossiers`): each major event as a layered, interactive page. A 30-second card with a ripple map, a 5-minute brief with the same signposts every time (what happened, why it matters, who wins and loses, what's next), deep-dive modules (timeline, root causes, markets, stakeholders, industries, daily life, scenarios, countermeasures, analogues, what to watch) and an evidence layer with every source, a confidence label per claim and a change log. Readers predict before they read and recap after.
- **Company impact reports** (`/enterprise`): a company shares its supply-chain footprint (suppliers, parts with HS codes, lanes, sites) and the impact engine matches it against a calendar of dated changes (regulations, tariffs, strikes, unrest, chokepoints, energy shocks). Each department gets a brief: what changes, when, your exposure, cost if unprepared, next action, owner.
- **Change radar** (`/changes`): the public calendar both products run on.

## Layout

```
apps/web      Next.js 16 + TypeScript + Tailwind. Dossier content lives in src/content/dossiers/*.json.
apps/engine   Python 3.11+ FastAPI impact engine: models, change calendar, exposure matching, brief generation.
docs/         api-contract.md is the contract between the two. Keep it and both sides in sync.
```

## Run it locally

Requirements: Node 22+, Python 3.11+.

```bash
npm install              # root tooling
npm run setup            # installs web deps and the engine venv
cp .env.example .env     # defaults work for local
npm run dev              # web on http://localhost:3000, engine on http://localhost:8000
```

Or with Docker: `docker compose up --build`.

Tests: `npm test` runs the engine's pytest suite. `npm run build` type-checks and builds the web app.

## Deploy

- Web: any Node host. On Vercel set `ENGINE_URL` to the engine's public URL. The engine is only ever called server-side through `/api/engine/*`.
- Engine: `apps/engine/Dockerfile` runs on Render, Fly, Railway or any container host. Set `CORS_ORIGINS` to the web origin.

## Add a dossier

1. Copy `apps/web/src/content/dossiers/france-unrest-2026.json`, change the slug and fill every layer. The TypeScript types in `src/content/types.ts` are the template.
2. Register it in `src/content/dossiers.ts`.
3. Add the event to `apps/engine/geoploitica_engine/data/changes.json` with `dossier_slug` set, so company reports link to it.

## Add a change to the calendar

Edit `apps/engine/geoploitica_engine/data/changes.json`. Every change needs a type, dates or a window, countries, HS prefixes or chokepoints where relevant, severity 1-5, confidence, the departments that act, 1-4 actions, and at least one source with the date it was accessed. The engine validates the file on start.

## Principles

- Every number links to its source; sources are tiered and headline figures use tiers one and two only.
- Facts and judgement stay apart; probabilities and predictions are labelled as judgement and graded when they resolve.
- No feeds, no outrage, no autoplay. Readers choose their depth.
- Company data is used for the one request and not stored. Decision support, not advice.

## Status

Version 0.1: one published dossier (France, October 2026), 12 calendar entries, engine with deterministic scoring and rule-based briefs. Before customers pay: authentication, stored footprints with watchlists and alerts, a verified and continuously updated change database, a human editorial pass on every dossier, and a public forecast scorecard.
