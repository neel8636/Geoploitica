import Link from "next/link";
import { EVENTS, TYPE_LABELS, allEdges } from "@/content/events";
import { formatDate } from "@/content/dossiers";
import WorldMap from "@/components/WorldMap";
import { loadWire } from "@/content/wire";

export default function Home() {
  const wire = loadWire();
  const developing = [...EVENTS].filter((e) => e.status !== "scheduled").sort((a, b) => b.severity - a.severity || (a.date < b.date ? 1 : -1));
  const scheduled = [...EVENTS].filter((e) => e.status === "scheduled").sort((a, b) => (a.date < b.date ? -1 : 1));
  const edges = allEdges();
  const degree = (id: string) => edges.filter((ed) => ed.a === id || ed.b === id).length;
  const headlineCount = (id: string) => wire.items.filter((i) => i.eventIds.includes(id)).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl">The world, connected</h1>
        <p className="text-sm text-ink-2">
          {EVENTS.length} events · {edges.length} connections · wire {wire.fetchedAt ? `updated ${formatDate(wire.fetchedAt.slice(0, 10))}` : "not fetched yet"}
        </p>
      </div>
      <div className="mt-4">
        <WorldMap />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-xl">Developing now</h2>
          <ol className="mt-3 divide-y divide-line-2 border-t border-line">
            {developing.map((e) => (
              <li key={e.id} className="py-3">
                <Link href={`/events/${e.id}`} className="no-underline">
                  <p className="text-sm text-ink-2">
                    {TYPE_LABELS[e.type]} · {e.region} · {formatDate(e.date)} · {degree(e.id)} links
                    {headlineCount(e.id) ? ` · ${headlineCount(e.id)} headlines` : ""}
                  </p>
                  <p className="font-serif text-xl hover:underline">{e.title}</p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="text-xl">Coming up</h2>
          <ol className="mt-3 divide-y divide-line-2 border-t border-line">
            {scheduled.map((e) => (
              <li key={e.id} className="py-3">
                <Link href={`/events/${e.id}`} className="no-underline">
                  <p className="text-sm text-ink-2">
                    {formatDate(e.date)} · {TYPE_LABELS[e.type]} · {e.region} · {degree(e.id)} links
                  </p>
                  <p className="font-serif text-xl hover:underline">{e.title}</p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
