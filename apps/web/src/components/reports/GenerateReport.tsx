"use client";

import { useEffect, useState } from "react";
import type { Dossier } from "@/content/types";
import { DossierBody } from "@/components/dossier/DossierBody";
import { REPORT_SIZES, type ReportSize } from "@/content/drafting";

/*
  Generate (or regenerate) the layered report for an event from the page itself.
  Talks to the enterprise server's /api/reports/generate; `api` points elsewhere when this
  component runs inside the static Atlas. The result renders in place; whether it is also
  saved for good depends on the server (shown in the status line).
*/
type Phase = "idle" | "checking" | "unavailable" | "working" | "done" | "error";

export default function GenerateReport({
  eventId,
  existing = false,
  api = "",
}: {
  eventId: string;
  existing?: boolean; // a report already shows on this page; offer a refresh instead
  api?: string; // base URL of the enterprise server; empty = same origin
}) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [needsPasscode, setNeedsPasscode] = useState(false);
  const [persists, setPersists] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [size, setSize] = useState<ReportSize>("brief");
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ dossier: Dossier; saved: { local: boolean; repo: boolean }; unknownSources: string[] } | null>(null);

  const endpoint = `${api}/api/reports/generate`;

  useEffect(() => {
    let alive = true;
    fetch(endpoint)
      .then((r) => r.json())
      .then((j: { available: boolean; passcode: boolean; persists: boolean }) => {
        if (!alive) return;
        setNeedsPasscode(j.passcode);
        setPersists(j.persists);
        setPhase(j.available ? "idle" : "unavailable");
      })
      .catch(() => alive && setPhase("unavailable"));
    return () => {
      alive = false;
    };
  }, [endpoint]);

  async function run() {
    setPhase("working");
    setLog([]);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", ...(passcode ? { "x-passcode": passcode } : {}) },
        body: JSON.stringify({ eventId, size }),
      });
      if (!res.ok || !res.body) {
        let msg = `${res.status}`;
        try {
          msg = ((await res.json()) as { error?: string }).error ?? msg;
        } catch {}
        throw new Error(msg);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let last = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line || line === "…") continue;
          if (line.startsWith("{")) last = line;
          else setLog((l) => [...l, line]);
        }
      }
      if (buffer.startsWith("{")) last = buffer;
      if (!last) throw new Error("the server closed the connection before finishing");
      const parsed = JSON.parse(last) as { ok: boolean; error?: string; dossier?: Dossier; saved?: { local: boolean; repo: boolean }; unknownSources?: string[] };
      if (!parsed.ok || !parsed.dossier) throw new Error(parsed.error ?? "generation failed");
      setResult({ dossier: parsed.dossier, saved: parsed.saved ?? { local: false, repo: false }, unknownSources: parsed.unknownSources ?? [] });
      setPhase("done");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }

  if (phase === "checking") return null;

  if (phase === "unavailable") {
    return (
      <p className="text-sm text-ink-3">
        Report generation is not switched on for this server. The daily pipeline still drafts reports for new events.
      </p>
    );
  }

  return (
    <div>
      {phase !== "done" ? (
        <div className="rounded-lg border border-line bg-paper-2 p-4 text-[15px]">
          <p className="font-medium">{existing ? "Build a fresh report with today's headlines" : "Build the report for this event"}</p>
          <p className="mt-1 text-ink-2">
            Same layers every time (card, brief, deep dive, evidence), built around what is fueling the event; choose how deep it goes.
            {persists ? " The result is saved to the atlas for both editions." : " The result shows here and stays on this server until its next deploy."}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Report size">
            {(Object.keys(REPORT_SIZES) as ReportSize[]).map((k) => {
              const z = REPORT_SIZES[k];
              const on = size === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSize(k)}
                  disabled={phase === "working"}
                  className={`rounded-md border p-3 text-left ${on ? "border-teal bg-paper ring-1 ring-teal" : "border-line bg-paper hover:border-ink-3"}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{z.label}</span>
                    <span className="text-xs text-ink-2">about {z.minutes} min</span>
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-ink-2">{z.blurb}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {needsPasscode ? (
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Passcode"
                className="rounded-sm border border-line bg-paper px-2 py-1.5 text-sm"
                aria-label="Passcode"
              />
            ) : null}
            <button
              type="button"
              onClick={run}
              disabled={phase === "working" || (needsPasscode && !passcode)}
              className="rounded-sm bg-teal px-4 py-2 text-paper hover:opacity-90 disabled:opacity-60"
            >
              {phase === "working" ? "Drafting…" : `Build ${REPORT_SIZES[size].label.toLowerCase()} report`}
            </button>
            {phase === "working" ? <span className="text-sm text-ink-2">{log[log.length - 1] ?? "Starting"}</span> : null}
            {phase === "error" ? <span className="text-sm text-red">{error}</span> : null}
          </div>
        </div>
      ) : null}

      {phase === "done" && result ? (
        <div className="mt-6">
          <div className="rounded-lg border border-green bg-green-2 p-4 text-[15px]">
            <p className="font-medium">Report generated.</p>
            <p className="mt-1 text-ink-2">
              {result.saved.repo
                ? "Saved to the atlas; it is live in both editions after the next deploy (a few minutes)."
                : result.saved.local
                  ? "Saved on this server until its next deploy. Set a GitHub token on the server to keep reports for good."
                  : "Shown here only."}
              {result.unknownSources.length ? ` Check these sources, which were not in the material: ${result.unknownSources.join(", ")}` : ""}
            </p>
          </div>
          <div className="mt-6 border-t-2 border-teal pt-6">
            <DossierBody d={result.dossier} backHref="#" backLabel="Top" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
