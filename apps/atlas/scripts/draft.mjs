#!/usr/bin/env node
// Draft full layered reports (Dossier JSON) for events, from each event's entry, its
// connections and its wire headlines, using the Claude API. Drafts are written to
// src/content/dossiers/<event-id>.json and are live on the next build. Each carries a
// `generated` marker so the site labels it as auto-drafted until someone reviews it.
//
//   npm run draft -- <event-id>            one event (refuses to overwrite without --force)
//   npm run draft -- --all                 every event without a report
//   npm run draft -- --all --stale 7       also refresh developing events whose report is > 7 days old
//   npm run draft -- --all --dry-run       list what would be drafted
//   options: --model <id> (default claude-sonnet-5-5)  --force  --max <n>
//
// Review is a human edit of the JSON: set generated.reviewed to true (or delete the
// `generated` block) and the notice disappears. The script never edits events.ts.
//
// Credentials: ANTHROPIC_API_KEY, or workload identity federation (see the auth section).

import { readFile, writeFile, access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS, getEvent } from "../src/content/events.ts";
import { DEFAULT_MODEL, extractJson, finishDraft, materialFor, systemPrompt, userPrompt } from "../src/content/drafting.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const DOSSIERS = path.join(root, "src", "content", "dossiers");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const MODEL = opt("--model", DEFAULT_MODEL);
const FORCE = flag("--force");
const DRY = flag("--dry-run");
const ALL = flag("--all");
const STALE_DAYS = Number(opt("--stale", "0")) || 0;
const MAX = Number(opt("--max", "0")) || Infinity;
const ids = args.filter((a) => !a.startsWith("--") && !["--model", "--stale", "--max"].includes(args[args.indexOf(a) - 1]));

if (!ALL && ids.length === 0) {
  console.log("usage: npm run draft -- <event-id> | --all [--stale <days>] [--dry-run] [--model <id>] [--force] [--max <n>]\n\nevents:");
  for (const e of EVENTS) console.log(`  ${e.id.padEnd(36)} ${e.title}`);
  process.exit(1);
}

// --- authentication ------------------------------------------------------------
// Either an API key (ANTHROPIC_API_KEY) or Workload Identity Federation: in GitHub Actions
// the script mints a fresh OIDC token itself and exchanges it for a short-lived access
// token, so no long-lived key is stored anywhere. Federation needs ANTHROPIC_ORGANIZATION_ID,
// ANTHROPIC_FEDERATION_RULE_ID, ANTHROPIC_SERVICE_ACCOUNT_ID (and ANTHROPIC_WORKSPACE_ID when
// the rule spans workspaces), plus either the Actions OIDC endpoint, ANTHROPIC_IDENTITY_TOKEN
// or ANTHROPIC_IDENTITY_TOKEN_FILE.

const key = process.env.ANTHROPIC_API_KEY;
const fed = {
  rule: process.env.ANTHROPIC_FEDERATION_RULE_ID,
  org: process.env.ANTHROPIC_ORGANIZATION_ID,
  svc: process.env.ANTHROPIC_SERVICE_ACCOUNT_ID,
  ws: process.env.ANTHROPIC_WORKSPACE_ID,
};
const hasFed = Boolean(fed.rule && fed.org && fed.svc);
if (!key && !hasFed && !DRY) {
  console.error("no credentials: set ANTHROPIC_API_KEY, or the ANTHROPIC_FEDERATION_RULE_ID / ANTHROPIC_ORGANIZATION_ID / ANTHROPIC_SERVICE_ACCOUNT_ID trio for workload identity federation");
  process.exit(1);
}

async function identityToken() {
  if (process.env.ACTIONS_ID_TOKEN_REQUEST_URL && process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
    const res = await fetch(`${process.env.ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${encodeURIComponent("https://api.anthropic.com")}`, {
      headers: { authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
    });
    if (!res.ok) throw new Error(`GitHub OIDC token request failed: ${res.status}`);
    return (await res.json()).value;
  }
  if (process.env.ANTHROPIC_IDENTITY_TOKEN) return process.env.ANTHROPIC_IDENTITY_TOKEN;
  if (process.env.ANTHROPIC_IDENTITY_TOKEN_FILE) return (await readFile(process.env.ANTHROPIC_IDENTITY_TOKEN_FILE, "utf8")).trim();
  throw new Error("federation is configured but no identity token source is available (not in GitHub Actions, and no ANTHROPIC_IDENTITY_TOKEN[_FILE])");
}

let minted = null; // { token, expiresAt }
async function authHeaders() {
  if (key) return { "x-api-key": key };
  if (!minted || minted.expiresAt - Date.now() < 120_000) {
    const jwt = await identityToken();
    const body = {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
      federation_rule_id: fed.rule,
      organization_id: fed.org,
      service_account_id: fed.svc,
      ...(fed.ws ? { workspace_id: fed.ws } : {}),
    };
    const res = await fetch("https://api.anthropic.com/v1/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const tok = await res.json();
    minted = { token: tok.access_token, expiresAt: Date.now() + (tok.expires_in ?? 600) * 1000 };
  }
  return { authorization: `Bearer ${minted.token}` };
}

// --- which events ------------------------------------------------------------

async function existing(id) {
  const file = path.join(DOSSIERS, `${id}.json`);
  try {
    await access(file);
    const s = await stat(file);
    let generated = null;
    try {
      generated = JSON.parse(await readFile(file, "utf8")).generated ?? null;
    } catch {}
    return { file, mtime: s.mtimeMs, generated };
  } catch {
    return null;
  }
}

const todo = [];
const today = Date.now();
for (const e of ALL ? EVENTS : ids.map((id) => getEvent(id)).filter(Boolean)) {
  const have = await existing(e.id);
  let reason = null;
  if (!have) reason = "no report yet";
  else if (FORCE) reason = "forced";
  else if (have.generated && !have.generated.reviewed && have.generated.outdated) reason = `outdated: ${have.generated.outdated}`;
  else if (have.generated && !have.generated.reviewed && !have.generated.sourceChecked && STALE_DAYS > 0 && e.status === "developing") {
    const age = (today - Date.parse(have.generated.at)) / 86_400_000;
    if (age > STALE_DAYS) reason = `auto-draft is ${Math.round(age)} days old`;
  }
  if (reason) todo.push({ e, reason });
}
if (!ALL) {
  for (const id of ids) if (!getEvent(id)) console.error(`no event with id "${id}"`);
}
const picked = todo.slice(0, MAX);

if (picked.length === 0) {
  console.log("nothing to draft");
  process.exit(0);
}
console.log(`${picked.length} report(s) to draft${todo.length > picked.length ? ` (of ${todo.length}, capped by --max)` : ""}:`);
for (const t of picked) console.log(`  ${t.e.id.padEnd(36)} ${t.reason}`);
if (DRY) process.exit(0);

// --- material shared by every draft --------------------------------------------

const typesSource = await readFile(path.join(root, "src", "content", "types.ts"), "utf8");
const example = JSON.parse(await readFile(path.join(DOSSIERS, "france-unrest-2026.json"), "utf8"));
let wire = [];
try {
  wire = JSON.parse(await readFile(path.join(root, "src", "content", "wire.json"), "utf8")).items ?? [];
} catch {}
const todayIso = new Date().toISOString().slice(0, 10);
const system = systemPrompt({ typesSource, example, wire, today: todayIso });

// --- one draft -----------------------------------------------------------------

async function callApi(text) {
  // rate limits and overloads are retried with a growing pause; other errors surface at once
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "anthropic-version": "2023-06-01", ...(await authHeaders()) },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: userPrompt(text) }],
      }),
    });
    if (res.ok) return res.json();
    const detail = (await res.text()).slice(0, 300);
    if ((res.status === 429 || res.status === 529 || res.status >= 500) && attempt < 5) {
      const wait = Math.min(120, 15 * attempt);
      process.stdout.write(`(${res.status}, retrying in ${wait}s) `);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }
}

async function draftOne(event) {
  const { text, items } = materialFor(event, wire);
  const body = await callApi(text);
  const out = body.content.filter((c) => c.type === "text").map((c) => c.text).join("");
  const { draft, unknownSources } = finishDraft(JSON.parse(extractJson(out)), event, items, {
    model: MODEL,
    by: "Geopolitica draft script",
    today: todayIso,
  });
  await writeFile(path.join(DOSSIERS, `${event.id}.json`), JSON.stringify(draft, null, 2) + "\n");
  return { tokens: body.usage?.output_tokens ?? 0, unknown: unknownSources };
}

// --- run ------------------------------------------------------------------------

let ok = 0;
let failed = 0;
for (const { e } of picked) {
  process.stdout.write(`drafting ${e.id} … `);
  try {
    const r = await draftOne(e);
    ok++;
    console.log(`ok (${r.tokens.toLocaleString()} tokens)${r.unknown.length ? `\n  verify these sources, not in the material: ${r.unknown.join(", ")}` : ""}`);
  } catch (err) {
    failed++;
    console.log(`failed: ${err.message}`);
  }
}
console.log(`\n${ok} drafted, ${failed} failed. Drafts are live on the next build; review by editing the JSON and setting generated.reviewed to true.`);
if (ok === 0 && failed > 0) process.exitCode = 1;
