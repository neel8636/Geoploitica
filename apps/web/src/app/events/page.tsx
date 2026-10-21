import type { Metadata } from "next";
import Link from "next/link";
import { EVENTS, TYPE_LABELS, allEdges } from "@/content/events";
import { getDossier, formatDate } from "@/content/dossiers";
import { Suspense } from "react";
import { liveCards } from "@/lib/live";
import { PulseBadge } from "@/components/live/Live";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  const edges = allEdges();
  const degree = (id: string) => edges.filter((ed) => ed.a === id || ed.b === id).length;
  const list = [...EVENTS].sort((a, b) =>
    a.status === b.status ? b.severity - a.severity || (a.date < b.date ? 1 : -1) : a.status === "scheduled" ? 1 : -1,
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl">Events</h1>
      <p className="prose-dossier mt-3 text-ink-2">
        Every event Geopolitica tracks, with how it connects to the others. Open one to read its report, or generate a fresh one
        from today&apos;s headlines.
      </p>
      <ol className="mt-8 divide-y divide-line-2 border-t border-line">
        {list.map((e) => {
          const report = getDossier(e.id);
          return (
            <li key={e.id} className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr]">
              <div className="text-sm text-ink-2">
                <p>{e.status === "scheduled" ? "Scheduled" : e.status[0].toUpperCase() + e.status.slice(1)}</p>
                <p>{formatDate(e.date)}</p>
                <p>{TYPE_LABELS[e.type]} · {e.region}</p>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/events/${e.id}`} className="font-serif text-2xl hover:underline">{e.title}</Link>
                  <Suspense fallback={null}><LivePulse id={e.id} /></Suspense>
                </div>
                <p className="mt-1 text-[15px] text-ink-2">{e.summary}</p>
                <p className="mt-1 text-sm text-ink-3">
                  Severity {e.severity}/5 · {degree(e.id)} connection{degree(e.id) === 1 ? "" : "s"} ·{" "}
                  {report ? `report updated ${formatDate(report.updated)}${report.generated && !report.generated.reviewed ? " (auto-drafted)" : ""}` : "no report yet"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

async function LivePulse({ id }: { id: string }) {
  const c = (await liveCards())[id];
  if (!c) return null;
  return (
    <>
      <PulseBadge pulse={c.pulse} />
      {c.fuel?.items.length ? <span className="text-xs text-ink-3">{c.fuel.items.length} small event{c.fuel.items.length === 1 ? "" : "s"} fueling it</span> : null}
    </>
  );
}
