import type { Metadata } from "next";
import Link from "next/link";
import { EVENTS, getEvent } from "@/content/events";
import { formatDate } from "@/content/dossiers";
import { loadWire, type WireItem } from "@/content/wire";

export const metadata: Metadata = { title: "Wire" };

function Headline({ h }: { h: WireItem }) {
  return (
    <li className="py-2.5">
      <a href={h.url} target="_blank" rel="noreferrer" className="hover:underline">{h.title}</a>
      <span className="block text-sm text-ink-2">
        {h.publisher} · {formatDate(h.published.slice(0, 10))}
        {h.eventIds.length > 1 ? ` · also: ${h.eventIds.slice(1).map((id) => getEvent(id)?.title ?? id).join(", ")}` : ""}
      </span>
    </li>
  );
}

export default function WirePage() {
  const wire = loadWire();
  const matched = EVENTS.map((e) => ({ event: e, items: wire.items.filter((i) => i.eventIds[0] === e.id) }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length);
  const unmatched = wire.items.filter((i) => i.eventIds.length === 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <h1 className="text-3xl">The wire</h1>
      <p className="mt-1 text-ink-2">
        {wire.fetchedAt ? (
          <>Headlines fetched {formatDate(wire.fetchedAt.slice(0, 10))}, matched to events by keyword. {wire.items.length} items, {unmatched.length} unmatched.</>
        ) : (
          <>Nothing fetched yet. Run <code className="rounded-sm bg-paper-2 px-1">npm run wire</code> to pull the feeds.</>
        )}
      </p>

      {matched.map(({ event, items }) => (
        <section key={event.id} className="mt-8">
          <h2 className="text-xl">
            <Link href={`/events/${event.id}`} className="hover:underline">{event.title}</Link>
            <span className="ml-2 text-sm text-ink-2">{items.length}</span>
          </h2>
          <ul className="mt-2 divide-y divide-line-2 border-t border-line text-[15px]">
            {items.map((h) => <Headline key={h.id} h={h} />)}
          </ul>
        </section>
      ))}

      {unmatched.length ? (
        <section className="mt-10">
          <h2 className="text-xl">Not matched to an event</h2>
          <p className="mt-1 text-sm text-ink-2">Scan for anything that deserves a new entry in <code className="rounded-sm bg-paper-2 px-1">src/content/events.ts</code>.</p>
          <ul className="mt-2 divide-y divide-line-2 border-t border-line text-[15px]">
            {unmatched.map((h) => <Headline key={h.id} h={h} />)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
