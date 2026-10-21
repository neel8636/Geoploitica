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
import HowItConnects from "@/components/dossier/HowItConnects";
import MembersOnly from "@/components/auth/MembersOnly";
import ReportChooser, { type ReadOption } from "@/components/reports/ReportChooser";
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

  const chains = connectionsFor(e.id);
  const options: ReadOption[] = [
    {
      id: "quick",
      label: "Quick take",
      time: "2 min",
      blurb: "What happened and what it touches, in plain words.",
      icon: "quick",
      view: (
        <div className="space-y-4">
          <div className="rounded-xl border border-line px-4 py-3 text-[16px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-2">The facts</p>
            <p className="mt-1 leading-relaxed">{e.summary}</p>
          </div>
          <Suspense fallback={null}>
            <LiveTop id={e.id} />
          </Suspense>
          <RippleStrip eventId={e.id} />
        </div>
      ),
    },
    {
      id: "connect",
      label: "How it connects",
      time: "4 min",
      blurb: "Each link from cause to effect, step by step.",
      icon: "connect",
      members: true,
      view: (
        <MembersOnly title="Sign in to read every connection step by step" points={["Each link from cause to effect", "What to watch on each one"]} compact>
          {chains.length ? <HowItConnects rows={chains} /> : <p className="text-ink-2">No connections drafted yet; the hourly run adds them.</p>}
        </MembersOnly>
      ),
    },
    ...(report
      ? [
          {
            id: "brief",
            label: "The brief",
            time: `${report.readingMinutes.card + report.readingMinutes.brief} min`,
            blurb: "The key number, who wins and loses, what comes next.",
            icon: "brief" as const,
            members: true,
            view: <DossierBody d={report} embedded parts={["card", "brief"]} />,
          },
          {
            id: "full",
            label: "Full report",
            time: `about ${report.readingMinutes.card + report.readingMinutes.brief + report.readingMinutes.deep} min`,
            blurb: "Everything: scenarios with odds, players, evidence.",
            icon: "full" as const,
            members: true,
            view: <DossierBody d={report} embedded connections={connectionsFor(report.slug)} />,
          },
        ]
      : []),
    {
      id: "news",
      label: "Latest news",
      time: "3 min",
      blurb: "What is feeding it today, the headlines and the sources.",
      icon: "news",
      view: (
        <div className="space-y-10">
          <Suspense fallback={null}>
            <LiveFuel id={e.id} />
          </Suspense>
          <div>
            <h2 className="text-2xl">Sources</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-[15px]">
              {e.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">{s.title}</a>
                  <span className="text-ink-2"> — {s.publisher}{s.date ? `, ${formatDate(s.date)}` : ""}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: "build",
      label: report ? "Build my own" : "Build the report",
      time: "you pick",
      blurb: "Snapshot, standard or deep dive, drafted fresh by Claude.",
      icon: "build",
      members: true,
      view: <BuildCard eventId={e.id} title={e.title} aspects={links.filter((l) => l.flow === "in" || l.flow === "both").map((l) => l.aspect)} existing={Boolean(report)} hasReport={Boolean(report)} bare />,
    },
  ];

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="mb-4 text-sm text-ink-2">
        <Link href="/events" className="hover:underline">Events</Link> · {TYPE_LABELS[e.type]} · {e.region} ·{" "}
        {e.status === "scheduled" ? `scheduled ${formatDate(e.date)}` : `${e.status}, updated ${formatDate(e.date)}`}
      </p>
      <ReportChooser title={e.title} hook={plainHeadline(e.id)} meta={<ImpactMeter level={e.severity} />} options={options} />
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
