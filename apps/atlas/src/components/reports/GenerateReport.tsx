"use client";

import { useEffect, useState } from "react";
import type { Dossier } from "@/content/types";
import { DossierBody } from "@/components/dossier/DossierBody";
import { useAuth } from "@/components/auth/AuthProvider";

/*
  Generate (or regenerate) the layered report for an event from the page itself.
  Talks to the enterprise server's /api/reports/generate. Signed-in readers send their
  Firebase ID token, which the server verifies and allows a few reports a day; the owner's
  passcode still works for anyone not signed in. The result renders in place; whether it is
  also saved for good depends on the server (shown in the status line).
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
  const { user } = useAuth();
  const [serverNeedsPasscode, setNeedsPasscode] = useState(false);
  const [readersAllowed, setReadersAllowed] = useState(false);
  const [perDay, setPerDay] = useState(0);
  const [persists, setPersists] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ dossier: Dossier; saved: { local: boolean; repo: boolean }; unknownSources: string[] } | null>(null);

  const endpoint = `${api}/api/reports/generate`;

  useEffect(() => {
    let alive = true;
    fetch(endpoint)
      .then((r) => r.json())
      .then((j: { available: boolean; passcode: boolean; persists: boolean; readers?: boolean; perDay?: number }) => {
        if (!alive) return;
        setNeedsPasscode(j.passcode);
        setReadersAllowed(Boolean(j.readers));
        setPerDay(j.perDay ?? 0);
        setPersists(j.persists);
        setPhase(j.available ? "idle" : "unavailable");
      })
      .catch(() => alive && setPhase("unavailable"));
    return () => {
      alive = false;
    };
  }, [endpoint]);

  // a signed-in reader is let through by their sign-in; the passcode is for everyone else
  const useToken = Boolean(user && readersAllowed);
  const needsPasscode = serverNeedsPasscode && !useToken;

  async function run() {
    setPhase("working");
    setLog([]);
    setError("");
    try {
      const token = useToken && user ? await user.getIdToken() : "";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(passcode && !token ? { "x-passcode": passcode } : {}),
        },
        body: JSON.stringify({ eventId }),
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
        Report generation is not switched on for this server. The hourly pipeline still drafts reports for new events.
      </p>
    );
  }

  return (
    <div>
      {phase !== "done" ? (
        <div className="rounded-lg border border-line bg-paper-2 p-4 text-[15px]">
          <p className="font-medium">{existing ? "Regenerate this report with today's headlines" : "No full report yet"}</p>
          <p className="mt-1 text-ink-2">
            {existing
              ? "Drafts a fresh 30-second card, 5-minute brief, deep dive and evidence layer from the event's sources and the latest matched headlines. About two minutes."
              : "Draft the full layered report now: a 30-second card, a 5-minute brief, deep-dive modules and an evidence layer, from the event's sources and matched headlines. About two minutes."}
            {persists ? " The result is saved to the atlas for both editions." : " The result shows here and stays on this server until its next deploy."}
            {useToken && perDay ? ` Each reader can generate ${perDay} reports a day.` : ""}
          </p>
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
              {phase === "working" ? "Drafting…" : existing ? "Regenerate report" : "Generate report"}
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
