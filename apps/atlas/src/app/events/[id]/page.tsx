import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EVENTS, TYPE_LABELS, getEvent, neighbours } from "@/content/events";
import { formatDate, getDossier } from "@/content/dossiers";
import { loadWire } from "@/content/wire";
import WorldMap from "@/components/WorldMap";
import RippleMap from "@/components/RippleMap";
import Connections from "@/components/atlas/Connections";
import { DossierBody } from "@/components/dossier/DossierBody";
import { ImpactMeter, Signpost } from "@/components/dossier/Primitives";

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
  const dossier = e.dossierSlug ? getDossier(e.dossierSlug) : undefined;
  const wire = loadWire();
  const cited = new Set(e.sources.map((s) => s.url));
  const headlines = wire.items.filter((i) => i.eventIds.includes(e.id) && !cited.has(i.url)).slice(0, 12);
  const links = neighbours(e.id);

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
      <div className="mt-4"><ImpactMeter level={e.severity} /></div>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <Signpost>Where it sits and what it touches</Signpost>
          <div className="mt-2 rounded-lg border border-line p-2">
            <WorldMap focusId={e.id} compact />
          </div>
          <p className="mt-2 text-sm text-ink-2">Lit arcs are this event&apos;s connections. Click any dot to jump.</p>
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
      </section>

      {dossier ? (
        <section className="mt-14 border-t-2 border-teal pt-8">
          <p className="signpost">{own ? "Full report" : "Full report on the parent event"}</p>
          {!own ? (
            <p className="prose-dossier mt-1 text-ink-2">
              This event is one thread of <em>{dossier.title}</em>; the layered report below covers it in context.
            </p>
          ) : null}
          <DossierBody d={dossier} backHref="/" backLabel="Map" />
        </section>
      ) : (
        <section className="mt-14 rounded-lg border border-line bg-paper-2 p-5 text-[15px]">
          <p className="font-medium">No full report yet.</p>
          <p className="mt-1 text-ink-2">
            Draft one from this event and its wire headlines with{" "}
            <code className="rounded-sm bg-paper px-1">npm run draft -- {e.id}</code>, review the JSON it writes, then set{" "}
            <code className="rounded-sm bg-paper px-1">dossierSlug</code> on the event.
          </p>
        </section>
      )}
    </article>
  );
}
