"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, Sparkles, TrendingUp, Radio } from "lucide-react";
import { EVENTS, neighbours } from "@/content/events";
import { DRIVERS, getDriver } from "@/content/drivers";
import type { RippleCard } from "@/content/ripples";
import { useTracker } from "@/components/tracker/FollowProvider";
import { useRipple, loadRipples } from "@/components/ripple/RippleProvider";
import FollowButton from "@/components/tracker/FollowButton";
import { FlowIcon, FLOW_TEXT } from "@/components/ripple/LinkRow";
import { PulseBadge, timeAgo } from "@/components/ripple/Pulse";

/*
  Your tracker. For each event you follow: what is new since you last looked (headlines from
  its local-news search and the world feeds, and the latest "what changed" line), and the
  connected events that are moving, with which way their ripple travels. Drivers you follow
  list the events they are pushing. Opening the page marks everything as seen after a moment.
*/
export default function TrackerView() {
  const t = useTracker();
  const ripple = useRipple();
  const [cards, setCards] = useState<Record<string, RippleCard> | null>(null);
  const [since, setSince] = useState<Record<string, string> | null>(null); // "last looked" as it was when this page opened

  useEffect(() => {
    loadRipples().then(setCards).catch(() => {});
  }, []);

  // freeze "since" at the first look, then mark everything seen so the badge clears
  const follows = t?.state.follows ?? [];
  useEffect(() => {
    if (!t || !cards || !follows.length) return;
    if (!since) {
      const snap = { ...t.state.seen };
      queueMicrotask(() => setSince(snap));
    }
    const timer = window.setTimeout(() => t.markSeen(follows), 2500);
    return () => window.clearTimeout(timer);
  }, [cards, follows.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!t) return null;
  const events = follows.filter((id) => !id.startsWith("driver:")).map((id) => cards?.[id]).filter((c): c is RippleCard => Boolean(c));
  const drivers = follows.filter((id) => id.startsWith("driver:")).map((id) => getDriver(id.slice(7))).filter((d) => d !== undefined);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p className="signpost">Your tracker</p>
      <h1 className="mt-1 text-4xl">What changed on what you follow</h1>
      <p className="mt-2 text-ink-2">
        New headlines since you last looked, what changed, and the connected events whose ripples are heading your way. Updated
        several times an hour.
      </p>

      {!follows.length ? (
        <Empty />
      ) : !cards ? (
        <p className="py-12 text-center text-ink-2" aria-busy>Loading your tracker…</p>
      ) : (
        <>
          <ol className="mt-8 space-y-6">
            {events.map((c) => {
              const s = (since ?? t.state.seen)[c.id] ?? "";
              const fresh = c.recent.filter((h) => h.published > s);
              const changed = c.update && c.update.at > s ? c.update : undefined;
              const moving = neighbours(c.id)
                .map((n) => ({ n, card: cards[n.event.id] }))
                .filter((x) => x.card && (x.card.pulse.trend === "rising" || (x.card.update && x.card.update.at > s)))
                .slice(0, 4);
              return (
                <li key={c.id} className="rounded-lg border border-line bg-paper p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-ink-2">{c.kicker}</p>
                      <button type="button" onClick={() => ripple?.open(c.id)} className="text-left font-serif text-2xl hover:underline">
                        {c.title}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <PulseBadge pulse={c.pulse} />
                      <FollowButton id={c.id} compact />
                    </div>
                  </div>

                  {changed ? (
                    <p className="mt-3 flex gap-2 rounded-sm bg-paper-2 px-3 py-2 text-[15px]">
                      <Sparkles size={16} className="mt-1 shrink-0 text-amber" aria-hidden />
                      <span>
                        <span className="font-medium">What changed · {timeAgo(changed.at)}.</span> {changed.text}{" "}
                        <span className="text-xs text-ink-3">AI summary of {changed.sources.length} headline{changed.sources.length === 1 ? "" : "s"}</span>
                      </span>
                    </p>
                  ) : null}

                  <p className="mt-4 text-sm font-medium">
                    {fresh.length ? `${fresh.length}${fresh.length >= c.recent.length ? "+" : ""} new headline${fresh.length === 1 ? "" : "s"} since you last looked` : "No new headlines since you last looked"}
                  </p>
                  <ul className="mt-1.5 space-y-1.5 text-[15px]">
                    {(fresh.length ? fresh : c.recent).slice(0, 4).map((h) => (
                      <li key={h.url}>
                        <a href={h.url} target="_blank" rel="noreferrer" className="hover:underline">{h.title}</a>
                        <span className="text-sm text-ink-3"> · {h.publisher} · {timeAgo(h.published)}</span>
                      </li>
                    ))}
                  </ul>

                  {moving.length ? (
                    <div className="mt-4 border-t border-line pt-3">
                      <p className="flex items-center gap-1.5 text-sm font-medium"><Radio size={15} className="text-amber" aria-hidden /> Moving nearby</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {moving.map(({ n, card }) => (
                          <li key={n.event.id} className="flex items-start gap-2">
                            <FlowIcon flow={n.flow} size={11} />
                            <span>
                              <span className="text-ink-2">{FLOW_TEXT[n.flow]} </span>
                              <button type="button" className="font-medium hover:underline" onClick={() => ripple?.open(n.event.id)}>{n.event.title}</button>
                              {card!.pulse.trend === "rising" ? <span className="text-ink-2">: rising, {card!.pulse.day} headlines today</span> : null}
                              {n.via ? <span className="text-ink-3"> · via {n.via}</span> : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {drivers.length ? (
            <section className="mt-10">
              <h2 className="text-2xl">Drivers you follow</h2>
              <ul className="mt-4 space-y-4">
                {drivers.map((d) => {
                  const ids = new Set(EVENTS.flatMap((e) => e.links.filter((l) => l.driver === d!.id).flatMap((l) => [e.id, l.to])));
                  const pushed = [...ids].map((id) => cards[id]).filter(Boolean).sort((a, b) => b.pulse.day - a.pulse.day);
                  return (
                    <li key={d!.id} className="rounded-lg border border-line p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-serif text-xl">{d!.name}</p>
                          <p className="text-sm text-ink-2">{d!.what} <span className="text-ink">Watch:</span> {d!.watch}</p>
                        </div>
                        <FollowButton id={`driver:${d!.id}`} compact />
                      </div>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {pushed.slice(0, 10).map((c) => (
                          <li key={c.id}>
                            <button type="button" onClick={() => ripple?.open(c.id)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm hover:border-ink">
                              {c.pulse.trend === "rising" ? <TrendingUp size={14} className="text-amber" aria-label="rising" /> : null}
                              {c.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function Empty() {
  const ripple = useRipple();
  return (
    <div className="mt-8 rounded-lg border border-dashed border-line p-6 text-center">
      <Bookmark size={28} className="mx-auto text-teal" aria-hidden />
      <p className="mt-2 font-serif text-xl">Nothing followed yet</p>
      <p className="mx-auto mt-1 max-w-md text-ink-2">
        Open any event and press <span className="font-medium text-ink">Follow</span>. It lands here with its new headlines, what changed,
        and the connected events moving towards it.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link href="/" className="rounded-sm bg-teal px-4 py-2 text-paper no-underline hover:opacity-90">Pick from the map</Link>
        <Link href="/drivers" className="rounded-sm border border-line px-4 py-2 no-underline hover:border-ink">Follow a driver</Link>
        {ripple ? null : null}
      </div>
      <p className="mt-6 text-xs text-ink-3">{DRIVERS.length} drivers and {EVENTS.length} events to choose from.</p>
    </div>
  );
}
