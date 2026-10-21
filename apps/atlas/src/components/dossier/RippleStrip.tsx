import Link from "next/link";
import { DASHED_KINDS, getEvent, neighbours, type Neighbour } from "@/content/events";
import { ASPECTS, type Family } from "@/content/fueling";
import { teaserFor } from "@/content/explainPublic";
import FamIcon from "@/components/mapfirst/FamIcon";

/*
  The event's ripple at a glance: what feeds it, the event, where it ripples next. One card per
  connection, each with what moves along it and its one-line hook; a card opens that connection
  on the map. Relatives (same driver, no cause and effect) sit underneath. Uses only the free
  teaser, never the full chain. SHARED FILE (npm run sync:shared in apps/atlas).
*/
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);

function Card({ host, n, dir }: { host: string; n: Neighbour; dir: "in" | "out" }) {
  const f = (ASPECTS[n.aspect]?.family ?? "people") as Family;
  const t = teaserFor(host, n.event.id);
  return (
    <Link
      href={`/#conn=${host}~${n.event.id}`}
      className="group flex gap-3 rounded-xl border border-line bg-paper p-3 no-underline transition-colors hover:border-ink-3"
    >
      <FamIcon f={f} size={30} />
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: `var(--${f})` }}>
          {f} · {ASPECTS[n.aspect]?.label}
          {n.flow === "both" ? " · both ways" : ""}
        </span>
        <span className="mt-0.5 block text-[14.5px] font-medium leading-snug text-ink">{short(n.event.title, 60)}</span>
        {t ? <span className="mt-1 block text-[13.5px] leading-snug text-ink-2">{t.hook}</span> : null}
        <span className="mt-1 block text-xs text-gold group-hover:underline">{dir === "in" ? "How it feeds in →" : "How it ripples →"}</span>
      </span>
    </Link>
  );
}

export default function RippleStrip({ eventId }: { eventId: string }) {
  const me = getEvent(eventId);
  if (!me) return null;
  const all = neighbours(eventId);
  const ins = all.filter((l) => !DASHED_KINDS.includes(l.kind) && (l.flow === "in" || l.flow === "both"));
  const outs = all.filter((l) => !DASHED_KINDS.includes(l.kind) && l.flow === "out");
  const rel = all.filter((l) => DASHED_KINDS.includes(l.kind));
  if (!all.length) return null;
  const col = (label: string, items: Neighbour[], dir: "in" | "out", empty: string) => (
    <div className="min-w-0">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-2">{label}</p>
      {items.length ? <div className="space-y-2">{items.map((n) => <Card key={n.event.id} host={eventId} n={n} dir={dir} />)}</div> : <p className="rounded-xl border border-dashed border-line p-3 text-sm text-ink-3">{empty}</p>}
    </div>
  );
  return (
    <section className="mt-6" aria-label="How it ripples">
      <div className="grid items-start gap-3 lg:grid-cols-[1fr_auto_1fr]">
        {col("What feeds it", ins, "in", "Nothing on the map feeds it yet.")}
        <div className="flex items-center justify-center py-1 lg:h-full lg:flex-col lg:px-1 lg:pt-8">
          <span className="text-2xl text-gold lg:hidden" aria-hidden>↓</span>
          <span className="flex items-center gap-2 rounded-full border border-gold px-3 py-1.5 text-sm font-medium lg:max-w-[9rem] lg:text-center">
            <i className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-gold" aria-hidden />
            {short(me.title, 40)}
          </span>
          <span className="hidden text-2xl text-gold lg:mt-2 lg:block" aria-hidden>→</span>
          <span className="text-2xl text-gold lg:hidden" aria-hidden>↓</span>
        </div>
        {col("Where it ripples", outs, "out", "It ripples into nothing else on the map yet.")}
      </div>
      {rel.length ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <span>Same pressure, not cause and effect:</span>
          {rel.map((n) => (
            <Link key={n.event.id} href={`/#conn=${eventId}~${n.event.id}`} className="rounded-full border border-dashed border-ink-3 px-2.5 py-0.5 text-ink no-underline hover:border-ink">
              {short(n.event.title, 44)}
            </Link>
          ))}
        </p>
      ) : null}
    </section>
  );
}
