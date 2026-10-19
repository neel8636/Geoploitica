"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CHANGE_TYPE_LABELS, fetchChanges, type Change } from "@/lib/engine";
import { formatDate } from "@/content/format";

/*
  The next few dated changes on the radar, pulled live from the engine so the front page
  moves as the calendar does. Falls back to a quiet line if the engine is asleep.
*/
export default function UpcomingChanges({ limit = 6 }: { limit?: number }) {
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetchChanges().then(setChanges).catch(() => setError(true));
  }, []);

  if (error) return <p className="text-sm text-ink-2">The calendar is waking up. Open the change radar in a moment.</p>;
  if (!changes) return <p className="text-sm text-ink-2">Loading the calendar…</p>;

  const today = new Date().toISOString().slice(0, 10);
  const when = (c: Change) => c.effective_date ?? c.window_start ?? "";
  const next = changes
    .filter((c) => c.status === "developing" || when(c) >= today)
    .sort((a, b) => (a.status === "developing") === (b.status === "developing") ? (when(a) < when(b) ? -1 : 1) : a.status === "developing" ? -1 : 1)
    .slice(0, limit);

  return (
    <ol className="divide-y divide-line-2 border-t border-line">
      {next.map((c) => (
        <li key={c.id} className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]">
          <p className="tabular text-sm text-ink-2">
            {c.status === "developing" ? "Developing" : when(c) ? formatDate(when(c)) : "Undated"}
          </p>
          <div>
            <Link href={c.dossier_slug ? `/dossiers/${c.dossier_slug}` : "/changes"} className="font-serif text-lg no-underline hover:underline">
              {c.title}
            </Link>
            <p className="text-sm text-ink-2">
              {CHANGE_TYPE_LABELS[c.type]} · severity {c.severity}/5 · {c.countries.length > 4 ? `${c.countries.length} countries` : c.countries.join(", ")}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
