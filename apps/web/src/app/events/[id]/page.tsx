import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EVENTS, KIND_HELP, LINK_WORDS, TYPE_LABELS, getEvent, neighbours } from "@/content/events";
import { getDriver } from "@/content/drivers";
import { liveCard } from "@/lib/live";
import { explainFor } from "@/content/explain";
import { FLOW_TEXT, FlowIcon, FuelCard, FuelHeading, Incoming, PulseBadge, WhatChanged } from "@/components/live/Live";
import FuelRun from "@/components/live/FuelRun";
import { getDossier, formatDate } from "@/content/dossiers";
import { DossierBody } from "@/components/dossier/DossierBody";
import { ImpactMeter } from "@/components/dossier/Primitives";
import GenerateReport from "@/components/reports/GenerateReport";
import MembersOnly from "@/components/auth/MembersOnly";

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
      <h1 className="mt-1 text-4xl sm:text-5xl">{e.title}</h1>
      <p className="prose-dossier mt-3 text-ink-2">{e.summary}</p>
      <div className="mt-4"><ImpactMeter level={e.severity} /></div>
      <Suspense fallback={null}>
        <LiveTop id={e.id} />
      </Suspense>

      <Suspense fallback={null}>
        <LiveFuel id={e.id} />
      </Suspense>

      <section className="mt-10">
        <h2 className="text-2xl">How it connects to the rest of the world</h2>
        <p className="mt-1 text-sm text-ink-2">
          The arrow says which way each ripple travels; the dashed icon means no direction, a shared driver pushes both.
        </p>
        <ol className="mt-3 divide-y divide-line-2 border-t border-line">
          {links.map((l) => {
            const driver = getDriver(l.driver);
            return (
              <li key={l.event.id} className="flex gap-3 py-4">
                <span title={`${LINK_WORDS[l.kind]}: ${KIND_HELP[l.kind]}`}><FlowIcon flow={l.flow} /></span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-2">
                    {l.kind === "competes_with" ? "Competes with" : FLOW_TEXT[l.flow]} · <span className="normal-case tracking-normal">{TYPE_LABELS[l.event.type]}, {l.event.region}</span>
                  </p>
                  <Link href={`/events/${l.event.id}`} className="font-serif text-xl hover:underline">{l.event.title}</Link>
                  {l.via ? (
                    <p className="mt-0.5 text-sm">
                      <span className="text-ink-3">{l.flow === "shared" ? (l.kind === "competes_with" ? "competing for " : "both pushed by ") : "via "}</span>
                      <span className="font-medium text-teal">{l.via}</span>
                    </p>
                  ) : null}
                  <p className="mt-1 text-[15px] text-ink-2">
                    {explainFor(e.id, l.event.id)?.hook ?? l.why}{" "}
                    {explainFor(e.id, l.event.id) ? <a href="#how-it-connects" className="whitespace-nowrap text-teal hover:underline">How it unfolds →</a> : null}
                  </p>
                  {driver ? <p className="mt-1 text-sm text-ink-3">Driver: <span className="text-ink">{driver.name}</span>. {driver.what}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

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
        <div className="mt-3">
          <MembersOnly compact title="build a report on this event, at the size you need">
            <GenerateReport eventId={e.id} existing={Boolean(report)} aspects={links.filter((l) => l.flow === "in" || l.flow === "both").map((l) => l.aspect)} />
          </MembersOnly>
        </div>
        {report ? (
          <div className="mt-8">
            <DossierBody d={report} backHref="/events" backLabel="All events" />
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
    <div className="mt-4 max-w-3xl space-y-3">
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
