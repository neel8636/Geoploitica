"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CHANGE_TYPE_LABELS, fetchChanges, type Change } from "@/lib/engine";
import { formatDate } from "@/content/format";

/* Public change calendar: every dated or developing change the engine knows, sorted by when it bites. */
export default function ChangeRadar() {
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchChanges().then(setChanges).catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p role="alert" className="rounded-sm border border-red bg-red-2 px-3 py-2">{error}</p>;
  if (!changes) return <p className="text-ink-2">Loading the calendar…</p>;

  const when = (c: Change) => c.effective_date ?? c.window_start ?? "";
  const sorted = [...changes].sort((a, b) => (when(a) < when(b) ? -1 : 1));

  return (
    <ol className="divide-y divide-line-2 border-t border-line">
      {sorted.map((c) => (
        <li key={c.id} className="grid gap-2 py-5 sm:grid-cols-[9rem_1fr]">
          <div className="text-sm text-ink-2">
            <p className="tabular font-medium text-ink">
              {c.effective_date ? formatDate(c.effective_date) : c.window_start ? `From ${formatDate(c.window_start)}` : "Undated"}
            </p>
            <p>{CHANGE_TYPE_LABELS[c.type]} · {c.status.replace("_", " ")}</p>
            <p>Severity {c.severity}/5 · {c.confidence} confidence</p>
          </div>
          <div>
            <p className="font-serif text-xl">{c.title}</p>
            <p className="mt-1 text-[15px] text-ink-2">{c.summary}</p>
            <p className="mt-2 text-sm text-ink-2">
              Applies to {c.countries.length > 6 ? `${c.countries.length} countries` : c.countries.join(", ")}
              {c.hs_prefixes?.length ? ` · HS ${c.hs_prefixes.slice(0, 6).join(", ")}${c.hs_prefixes.length > 6 ? "…" : ""}` : ""}
              {c.chokepoints?.length ? ` · ${c.chokepoints.join(", ")}` : ""}
            </p>
            <details className="mt-2 text-[15px]">
              <summary className="cursor-pointer text-sm">What to do</summary>
              <ul className="mt-1 list-disc space-y-1 pl-5">{c.what_to_do.map((w) => <li key={w}>{w}</li>)}</ul>
              <p className="mt-2 text-sm text-ink-2">
                Sources: {c.sources.map((s, i) => (
                  <span key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">{s.publisher ?? s.title}</a>{i < c.sources.length - 1 ? ", " : ""}</span>
                ))}
              </p>
            </details>
            {c.dossier_slug ? (
              <Link href={`/dossiers/${c.dossier_slug}`} className="mt-2 inline-block text-sm text-teal hover:underline">Read the dossier</Link>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
