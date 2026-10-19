import { NextRequest } from "next/server";

// Proxies /api/engine/* to the impact engine so the browser never needs the engine URL
// and the engine can stay private to the deployment.
// ENGINE_URL may be a bare host (Render's blueprint hands the engine over that way); assume https then.
const rawEngine = process.env.ENGINE_URL ?? "http://localhost:8000";
const ENGINE_URL = (/^https?:\/\//.test(rawEngine) ? rawEngine : `https://${rawEngine}`).replace(/\/$/, "");
const ALLOWED = ["health", "changes", "footprint", "analyze"];

async function forward(req: NextRequest, path: string[]) {
  if (!ALLOWED.includes(path[0])) {
    return Response.json({ error: "Unknown engine route" }, { status: 404 });
  }
  const target = new URL(`${ENGINE_URL}/${path.join("/")}`);
  req.nextUrl.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  const init: RequestInit = { method: req.method, headers: {} };
  if (req.method !== "GET") {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("multipart/form-data")) {
      init.body = await req.formData();
    } else {
      init.body = await req.text();
      init.headers = { "content-type": ct || "application/json" };
    }
  }
  try {
    const res = await fetch(target, init);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json(
      { error: "The impact engine is not reachable. Start it with `python -m geoploitica_engine` or set ENGINE_URL." },
      { status: 503 },
    );
  }
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/engine/[...path]">) {
  const { path } = await ctx.params;
  return forward(req, path);
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/engine/[...path]">) {
  const { path } = await ctx.params;
  return forward(req, path);
}
