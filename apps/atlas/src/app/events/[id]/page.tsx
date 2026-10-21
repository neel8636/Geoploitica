import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EVENTS, TYPE_LABELS, getEvent, neighbours } from "@/content/events";
import { formatDate, getDossier } from "@/content/dossiers";
import { loadWire } from "@/content/wire";
import WorldMap from "@/components/WorldMap";
import { pulseMap, allRipples } from "@/content/ripples";
import FollowButton from "@/components/tracker/FollowButton";
import { AskButton } from "@/components/ask/AskProvider";
import { PulseBadge } from "@/components/ripple/Pulse";
import RippleMap from "@/components/RippleMap";
import Connections from "@/components/atlas/Connections";
import { DossierBody } from "@/components/dossier/DossierBody";
import GenerateReport from "@/components/reports/GenerateReport";
import { ImpactMeter, Signpost } from "@/components/dossier/Primitives";
import MembersOnly from "@/components/auth/MembersOnly";
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
      <p className="text-sm text-ink-2">
        <Link href="/" className="hover:underline">Map</Link> · {TYPE_LABELS[e.type]} · {e.region} ·{" "}
        {e.status === "scheduled" ? `scheduled ${formatDate(e.date)}` : `${e.status}, updated ${formatDate(e.date)}`}
      </p>
      <h1 className="mt-1 text-4xl sm:text-5xl">{e.title}</h1>
      <p className="prose-dossier mt-3 text-ink-2">{e.summary}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <ImpactMeter level={e.severity} />
        {card ? <PulseBadge pulse={card.pulse} /> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <FollowButton id={e.id} />
        <AskButton eventId={e.id} />
      </div>
      {card?.update ? (
        <div className="mt-5 max-w-3xl rounded-sm bg-paper-2 px-4 py-3 text-[15px]">
          <p>
            <span className="font-medium">What changed · {card.update.at.slice(0, 16).replace("T", " ")} UTC.</span> {card.update.text}
          </p>
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

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <Signpost>Where it sits and what it touches</Signpost>
          <div className="mt-2 rounded-lg border border-line p-2">
            <WorldMap focusId={e.id} compact pulse={pulseMap()} />
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

      <section className="mt-10">
        <h2 className="text-2xl">How it connects to the rest of the world</h2>
        <p className="prose-dossier mt-1 text-ink-2">Every link carries the sentence that justifies it. If a link looks wrong, the sentence is where to argue.</p>
        <div className="mt-4"><Connections event={e} /></div>
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

      <section className="mt-14 border-t-2 border-teal pt-8">
        <p className="signpost">{dossier ? (own ? "Full report" : "Full report on the parent event") : "Report"}</p>
        {dossier && !own ? (
          <p className="prose-dossier mt-1 text-ink-2">
            This event is one thread of <em>{dossier.title}</em>; the layered report below covers it in context.
          </p>
        ) : null}
        {REPORT_API ? (
          <div className="mt-3">
            <MembersOnly compact title={dossier && own ? "regenerate this report" : "generate a report for this event now"}>
              <GenerateReport eventId={e.id} existing={Boolean(dossier && own)} api={REPORT_API} />
            </MembersOnly>
          </div>
        ) : !dossier ? (
          <p className="mt-2 text-[15px] text-ink-2">
            The hourly run drafts one automatically; by hand, <code className="rounded-sm bg-paper-2 px-1">npm run draft -- {e.id}</code>.
          </p>
        ) : null}
        {dossier ? (
          <div className="mt-8">
            <DossierBody d={dossier} backHref="/" backLabel="Map" path={`/events/${e.id}/`} />
          </div>
        ) : null}
      </section>
    </article>
  );
}
