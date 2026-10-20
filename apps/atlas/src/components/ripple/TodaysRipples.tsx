"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RippleCard } from "@/content/ripples";
import RippleMap from "@/components/RippleMap";
import { ImpactMeter } from "@/components/dossier/Primitives";
import { TRUST_LABEL } from "@/components/ripple/RipplePostcard";
import { useRipple } from "@/components/ripple/RippleProvider";

/*
  Today's ripples: the few events the news is moving on right now, re-ranked on every hourly
  build. Turns on its own every 9 seconds (paused while the reader points at it, focuses
  inside it, or prefers reduced motion); the tabs pick one directly.
*/
export default function TodaysRipples({ cards, wireFetchedAt }: { cards: RippleCard[]; wireFetchedAt: string | null }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ago, setAgo] = useState("");
  const ripple = useRipple();

  useEffect(() => {
    if (paused || cards.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") setI((n) => (n + 1) % cards.length);
    }, 9000);
    return () => window.clearInterval(t);
  }, [paused, cards.length]);

  // "updated 12 minutes ago", worked out in the browser so it stays true after the build
  useEffect(() => {
    if (!wireFetchedAt) return;
    const tick = () => {
      const m = Math.max(0, Math.round((Date.now() - Date.parse(wireFetchedAt)) / 60000));
      setAgo(m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`);
    };
    tick();
    const t = window.setInterval(tick, 30000);
    return () => window.clearInterval(t);
  }, [wireFetchedAt]);

  if (!cards.length) return null;
  const c = cards[Math.min(i, cards.length - 1)];

  return (
    <section
      className="mt-8 rounded-lg border border-line bg-paper-2 p-5"
      aria-label="Today's ripples"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="signpost">Today&apos;s ripples</p>
        <p className="text-xs text-ink-3">
          Picked from where the news is moving{ago ? ` · headlines updated ${ago}` : ""} · refreshed hourly
        </p>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Pick a ripple">
        {cards.map((x, n) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={n === i}
            onClick={() => setI(n)}
            className={`shrink-0 rounded-full border px-3 py-1 text-left text-sm ${n === i ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"}`}
          >
            <span className="tabular mr-1.5 opacity-60">{n + 1}</span>
            {x.title.length > 34 ? x.title.slice(0, 32).replace(/\s+\S*$/, "") + "…" : x.title}
          </button>
        ))}
      </div>

      <div key={c.id} className="mt-4 grid animate-[fadein_.4s_ease] gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center" role="tabpanel" aria-live={paused ? "polite" : "off"}>
        <div>
          <p className="text-sm text-ink-2">{c.kicker}</p>
          <h2 className="mt-1 text-3xl">
            <Link href={`/events/${c.id}`} className="no-underline hover:underline">{c.title}</Link>
          </h2>
          <p className="mt-3 font-serif text-xl leading-snug">{c.headline}</p>
          {c.keyNumber ? (
            <p className="mt-4 font-serif">
              <span className="tabular text-4xl font-medium">{c.keyNumber.value}</span>
              <span className="mt-1 block text-[15px] text-ink-2">{c.keyNumber.label}</span>
            </p>
          ) : null}
          <div className="mt-4"><ImpactMeter level={Math.min(5, Math.max(1, c.impact)) as 1 | 2 | 3 | 4 | 5} /></div>
          <p className="mt-3 text-sm text-ink-2">
            <span className={c.trust === "auto" ? "text-amber" : "text-teal"}>{TRUST_LABEL[c.trust]}</span>
            {c.fresh ? <> · {c.fresh} new headline{c.fresh === 1 ? "" : "s"} in 48 hours</> : null}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/events/${c.id}`} className="rounded-sm bg-teal px-4 py-2 text-paper no-underline hover:opacity-90">Trace the full ripple</Link>
            {ripple ? (
              <button type="button" onClick={() => ripple.open(c.id)} className="rounded-sm border border-line bg-paper px-4 py-2 hover:border-ink">
                Open as a postcard
              </button>
            ) : null}
          </div>
        </div>
        <div>
          <RippleMap centre={c.title} rings={c.rings} compact />
        </div>
      </div>
    </section>
  );
}
