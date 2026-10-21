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
import { ImpactMeter, Signpost } from "@/components/dossier/Primitives";
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

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
        <span>
          <Link href="/" className="hover:underline">Map</Link> · {TYPE_LABELS[e.type]} · {e.region} ·{" "}
          {e.status === "scheduled" ? `scheduled ${formatDate(e.date)}` : `${e.status}, updated ${formatDate(e.date)}`}
        </span>
        {card ? <PulseBadge pulse={card.pulse} /> : null}
      </p>

      {/* first: build your report */}
      {REPORT_API ? (
        <div className="mt-4">
          <BuildCard eventId={e.id} title={e.title} aspects={fuelAspects} api={REPORT_API} existing={Boolean(dossier && own)} hasReport={Boolean(dossier)} />
        </div>
      ) : null}

      {/* then the ripple, in plain words */}
      <h1 className="mt-8 max-w-4xl text-[2rem] leading-[1.15] sm:text-[2.6rem]">{plainHeadline(e.id)}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-[15px] text-ink-2"><span className="font-medium text-ink">{e.title}</span></p>
        <ImpactMeter level={e.severity} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <FollowButton id={e.id} />
        <AskButton eventId={e.id} />
      </div>

      <RippleStrip eventId={e.id} />

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        {card?.update ? (
          <div className="rounded-xl bg-paper-2 px-4 py-3 text-[15px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-2">What changed · {card.update.at.slice(0, 16).replace("T", " ")} UTC</p>
            <p className="mt-1">{card.update.text}</p>
            <p className="mt-1 text-xs text-ink-3">
              AI summary of{" "}
              {card.update.sources.map((x, i) => (
                <span key={x.url}>
                  {i ? ", " : ""}
                  <a href={x.url} target="_blank" rel="noreferrer" className="underline">{x.publisher}</a>
                </span>
              ))}
              . Can be wrong; follow the links.
            </p>
          </div>
        ) : null}
        <div className="rounded-xl border border-line px-4 py-3 text-[15px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-2">The facts</p>
          <p className="mt-1 text-ink-2">{e.summary}</p>
        </div>
      </section>

      <h2 className="mt-12 text-2xl">More detail</h2>
      <section className="mt-4 grid gap-10 lg:grid-cols-2">
        <div>
          <Signpost>Where it sits and what it touches</Signpost>
          <div className="mt-2 rounded-lg border border-line p-2">
            <WorldMap focusId={e.id} compact pulse={pulseMap()} fuel={fuelDots()} />
          </div>
          <p className="mt-2 text-sm text-ink-2">Lit arcs are this event&apos;s connections. Click any dot to see its ripple.</p>
        </div>
        <div>
          <Signpost>How it ripples outward</Signpost>
          <div className="mt-2">
            {rings.length ? <RippleMap centre={e.title} rings={rings} compact /> : <p className="text-ink-2">No ripple recorded yet.</p>}
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-lg border border-line bg-paper-2 p-5">
        <FuelSection eventId={e.id} initial={card?.fuel} />
      </section>

      {headlines.length ? (
        <section className="mt-10">
          <h2 className="text-2xl">On the wire</h2>
          <ul className="mt-3 divide-y divide-line-2 border-t border-line text-[15px]">
            {headlines.map((h) => (
              <li key={h.id} className="py-2.5">
                <a href={h.url} target="_blank" rel="noreferrer" className="hover:underline">{h.title}</a>
                <span className="block text-sm text-ink-2">{h.publisher} · {formatDate(h.published.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
        <p className="mt-3 text-sm text-ink-2">
          Something here wrong or missing a source?{" "}
          <a href={reportErrorUrl(e.title, `/events/${e.id}/`)} target="_blank" rel="noreferrer" className="underline">Report an error</a>.
        </p>
      </section>

      <section id="report" className="mt-14 scroll-mt-6 border-t-2 border-teal pt-8">
        <p className="signpost">{dossier ? (own ? "Full report" : "Full report on the parent event") : "Report"}</p>
        {dossier && !own ? (
          <p className="prose-dossier mt-1 text-ink-2">
            This event is one thread of <em>{dossier.title}</em>; the layered report below covers it in context.
          </p>
        ) : null}
        {!dossier ? (
          <p className="mt-2 text-[15px] text-ink-2">
            No report yet. {REPORT_API ? <a href="#build" className="underline">Build one at the top of the page</a> : "The hourly run drafts one automatically"}.
          </p>
        ) : null}
        {dossier ? (
          <div className="mt-8">
            <DossierBody d={dossier} backHref="/" backLabel="Map" path={`/events/${e.id}/`} connections={connectionsFor(dossier.slug)} />
          </div>
        ) : null}
      </section>
    </article>
  );
}
