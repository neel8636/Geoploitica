"use client";

import { useState } from "react";
import Link from "next/link";
import { EVENTS, TYPE_LABELS, type EventType } from "@/content/events";
import { formatDate } from "@/content/dossiers";
import WorldMap from "@/components/WorldMap";

const TYPES = Object.keys(TYPE_LABELS) as EventType[];

/*
  The events index: a type filter, the map narrowed to that type, and the list.
  Everything is in memory, so the filter is instant and the page stays static.
*/
export default function EventsBrowser({ stats }: { stats: Record<string, { degree: number; headlines: number }> }) {
  const [filter, setFilter] = useState<EventType | "all">("all");

  const list = EVENTS.filter((e) => filter === "all" || e.type === filter).sort((a, b) =>
    a.status === b.status ? (a.date < b.date ? 1 : -1) : a.status === "scheduled" ? 1 : -1,
  );

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`;

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
        <button type="button" className={chip(filter === "all")} onClick={() => setFilter("all")}>
          All ({EVENTS.length})
        </button>
        {TYPES.map((t) => {
          const n = EVENTS.filter((e) => e.type === t).length;
          if (!n) return null;
          return (
            <button key={t} type="button" className={chip(filter === t)} onClick={() => setFilter(t)}>
              {TYPE_LABELS[t]} ({n})
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <WorldMap filter={filter} compact />
      </div>

      <ol className="mt-8 divide-y divide-line-2 border-t border-line">
        {list.map((e) => {
          const s = stats[e.id] ?? { degree: 0, headlines: 0 };
          return (
            <li key={e.id} className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr]">
              <div className="text-sm text-ink-2">
                <p>{e.status === "scheduled" ? "Scheduled" : e.status[0].toUpperCase() + e.status.slice(1)}</p>
                <p>{formatDate(e.date)}</p>
                <p>{TYPE_LABELS[e.type]} · {e.region}</p>
              </div>
              <div>
                <Link href={`/events/${e.id}`} className="font-serif text-2xl hover:underline">{e.title}</Link>
                <p className="mt-1 text-[15px] text-ink-2">{e.summary}</p>
                <p className="mt-1 text-sm text-ink-3">
                  Severity {e.severity}/5 · {s.degree} connections{s.headlines ? ` · ${s.headlines} headlines on the wire` : ""}{e.dossierSlug ? " · full report" : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
