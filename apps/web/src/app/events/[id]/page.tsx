import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EVENTS, TYPE_LABELS, getEvent, neighbours } from "@/content/events";
import { liveCard } from "@/lib/live";
import { FuelCard, FuelHeading, Incoming, PulseBadge, WhatChanged } from "@/components/live/Live";
import FuelRun from "@/components/live/FuelRun";
import { getDossier, formatDate } from "@/content/dossiers";
import { DossierBody } from "@/components/dossier/DossierBody";
import { connectionsFor } from "@/content/connections";
import { ImpactMeter } from "@/components/dossier/Primitives";
import BuildCard from "@/components/reports/BuildCard";
import RippleStrip from "@/components/dossier/RippleStrip";
import { plainHeadline } from "@/content/plain";

export function generateStaticParams() {
  return EVENTS.map((e) => ({ id: e.id }));
}

export async function generateMetadata(props: PageProps<"/events/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const e = getEvent(id);
  return e ? { title: e.title, description: e.summary } : {};
}

export default async function EventPage(props: PageProps<"/events/[id]">) {
  const { id } = await props.params;
  const e = getEvent(id);
  if (!e) notFound();
  const report = getDossier(e.id);
  const links = neighbours(e.id);

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="text-sm text-ink-2">
        <Link href="/events" className="hover:underline">Events</Link> · {TYPE_LABELS[e.type]} · {e.region} ·{" "}
        {e.status === "scheduled" ? `scheduled ${formatDate(e.date)}` : `${e.status}, updated ${formatDate(e.date)}`}
      </p>

      {/* first: build your report */}
      <div className="mt-4">
        <BuildCard eventId={e.id} title={e.title} aspects={links.filter((l) => l.flow === "in" || l.flow === "both").map((l) => l.aspect)} existing={Boolean(report)} hasReport={Boolean(report)} />
      </div>

      {/* then the ripple, in plain words */}
      <h1 className="mt-8 max-w-4xl text-[2rem] leading-[1.15] sm:text-[2.6rem]">{plainHeadline(e.id)}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-[15px] font-medium">{e.title}</p>
        <ImpactMeter level={e.severity} />
      </div>
      <RippleStrip eventId={e.id} />
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Suspense fallback={null}>
          <LiveTop id={e.id} />
        </Suspense>
        <div className="rounded-xl border border-line px-4 py-3 text-[15px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-2">The facts</p>
          <p className="mt-1 text-ink-2">{e.summary}</p>
        </div>
      </div>

      <Suspense fallback={null}>
        <LiveFuel id={e.id} />
      </Suspense>

      <section className="mt-10">
        <h2 className="text-2xl">Sources</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-[15px]">
          {e.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">{s.title}</a>
              <span className="text-ink-2"> — {s.publisher}{s.date ? `, ${formatDate(s.date)}` : ""}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="report" className="mt-12 scroll-mt-6 border-t-2 border-teal pt-8">
        <p className="signpost">{report ? "Full report" : "Report"}</p>
        {!report ? <p className="mt-2 text-[15px] text-ink-2">No report yet. <a href="#build" className="underline">Build one at the top of the page</a>.</p> : null}
        {report ? (
          <div className="mt-8">
            <DossierBody d={report} backHref="/events" backLabel="All events" connections={connectionsFor(report.slug)} />
          </div>
        ) : null}
      </section>
    </article>
  );
}

/* Live from the Atlas (refreshed every few minutes): pulse, what changed, ripples incoming. */
async function LiveTop({ id }: { id: string }) {
  const c = await liveCard(id);
  if (!c) return null;
  return (
    <div className="space-y-3">
      <PulseBadge pulse={c.pulse} />
      {c.update ? <WhatChanged u={c.update} /> : null}
      {c.incoming?.length ? <Incoming items={c.incoming} /> : null}
    </div>
  );
}

/* What's fueling it, then the latest headlines on this event. */
async function LiveFuel({ id }: { id: string }) {
  const c = await liveCard(id);
  const items = c?.fuel?.items ?? [];
  return (
    <>
      <section className="mt-10 rounded-lg border border-line bg-paper-2 p-5">
        <FuelHeading />
        {items.length ? (
          <>
            <p className="mt-2 text-xs text-ink-3">Mapped by Claude from local news, {c!.fuel!.at.slice(0, 16).replace("T", " ")} UTC</p>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((f) => <FuelCard key={f.id} f={f} />)}</ul>
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-3">
            {c?.fuel ? "No clear inputs in the latest local news: most of it is about this event's effects, not what feeds it." : "Not mapped yet. Events are mapped once their local news picks up."}
          </p>
        )}
        <FuelRun eventId={id} hasItems={items.length > 0} />
      </section>
      {c?.recent.length ? (
        <section className="mt-10">
          <h2 className="text-2xl">Latest headlines</h2>
          <ul className="mt-3 divide-y divide-line-2 border-t border-line text-[15px]">
            {c.recent.slice(0, 8).map((h) => (
              <li key={h.url} className="py-2.5">
                <a href={h.url} target="_blank" rel="noreferrer" className="hover:underline">{h.title}</a>
                <span className="block text-sm text-ink-2">{h.publisher} · {h.published.slice(0, 16).replace("T", " ")} UTC</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
