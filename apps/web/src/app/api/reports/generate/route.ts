import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { getEvent } from "@/content/events";
import { getDossier, resetDossierCache } from "@/content/dossiers";
import { DEFAULT_MODEL, extractJson, finishDraft, materialFor, systemPrompt, userPrompt, type WireHeadline } from "@/content/drafting";

/*
  Generate (or regenerate) the layered report for one event, on demand.

  POST /api/reports/generate  { eventId }  →  a stream of heartbeat lines while the model
  works (so proxies keep the connection open), then one JSON line:
    { ok: true, dossier, saved: { local: boolean, repo: boolean }, unknownSources }
    { ok: false, error }

  Needs ANTHROPIC_API_KEY on the server. Optional:
    REPORT_PASSCODE     if set, callers must send it as the x-passcode header
    GITHUB_TOKEN        a token with contents:write on the repo below; when set, the report
                        is committed to apps/atlas/src/content/dossiers so it becomes
                        permanent in both editions on the next deploy
    GITHUB_REPO         owner/repo, default neel8636/Geoploitica
    REPORT_CORS_ORIGIN  origin allowed to call this from the browser (the Atlas), default
                        https://neel8636.github.io
    REPORT_MODEL        model id, default claude-sonnet-5-5
*/

const CORS_ORIGIN = process.env.REPORT_CORS_ORIGIN ?? "https://neel8636.github.io";

function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allow = origin && (origin === CORS_ORIGIN || origin.startsWith("http://localhost")) ? origin : CORS_ORIGIN;
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-passcode",
    vary: "origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  // lets a client ask whether generation is available before showing the button
  const body = {
    available: Boolean(process.env.ANTHROPIC_API_KEY),
    passcode: Boolean(process.env.REPORT_PASSCODE),
    persists: Boolean(process.env.GITHUB_TOKEN),
    model: process.env.REPORT_MODEL ?? DEFAULT_MODEL,
  };
  return Response.json(body, { headers: corsHeaders(req) });
}

function atlasContentDir() {
  // beside this app in the monorepo, both locally and in the container
  return path.resolve(process.cwd(), "..", "atlas", "src", "content");
}

async function commitToRepo(id: string, json: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;
  const repo = process.env.GITHUB_REPO ?? "neel8636/Geoploitica";
  const filePath = `apps/atlas/src/content/dossiers/${id}.json`;
  const api = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const headers = { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json", "user-agent": "geopolitica" };
  let sha: string | undefined;
  const cur = await fetch(`${api}?ref=main`, { headers });
  if (cur.ok) sha = ((await cur.json()) as { sha?: string }).sha;
  const put = await fetch(api, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `Atlas: report for ${id} generated from the app`,
      content: Buffer.from(json, "utf8").toString("base64"),
      branch: "main",
      ...(sha ? { sha } : {}),
    }),
  });
  if (!put.ok) throw new Error(`GitHub commit failed: ${put.status} ${(await put.text()).slice(0, 200)}`);
  return true;
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json({ ok: false, error: "Report generation is not configured on this server (ANTHROPIC_API_KEY)." }, { status: 503, headers: cors });
  }
  if (process.env.REPORT_PASSCODE && req.headers.get("x-passcode") !== process.env.REPORT_PASSCODE) {
    return Response.json({ ok: false, error: "Passcode required." }, { status: 401, headers: cors });
  }
  let eventId = "";
  try {
    eventId = String(((await req.json()) as { eventId?: string }).eventId ?? "");
  } catch {}
  const event = getEvent(eventId);
  if (!event) return Response.json({ ok: false, error: `Unknown event "${eventId}".` }, { status: 404, headers: cors });

  const model = process.env.REPORT_MODEL ?? DEFAULT_MODEL;
  const today = new Date().toISOString().slice(0, 10);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s + "\n"));
      const beat = setInterval(() => send("…"), 5000);
      try {
        // material
        const typesSource = fs.readFileSync(path.join(process.cwd(), "src", "content", "types.ts"), "utf8");
        const example = getDossier("france-unrest-2026");
        if (!example) throw new Error("the reference report is missing");
        let wire: WireHeadline[] = [];
        try {
          wire = (JSON.parse(fs.readFileSync(path.join(atlasContentDir(), "wire.json"), "utf8")) as { items: WireHeadline[] }).items ?? [];
        } catch {}
        const { text, items } = materialFor(event, wire);
        send(`drafting ${event.title} from ${event.sources.length} sources and ${items.length} headlines`);

        // model
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": key },
          body: JSON.stringify({
            model,
            max_tokens: 16000,
            system: systemPrompt({ typesSource, example, wire, today }),
            messages: [{ role: "user", content: userPrompt(text) }],
          }),
        });
        if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const body = (await res.json()) as { content: { type: string; text?: string }[] };
        const out = body.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
        const { draft, unknownSources } = finishDraft(JSON.parse(extractJson(out)), event, items, {
          model,
          by: "Geopolitica (generated in the app)",
          today,
        });
        const json = JSON.stringify(draft, null, 2) + "\n";

        // persist: locally for this deployment, and to the repo when a token is set
        let local = false;
        try {
          const dir = path.join(process.cwd(), "src", "content", "dossiers");
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, `${event.id}.json`), json);
          resetDossierCache();
          local = true;
        } catch {}
        let repo = false;
        try {
          repo = await commitToRepo(event.id, json);
        } catch (err) {
          send(`note: ${(err as Error).message}`);
        }
        send(JSON.stringify({ ok: true, dossier: draft, saved: { local, repo }, unknownSources }));
      } catch (err) {
        send(JSON.stringify({ ok: false, error: (err as Error).message }));
      } finally {
        clearInterval(beat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...cors, "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}
