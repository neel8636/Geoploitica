import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EVENTS, TYPE_LABELS, getEvent, neighbours } from "@/content/events";
import { liveCard } from "@/lib/live";
import { FuelCard, FuelHeading } from "@/components/live/Live";
import FuelRun from "@/components/live/FuelRun";
import { getDossier, formatDate } from "@/content/dossiers";
import { DossierBody } from "@/components/dossier/DossierBody";
import { connectionsFor } from "@/content/connections";
import { ImpactMeter } from "@/components/dossier/Primitives";
import BuildCard from "@/components/reports/BuildCard";
import RippleStrip from "@/components/dossier/RippleStrip";
import HowItConnects from "@/components/dossier/HowItConnects";
import ReportChooser, { type ReadOption } from "@/components/reports/ReportChooser";
import { plainHeadline } from "@/content/plain";
import { Fold } from "@/components/dossier/ReportParts";
import { PlainBox, QuickBox } from "@/components/reports/PlainBox";
import { connectInPlain, quickPoints, reportInPlain } from "@/content/inplain";

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
  const quick = quickPoints(e.id);
  const connect = connectInPlain(e.id);
  const reportPlain = reportInPlain(e.id);
  const options: ReadOption[] = [
    {
      id: "build",
      label: "Build your own report",
      time: "you pick",
      blurb: `Pick Snapshot (3 min), Standard (10 min) or Deep dive (25 min). Claude drafts it from today's news, built around what is fueling ${e.title.length > 40 ? "this event" : e.title}.`,
      icon: "build",
      feature: true,
      view: <BuildCard eventId={e.id} title={e.title} aspects={links.filter((l) => l.flow === "in" || l.flow === "both").map((l) => l.aspect)} existing={Boolean(report)} hasReport={Boolean(report)} bare />,
    },
    {
      id: "quick",
      label: "Quick take",
      time: "1 min",
      blurb: "What happened, why it matters, what's next.",
      icon: "quick",
      view: (
        <div className="space-y-6">
          <QuickBox title={e.title} points={quick} />
          <Fold id="quick-ripple" title="What feeds it and where it ripples" teaser="One card per connection, each with a one-line hook">
            <RippleStrip eventId={e.id} />
          </Fold>
          <Fold id="quick-facts" title="The full facts" teaser="The event summary in full">
            <p className="text-[16px] leading-relaxed">{e.summary}</p>
          </Fold>
        </div>
      ),
    },
    {
      id: "connect",
      label: "How it connects",
      time: "2 min",
      blurb: "The chain from cause to effect, in plain words.",
      icon: "connect",
      view: (
        <div className="space-y-6">
          {connect ? <PlainBox title={connect.title} paras={connect.paras} /> : <p className="text-ink-2">No connections drafted yet; the hourly run adds them.</p>}
          {chains.length ? (
            <div>
              <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-2">Each link, step by step</p>
              <HowItConnects rows={chains} />
            </div>
          ) : null}
        </div>
      ),
    },
    ...(report
      ? [
          {
            id: "brief",
            label: "The brief",
            time: `${report.readingMinutes.card + report.readingMinutes.brief} min`,
            blurb: "Who wins, who loses, what comes next.",
            icon: "brief" as const,
            view: (
              <div className="space-y-2">
                {reportPlain ? <PlainBox title={reportPlain.title} paras={reportPlain.paras} kicker="This event's report" /> : null}
                <DossierBody d={report} embedded noSummary={Boolean(reportPlain)} parts={["card", "brief"]} />
              </div>
            ),
          },
          {
            id: "full",
            label: "Full report",
            time: `${report.readingMinutes.card + report.readingMinutes.brief + report.readingMinutes.deep} min`,
            blurb: "Scenarios with odds, the players, the evidence.",
            icon: "full" as const,
            view: (
              <div className="space-y-2">
                {reportPlain ? <PlainBox title={reportPlain.title} paras={reportPlain.paras} kicker="This event's report" /> : null}
                <DossierBody d={report} embedded noSummary={Boolean(reportPlain)} connections={connectionsFor(report.slug)} />
              </div>
            ),
          },
        ]
      : []),
    {
      id: "news",
      label: "Latest news",
      time: "2 min",
      blurb: "What moved today, and the headlines.",
      icon: "news",
      view: (
        <div className="space-y-6">
          <Suspense fallback={null}>
            <LiveFuel id={e.id} />
          </Suspense>
          <Fold id="news-sources" title="Sources" teaser={`${e.sources.length} sources behind the facts`}>
            <ol className="list-decimal space-y-1 pl-5 text-[15px]">
              {e.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">{s.title}</a>
                  <span className="text-ink-2"> — {s.publisher}{s.date ? `, ${formatDate(s.date)}` : ""}</span>
                </li>
              ))}
            </ol>
          </Fold>
        </div>
      ),
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

/* What's fueling it, then the latest headlines on this event. */
async function LiveFuel({ id }: { id: string }) {
  const c = await liveCard(id);
  const items = c?.fuel?.items ?? [];
  const title = getEvent(id)?.title ?? "this event";
  const paras = [
    ...(c?.update ? [c.update.text.replace(/^New since the last line:\s*/i, "").replace(/^./, (x) => x.toUpperCase())] : []),
    ...items.slice(0, c?.update ? 2 : 3).map((f) => f.what),
  ];
  return (
    <div className="space-y-6">
      {paras.length ? (
        <PlainBox title={`What's moving on ${title.length > 50 ? "this event" : title} today`} paras={paras} chain={false} kicker={c?.update ? `In plain words · ${c.update.at.slice(0, 16).replace("T", " ")} UTC` : "In plain words"} />
      ) : (
        <p className="text-ink-2">Nothing new in the latest run.</p>
      )}
      <Fold id="news-fuel" title="What's fueling it" teaser={items.length ? `${items.length} smaller events in the local news` : "Map it from the latest news"}>
        <FuelHeading />
        {items.length ? (
          <>
            <p className="mt-2 text-xs text-ink-3">Mapped by Claude from local news, {c!.fuel!.at.slice(0, 16).replace("T", " ")} UTC</p>
            <ul className="mt-3 grid gap-4 sm:grid-cols-2">{items.map((f) => <FuelCard key={f.id} f={f} />)}</ul>
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-3">
            {c?.fuel ? "No clear inputs in the latest local news: most of it is about this event's effects, not what feeds it." : "Not mapped yet. Events are mapped once their local news picks up."}
          </p>
        )}
        <FuelRun eventId={id} hasItems={items.length > 0} />
      </Fold>
      {c?.recent.length ? (
        <Fold id="news-wire" title="Latest headlines" teaser={`${Math.min(8, c.recent.length)} recent headlines`}>
          <ul className="divide-y divide-line-2 text-[15px]">
            {c.recent.slice(0, 8).map((h) => (
              <li key={h.url} className="py-2.5">
                <a href={h.url} target="_blank" rel="noreferrer" className="hover:underline">{h.title}</a>
                <span className="block text-sm text-ink-2">{h.publisher} · {h.published.slice(0, 16).replace("T", " ")} UTC</span>
              </li>
            ))}
          </ul>
        </Fold>
      ) : null}
    </div>
  );
}
