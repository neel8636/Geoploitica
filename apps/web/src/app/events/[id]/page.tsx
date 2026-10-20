import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EVENTS, LINK_WORDS, TYPE_LABELS, getEvent, neighbours } from "@/content/events";
import { getDossier, formatDate } from "@/content/dossiers";
import { DossierBody } from "@/components/dossier/DossierBody";
import { ImpactMeter } from "@/components/dossier/Primitives";
import GenerateReport from "@/components/reports/GenerateReport";

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

      <section className="mt-10">
        <h2 className="text-2xl">How it connects to the rest of the world</h2>
        <ol className="mt-3 divide-y divide-line-2 border-t border-line">
          {links.map((l) => (
            <li key={l.event.id} className="grid gap-2 py-4 sm:grid-cols-[11rem_1fr]">
              <div className="text-sm text-ink-2">
                <p>{l.direction === "out" ? `This ${LINK_WORDS[l.kind]}` : `${LINK_WORDS[l.kind][0].toUpperCase()}${LINK_WORDS[l.kind].slice(1)} this`}</p>
                <p>{TYPE_LABELS[l.event.type]} · {l.event.region}</p>
              </div>
              <div>
                <Link href={`/events/${l.event.id}`} className="font-serif text-xl hover:underline">{l.event.title}</Link>
                <p className="mt-1 text-[15px] text-ink-2">{l.why}</p>
              </div>
            </li>
          ))}
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

      <section className="mt-12 border-t-2 border-teal pt-8">
        <p className="signpost">{report ? "Full report" : "Report"}</p>
        <div className="mt-3">
          <GenerateReport eventId={e.id} existing={Boolean(report)} />
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
