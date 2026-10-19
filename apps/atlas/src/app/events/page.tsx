import type { Metadata } from "next";
import { Suspense } from "react";
import { EVENTS, allEdges } from "@/content/events";
import { loadWire } from "@/content/wire";
import EventsBrowser from "@/components/atlas/EventsBrowser";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  const wire = loadWire();
  const edges = allEdges();
  const stats = Object.fromEntries(
    EVENTS.map((e) => [
      e.id,
      {
        degree: edges.filter((ed) => ed.a === e.id || ed.b === e.id).length,
        headlines: wire.items.filter((i) => i.eventIds.includes(e.id)).length,
      },
    ]),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="text-3xl">All events</h1>
      <p className="mt-1 text-ink-2">Everything the atlas tracks. Filter by kind; the map follows.</p>
      <Suspense fallback={null}>
        <EventsBrowser stats={stats} />
      </Suspense>
    </div>
  );
}
