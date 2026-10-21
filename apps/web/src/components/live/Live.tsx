import { ArrowLeft, ArrowLeftRight, ArrowRight, Banknote, Briefcase, Flame, Fuel, Home, Landmark, MapPin, Minus, Moon, Radio, Shield, Ship, Sparkles, TrendingDown, TrendingUp, Users, Vote, Waypoints, Wheat, type LucideIcon } from "lucide-react";
import { ASPECTS, FAMILY_LABEL, type Aspect, type Family, type FuelEvent } from "@/content/fueling";
import type { Flow } from "@/content/events";
import type { LiveCard } from "@/lib/live";

/* The live pieces of an event, as the Atlas shows them: pulse, what changed, ripples incoming,
   what's fueling it, direction of each connection. Server components; no client state. */

export function PulseBadge({ pulse }: { pulse: LiveCard["pulse"] }) {
  const m = {
    rising: { Icon: TrendingUp, cls: "border-amber text-amber", word: "Rising" },
    steady: { Icon: Minus, cls: "border-line text-ink-2", word: "Steady" },
    cooling: { Icon: TrendingDown, cls: "border-line text-ink-2", word: "Cooling" },
    quiet: { Icon: Moon, cls: "border-line text-ink-3", word: "Quiet" },
  }[pulse.trend];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${m.cls}`} title={`${pulse.day} headlines in the last 24 hours, against ${pulse.perDay} a day before`}>
      <m.Icon size={13} aria-hidden /> {m.word} · {pulse.day} today
    </span>
  );
}

export function WhatChanged({ u }: { u: NonNullable<LiveCard["update"]> }) {
  return (
    <div className="rounded-sm bg-paper-2 px-4 py-3 text-[15px]">
      <p className="flex gap-2">
        <Sparkles size={16} className="mt-1 shrink-0 text-amber" aria-hidden />
        <span>
          <span className="font-medium">What changed · {u.at.slice(0, 16).replace("T", " ")} UTC.</span> {u.text}
        </span>
      </p>
      <p className="mt-1 pl-6 text-xs text-ink-3">
        AI summary of{" "}
        {u.sources.map((x, i) => (
          <span key={x.url}>
            {i ? ", " : ""}
            <a href={x.url} target="_blank" rel="noreferrer" className="underline">{x.publisher}</a>
          </span>
        ))}
        . Can be wrong; follow the links.
      </p>
    </div>
  );
}

export function Incoming({ items }: { items: NonNullable<LiveCard["incoming"]> }) {
  return (
    <div className="rounded-sm border border-amber/50 px-4 py-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium"><Radio size={15} className="text-amber" aria-hidden /> Ripple incoming</p>
      <ul className="mt-1 space-y-1 text-ink-2">
        {items.slice(0, 3).map((x) => (
          <li key={x.id} className="flex items-start gap-1.5">
            <ArrowRight size={14} className="mt-0.5 shrink-0 text-teal" aria-hidden />
            <span>
              <a href={`/events/${x.id}`} className="font-medium text-ink hover:underline">{x.title}</a> is rising ({x.day} headlines today)
              {x.via ? <> and reaches this via {x.via}</> : null}.
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ASPECT_ICON: Record<Aspect, LucideIcon> = { markets: TrendingUp, budget: Landmark, energy: Fuel, trade: Ship, food: Wheat, jobs: Briefcase, living: Home, politics: Vote, security: Shield, displacement: Users };
const FAMILY_ICON: Record<Family, LucideIcon> = { money: Banknote, goods: Ship, people: Users };
const fam = (a: Aspect): Family => ASPECTS[a]?.family ?? "people";

export function FamilyKey() {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
      {(Object.keys(FAMILY_LABEL) as Family[]).map((f) => {
        const Icon = FAMILY_ICON[f];
        return (
          <span key={f} className="inline-flex items-center gap-1">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full text-white ring-1 ring-ink/30" style={{ background: `var(--${f})` }} aria-hidden>
              <Icon size={10} strokeWidth={2.4} />
            </span>
            {FAMILY_LABEL[f]}
          </span>
        );
      })}
    </span>
  );
}

export function FuelCard({ f }: { f: FuelEvent }) {
  const aspect = (f.aspect ?? "politics") as Aspect;
  const family = fam(aspect);
  const Icon = ASPECT_ICON[aspect] ?? Vote;
  const Dir = f.flow === "both" ? ArrowLeftRight : ArrowRight;
  return (
    <li className="rounded-lg border border-line border-l-4 p-3" style={{ borderLeftColor: `var(--${family})` }}>
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
        <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-white ring-1 ring-ink/30" style={{ background: `var(--${family})` }} aria-hidden>
          <Icon size={13} strokeWidth={2.2} />
        </span>
        <span><span className="font-medium text-ink">{FAMILY_LABEL[family]}</span> · {ASPECTS[aspect]?.label}</span>
      </span>
      <p className="mt-1.5 font-medium leading-snug">{f.title}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-ink-3"><MapPin size={12} aria-hidden /> {f.place} · {f.when}</p>
      <p className="mt-1.5 text-sm text-ink-2">{f.what}</p>
      {f.via ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-sm">
          <Dir size={15} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
          <span><span className="text-ink-3">{f.flow === "both" ? "Moves in, and back: " : "Moves in: "}</span><span className="font-medium">{f.via}</span></span>
        </p>
      ) : null}
      {(() => {
        const news = f.news?.length ? f.news : f.sources;
        return news.length ? (
          <div className="mt-2 border-t border-line-2 pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">Its local news · {news.length}</p>
            <ul className="mt-1 space-y-1 text-[13px] leading-snug">
              {news.slice(0, 3).map((n) => (
                <li key={n.url}>
                  <a href={n.url} target="_blank" rel="noreferrer" className="hover:underline">{n.title}</a>
                  <span className="text-ink-3"> · {n.publisher}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null;
      })()}
    </li>
  );
}

export function FuelHeading() {
  return (
    <>
      <h2 className="flex items-center gap-2 text-2xl"><Flame size={22} className="text-amber" aria-hidden /> What&apos;s fueling it</h2>
      <p className="mt-0.5 text-sm text-ink-2">The smaller events in the latest local news that feed this one, and what each moves into it.</p>
      <div className="mt-1.5"><FamilyKey /></div>
    </>
  );
}

export function FlowIcon({ flow }: { flow: Flow }) {
  const Icon = flow === "out" ? ArrowRight : flow === "in" ? ArrowLeft : flow === "both" ? ArrowLeftRight : Waypoints;
  return (
    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${flow === "shared" ? "border-dashed border-ink-3 text-ink-2" : "border-teal text-teal"}`} aria-hidden>
      <Icon size={13} strokeWidth={2} />
    </span>
  );
}
export const FLOW_TEXT: Record<Flow, string> = { out: "Ripples into", in: "Ripples in from", both: "Both ways with", shared: "Same driver as" };
