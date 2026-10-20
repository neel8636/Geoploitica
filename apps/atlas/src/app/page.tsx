import Link from "next/link";
import { EVENTS, TYPE_LABELS, allEdges, type EventType } from "@/content/events";
import { formatDate, getDossier } from "@/content/dossiers";
import RippleMap from "@/components/RippleMap";
import { ImpactMeter } from "@/components/dossier/Primitives";
import { loadWire } from "@/content/wire";
import HomeExplorer from "@/components/atlas/HomeExplorer";

const STEPS = [
  { n: "1", title: "Pick a place", body: "Choose a region above the map, or hover any dot: the lines light up to show what that event is tied to." },
  { n: "2", title: "Open an event", body: "Click a dot or a title below. You get the summary, how it ripples outward, and every connection with the reason for it." },
  { n: "3", title: "Follow the thread", body: "Each connection is a link to the next event. Where a full report exists, it sits at the bottom of the page in layers." },
];

export default function Home() {
  const wire = loadWire();
  const edges = allEdges();
  const degree = (id: string) => edges.filter((ed) => ed.a === id || ed.b === id).length;
  const headlineCount = (id: string) => wire.items.filter((i) => i.eventIds.includes(id)).length;

  const developing = [...EVENTS].filter((e) => e.status !== "scheduled").sort((a, b) => b.severity - a.severity || (a.date < b.date ? 1 : -1)).slice(0, 8);
  const scheduled = [...EVENTS].filter((e) => e.status === "scheduled").sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 8);
  const kinds = (Object.keys(TYPE_LABELS) as EventType[])
    .map((t) => ({ t, n: EVENTS.filter((e) => e.type === t).length }))
    .filter((k) => k.n > 0)
    .sort((a, b) => b.n - a.n);
  const regions = Array.from(new Set(EVENTS.map((e) => e.region))).length;

  // Ripple of the day: rotates daily through the most severe developing events that have their own report.
  const withReport = EVENTS
    .filter((e) => e.status !== "scheduled" && getDossier(e.id)?.slug === e.id)
    .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id))
    .slice(0, 7);
  // keyed to the day the headlines were fetched, so it turns over with each morning's build
  const dayIndex = Math.floor((Date.parse(wire.fetchedAt || "") || 0) / 86_400_000);
  const featured = withReport.length ? withReport[dayIndex % withReport.length] : undefined;
  const fd = featured ? getDossier(featured.id) : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <section className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <h1 className="text-[2.25rem] leading-[1.1] sm:text-[2.75rem]">Follow one event to everything it touches.</h1>
          <p className="prose-dossier mt-3 max-w-2xl text-ink-2">
            A strike in one country, a closed shipping lane, a vote in a capital: each one ripples into prices, jobs and other
            countries. {EVENTS.length} events across {regions} places, joined by {edges.length} connections, each with the
            sentence and the source that justify it. Start anywhere.
          </p>
        </div>
        <p className="text-sm text-ink-2 lg:text-right">
          Headlines {wire.fetchedAt ? `updated ${formatDate(wire.fetchedAt.slice(0, 10))}` : "not fetched yet"} ·{" "}
          <Link href="/guide" className="hover:underline">How to use this</Link>
        </p>
      </section>

      {featured && fd ? (
        <section className="mt-8 grid gap-6 rounded-lg border border-line bg-paper-2 p-5 lg:grid-cols-[1fr_1.1fr] lg:items-center" aria-label="Ripple of the day">
          <div>
            <p className="signpost">Ripple of the day</p>
            <h2 className="mt-1 text-3xl">
              <Link href={`/events/${featured.id}`} className="no-underline hover:underline">{fd.title}</Link>
            </h2>
            <p className="mt-3 font-serif text-xl leading-snug">{fd.card.headline}</p>
            <p className="mt-4 font-serif">
              <span className="tabular text-4xl font-medium">{fd.card.keyNumber.value}</span>
              <span className="mt-1 block text-[15px] text-ink-2">{fd.card.keyNumber.label}</span>
            </p>
            <div className="mt-4"><ImpactMeter level={fd.card.impactMeter} /></div>
            <Link href={`/events/${featured.id}`} className="mt-5 inline-block rounded-sm bg-teal px-4 py-2 text-paper no-underline hover:opacity-90">
              Trace the full ripple
            </Link>
          </div>
          <div>
            <RippleMap centre={fd.title} rings={fd.card.ripple} compact />
          </div>
        </section>
      ) : null}

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-3 rounded-lg border border-line bg-paper-2 p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal font-sans text-sm text-paper">{s.n}</span>
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="mt-0.5 text-sm text-ink-2">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <HomeExplorer />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr_16rem]">
        <section>
          <h2 className="text-xl">Developing now</h2>
          <p className="mt-1 text-sm text-ink-2">Most severe first.</p>
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
          <p className="mt-1 text-sm text-ink-2">Dated decisions, soonest first.</p>
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
        <section>
          <h2 className="text-xl">Start another way</h2>
          <p className="mt-1 text-sm text-ink-2">By kind of event</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {kinds.map((k) => (
              <li key={k.t}>
                <Link href={`/events?type=${k.t}`} className="rounded-full border border-line px-2.5 py-0.5 text-sm no-underline hover:border-ink">
                  {TYPE_LABELS[k.t]} <span className="text-ink-3">{k.n}</span>
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-5 space-y-2 text-[15px]">
            <li><Link href="/events" className="hover:underline">All {EVENTS.length} events</Link></li>
            <li><Link href="/wire" className="hover:underline">Today&apos;s headlines, by event</Link></li>
            <li><Link href="/guide" className="hover:underline">How to read and update the atlas</Link></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
