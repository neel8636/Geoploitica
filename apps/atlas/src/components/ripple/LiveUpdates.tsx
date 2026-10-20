"use client";

import { useEffect, useState } from "react";

/*
  Keeps an open page honest. The site rebuilds every hour with fresh headlines; this checks
  /live.json every five minutes (and when the tab comes back into view) and, when a newer build
  is out, offers a one-click refresh instead of leaving the reader on stale news.
*/
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function LiveUpdates({ version, today }: { version: string | null; today: string[] }) {
  const [news, setNews] = useState<{ ripplesChanged: boolean } | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!version) return;
    let stop = false;
    const check = async () => {
      if (stop || document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`${BASE}/live.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { wireFetchedAt: string | null; today: string[] };
        if (j.wireFetchedAt && j.wireFetchedAt !== version && Date.parse(j.wireFetchedAt) > Date.parse(version)) {
          setNews({ ripplesChanged: j.today.join() !== today.join() });
        }
      } catch {}
    };
    const t = window.setInterval(check, 5 * 60_000);
    const onVis = () => check();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [version, today]);

  if (!news || hidden) return null;
  return (
    <div role="status" className="fixed left-1/2 top-3 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-paper px-4 py-2 text-sm shadow-lg">
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-teal" aria-hidden />
      <span className="flex-1">{news.ripplesChanged ? "New headlines, and today's ripples have changed." : "New headlines are in."}</span>
      <button type="button" onClick={() => location.reload()} className="rounded-full bg-teal px-3 py-0.5 text-paper">Refresh</button>
      <button type="button" onClick={() => setHidden(true)} aria-label="Dismiss" className="text-ink-3 hover:text-ink">✕</button>
    </div>
  );
}
