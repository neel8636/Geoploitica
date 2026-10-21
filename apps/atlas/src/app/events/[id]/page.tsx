import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EVENTS, TYPE_LABELS, getEvent, neighbours } from "@/content/events";
import { formatDate, getDossier } from "@/content/dossiers";
import { loadWire } from "@/content/wire";
import WorldMap from "@/components/WorldMap";
import { pulseMap, allRipples, fuelDots } from "@/content/ripples";
import FollowButton from "@/components/tracker/FollowButton";
import { AskButton } from "@/components/ask/AskProvider";
import { PulseBadge } from "@/components/ripple/Pulse";
import FuelSection from "@/components/ripple/FuelSection";
import RippleMap from "@/components/RippleMap";
import RippleStrip from "@/components/dossier/RippleStrip";
import BuildCard from "@/components/reports/BuildCard";
import { plainHeadline } from "@/content/plain";
import { DossierBody } from "@/components/dossier/DossierBody";
import { connectionsFor } from "@/content/connections";
import HowItConnects from "@/components/dossier/HowItConnects";
import ReportChooser, { type ReadOption } from "@/components/reports/ReportChooser";
import { ImpactMeter } from "@/components/dossier/Primitives";
import { Fold } from "@/components/dossier/ReportParts";
import { PlainBox, QuickBox } from "@/components/reports/PlainBox";
import { connectInPlain, quickPoints, reportInPlain } from "@/content/inplain";
import { SITE_URL, reportErrorUrl } from "@/lib/site";

// The enterprise server that generates reports on demand (set at build time; empty = not offered).
const REPORT_API = process.env.NEXT_PUBLIC_REPORT_API ?? "";

export function generateStaticParams() {
  return EVENTS.map((e) => ({ id: e.id }));
}

export async function generateMetadata(props: PageProps<"/events/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const e = getEvent(id);
  if (!e) return {};
  const url = `${SITE_URL}/events/${e.id}/`;
  return {
    title: e.title,
    description: e.summary,
    alternates: { canonical: url },
    openGraph: { type: "article", siteName: "Geopolitica Atlas", title: e.title, description: e.summary, url, images: [{ url: `${SITE_URL}/share/${e.id}.png`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: e.title, description: e.summary, images: [`${SITE_URL}/share/${e.id}.png`] },
  };
}

export default async function EventPage(props: PageProps<"/events/[id]">) {
  const { id } = await props.params;
  const e = getEvent(id);
  if (!e) notFound();
  // a report named after the event wins; otherwise the parent report the event points at
  const dossier = getDossier(e.id) ?? (e.dossierSlug ? getDossier(e.dossierSlug) : undefined);
  const wire = loadWire();
  const cited = new Set(e.sources.map((s) => s.url));
  const headlines = wire.items.filter((i) => i.eventIds.includes(e.id) && !cited.has(i.url)).slice(0, 12);
  const links = neighbours(e.id);
  const card = allRipples().find((r) => r.id === e.id);
  // what the report is built around: the small developments fueling it, then what the events
  // that drive it move in (so even a quiet event gets three or more aspects to work from)
  const fuelAspects = [
    ...(card?.fuel?.items ?? []).map((f) => f.aspect),
    ...links.filter((l) => l.flow === "in" || l.flow === "both").map((l) => l.aspect),
  ];

  // The ripple map is drawn from the dossier when it is this event's own; otherwise from the event's connections.
  const own = dossier?.slug === e.id;
  const rings = dossier && own
    ? dossier.card.ripple
    : [
        { label: "Directly linked", effects: links.filter((l) => l.kind === "causes" || l.kind === "affects" || l.kind === "responds_to").map((l) => ({ text: `${l.event.title}: ${l.why}`, sector: l.event.region })) },
        { label: "Shared drivers", effects: links.filter((l) => l.kind === "shares_driver" || l.kind === "amplifies" || l.kind === "competes_with").map((l) => ({ text: `${l.event.title}: ${l.why}`, sector: l.event.region })) },
      ].filter((r) => r.effects.length > 0);

  const errorUrl = reportErrorUrl(e.title, `/events/${e.id}/`);
  const chains = connectionsFor(e.id);

  const quick = quickPoints(e.id);
  const connect = connectInPlain(e.id);
  const reportPlain = reportInPlain(e.id);
  const fuelItems = card?.fuel?.items ?? [];
  const newsParas = [
    ...(card?.update ? [card.update.text.replace(/^New since the last line:\s*/i, "").replace(/^./, (x) => x.toUpperCase())] : []),
    ...fuelItems.slice(0, card?.update ? 2 : 3).map((f) => f.what),
  ];
  const ready = dossier && own ? "This event's report" : dossier ? `Part of the report on ${dossier.title}` : "";

  const options: ReadOption[] = [
    ...(REPORT_API
      ? [
          {
            id: "build",
            label: "Build your own report",
            time: "you pick",
            blurb: `Pick Snapshot (3 min), Standard (10 min) or Deep dive (25 min). Claude drafts it from today's news, built around what is fueling ${e.title.length > 40 ? "this event" : e.title}.`,
            icon: "build" as const,
            feature: true,
            view: <BuildCard eventId={e.id} title={e.title} aspects={fuelAspects} api={REPORT_API} existing={Boolean(dossier && own)} hasReport={Boolean(dossier)} bare />,
          },
        ]
      : []),
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
          <Fold id="connect-map" title="See it on the map" teaser="Where it sits, and how far it spreads in rings">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-lg border border-line p-2">
                <WorldMap focusId={e.id} compact pulse={pulseMap()} fuel={fuelDots()} />
              </div>
              <div>{rings.length ? <RippleMap centre={e.title} rings={rings} compact /> : <p className="text-ink-2">No ripple recorded yet.</p>}</div>
            </div>
          </Fold>
        </div>
      ),
    },
    ...(dossier
      ? [
          {
            id: "brief",
            label: "The brief",
            time: `${dossier.readingMinutes.brief} min`,
            blurb: "Who wins, who loses, what comes next.",
            icon: "brief" as const,
            view: (
              <div className="space-y-2">
                {reportPlain ? <div className="mx-auto max-w-3xl"><PlainBox title={reportPlain.title} paras={reportPlain.paras} kicker={ready} /></div> : null}
                <DossierBody d={dossier} embedded noSummary={Boolean(reportPlain)} parts={["brief"]} errorUrl={errorUrl} />
              </div>
            ),
          },
          {
            id: "full",
            label: "Deep dive",
            time: `${dossier.readingMinutes.deep + 2} min`,
            blurb: "Scenarios with odds, the players, the evidence.",
            icon: "full" as const,
            view: (
              <div className="space-y-2">
                {reportPlain ? <div className="mx-auto max-w-3xl"><PlainBox title={reportPlain.title} paras={reportPlain.paras} kicker={ready} /></div> : null}
                <DossierBody d={dossier} embedded noSummary={Boolean(reportPlain)} parts={["deep", "evidence"]} errorUrl={errorUrl} />
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
          {newsParas.length ? (
            <PlainBox title={`What's moving on ${e.title.length > 50 ? "this event" : e.title} today`} paras={newsParas} chain={false} kicker={card?.update ? `In plain words · ${card.update.at.slice(0, 16).replace("T", " ")} UTC` : "In plain words"} />
          ) : (
            <p className="text-ink-2">Nothing new in the latest run.</p>
          )}
          <Fold id="news-fuel" title="What's fueling it" teaser={fuelItems.length ? `${fuelItems.length} smaller events in the local news` : "Map it from the latest news"}>
            <FuelSection eventId={e.id} initial={card?.fuel} />
          </Fold>
          {headlines.length ? (
            <Fold id="news-wire" title="On the wire" teaser={`${headlines.length} recent headlines`}>
              <ul className="divide-y divide-line-2 text-[15px]">
                {headlines.map((h) => (
                  <li key={h.id} className="py-2.5">
                    <a href={h.url} target="_blank" rel="noreferrer" className="hover:underline">{h.title}</a>
                    <span className="block text-sm text-ink-2">{h.publisher} · {formatDate(h.published.slice(0, 10))}</span>
                  </li>
                ))}
              </ul>
            </Fold>
          ) : null}
          <Fold id="news-sources" title="Sources" teaser={`${e.sources.length} sources behind the facts`}>
            <Sources e={e} errorUrl={errorUrl} />
          </Fold>
        </div>
      ),
    },
  ];

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
        <span>
          <Link href="/" className="hover:underline">Map</Link> · {TYPE_LABELS[e.type]} · {e.region} ·{" "}
          {e.status === "scheduled" ? `scheduled ${formatDate(e.date)}` : `${e.status}, updated ${formatDate(e.date)}`}
        </span>
        {card ? <PulseBadge pulse={card.pulse} /> : null}
      </p>
      <ReportChooser
        title={e.title}
        hook={plainHeadline(e.id)}
        meta={<ImpactMeter level={e.severity} />}
        actions={<><FollowButton id={e.id} /><AskButton eventId={e.id} /></>}
        options={options}
      />
    </article>
  );
}

function Sources({ e, errorUrl }: { e: NonNullable<ReturnType<typeof getEvent>>; errorUrl: string }) {
  return (
    <div>
      <ol className="list-decimal space-y-1 pl-5 text-[15px]">
        {e.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">{s.title}</a>
            <span className="text-ink-2"> — {s.publisher}{s.date ? `, ${formatDate(s.date)}` : ""}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-ink-2">
        Something here wrong or missing a source? <a href={errorUrl} target="_blank" rel="noreferrer" className="underline">Report an error</a>.
      </p>
    </div>
  );
}
