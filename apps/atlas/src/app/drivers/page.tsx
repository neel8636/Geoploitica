import type { Metadata } from "next";
import Link from "next/link";
import { EVENTS, allEdges, getEvent } from "@/content/events";
import { DRIVERS } from "@/content/drivers";
import EventLink from "@/components/ripple/EventLink";
import { LineKinds } from "@/components/atlas/MapLegend";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Drivers: the forces behind the news",
  description: "The underlying forces that push many world events at once, and how to read the lines between events on the map.",
  alternates: { canonical: `${SITE_URL}/drivers/` },
};

/*
  The drivers view: each underlying force, what it is, how it moves events, what to watch, and
  every event it pushes (from the connections that name it).
*/
export default function DriversPage() {
  const edges = allEdges();
  const eventsFor = (id: string) => {
    const ids = new Set(edges.filter((e) => e.driver === id).flatMap((e) => [e.a, e.b]));
    return EVENTS.filter((e) => ids.has(e.id)).sort((a, b) => b.severity - a.severity);
  };
  const linksFor = (id: string) => edges.filter((e) => e.driver === id);

  return (
    <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <p className="signpost">How events ripple</p>
      <h1 className="mt-1 text-4xl">The forces behind the news</h1>
      <p className="prose-dossier mt-3 max-w-3xl text-ink-2">
        Most world events are not isolated. Some act on each other directly: a fuel shock feeds into protests, protests push up a
        government&apos;s borrowing costs. Others never touch, yet move together because the same force is pushing both. Those forces
        are the drivers. Learn a driver once and you can read a dozen headlines at a glance.
      </p>

      <section className="mt-8 rounded-lg border border-line bg-paper-2 p-5">
        <LineKinds wide />
      </section>

      {DRIVERS.length ? (
        <ol className="mt-10 space-y-8">
          {DRIVERS.map((d) => {
            const events = eventsFor(d.id);
            const links = linksFor(d.id);
            return (
              <li key={d.id} id={d.id} className="scroll-mt-24 border-t border-line pt-6">
                <h2 className="text-2xl">{d.name}</h2>
                <div className="mt-2 grid gap-6 lg:grid-cols-[1fr_1fr]">
                  <div className="prose-dossier space-y-2 text-ink-2">
                    <p><span className="text-ink">What it is.</span> {d.what}</p>
                    <p><span className="text-ink">How it moves events.</span> {d.how}</p>
                    <p><span className="text-ink">What to watch.</span> {d.watch}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Pushing {events.length} event{events.length === 1 ? "" : "s"} on the map</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {events.map((e) => (
                        <li key={e.id}>
                          <EventLink id={e.id} className="inline-block rounded-full border border-line px-3 py-1 text-sm no-underline hover:border-ink">
                            {e.title}
                          </EventLink>
                        </li>
                      ))}
                    </ul>
                    {links.length ? (
                      <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
                        {links.slice(0, 4).map((l) => (
                          <li key={l.a + l.b}>
                            <span className="text-ink">{getEvent(l.a)?.title}</span> and <span className="text-ink">{getEvent(l.b)?.title}</span>: {l.why}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-8 text-ink-2">Drivers are being named. <Link href="/" className="underline">Back to the map</Link>.</p>
      )}
    </article>
  );
}
