"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Bookmark, CheckCheck, Newspaper, Plus, Radio, Sparkles, TrendingUp } from "lucide-react";
import { EVENTS, neighbours } from "@/content/events";
import { DRIVERS, getDriver } from "@/content/drivers";
import type { RippleCard } from "@/content/ripples";
import { useTracker } from "@/components/tracker/FollowProvider";
import { useRipple, loadRipples } from "@/components/ripple/RippleProvider";
import FollowButton from "@/components/tracker/FollowButton";
import { FlowIcon, FLOW_TEXT } from "@/components/ripple/LinkRow";
import { PulseBadge, timeAgo } from "@/components/ripple/Pulse";
import DigestChoice from "@/components/tracker/DigestChoice";
import { plainUpdate } from "@/content/format";

/*
  Your tracker: what is new on what you follow, highlighted. The page opens with a summary
  (how many of your events changed, how many new headlines), then the events that changed,
  most new first, each showing exactly what is new since you last looked: the new top line,
  the "what changed" line, the new headlines and the connected events that moved. Events with
  nothing new sit folded at the bottom. Events the pipeline added to the map since your last
  visit get their own section.

  "Since you last looked" is fixed when the page opens and kept for the rest of the visit
  (and a reload within the hour), so the highlights stay while you read even though the
  header badge clears. "Done reading" moves it to now.
*/
const VISIT = "tracker:visit"; // when the tracker page was last opened, for "new on the map"
const SNAP = "geopolitica.tracker.since";

type Since = Record<string, string>;

function savedSnapshot(): Since | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(SNAP) || "null") as { at: number; since: Since } | null;
    if (v && Date.now() - v.at < 3_600_000) return v.since;
  } catch {}
  return null;
}

export default function TrackerView() {
  const t = useTracker();
  const ripple = useRipple();
  const [cards, setCards] = useState<Record<string, RippleCard> | null>(null);
  const [since, setSince] = useState<Since | null>(null);

  useEffect(() => {
    loadRipples().then(setCards).catch(() => {});
  }, []);

  // fix "since you last looked" at the first look (or reuse this visit's), then mark everything
  // seen so the header badge clears; the highlights below keep using the fixed snapshot
  const follows = t?.state.follows ?? [];
  useEffect(() => {
    if (!t || !cards || !follows.length) return;
    if (!since) {
      const snap = savedSnapshot() ?? { ...t.state.seen };
      try {
        sessionStorage.setItem(SNAP, JSON.stringify({ at: Date.now(), since: snap }));
      } catch {}
      queueMicrotask(() => setSince(snap));
    }
    const timer = window.setTimeout(() => t.markSeen([...follows, VISIT]), 1500);
    return () => window.clearTimeout(timer);
  }, [cards, follows.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  function doneReading() {
    const now = new Date().toISOString();
    const snap = Object.fromEntries([...follows, VISIT].map((id) => [id, now]));
    try {
      sessionStorage.removeItem(SNAP);
    } catch {}
    setSince(snap);
    t?.markSeen([...follows, VISIT]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!t) return null;
  const S = since ?? t.state.seen;
  const events = follows.filter((id) => !id.startsWith("driver:")).map((id) => cards?.[id]).filter((c): c is RippleCard => Boolean(c));
  const drivers = follows.filter((id) => id.startsWith("driver:")).map((id) => getDriver(id.slice(7))).filter((d) => d !== undefined);

  // what is new on each followed event
  const news = events.map((c) => {
    const s = S[c.id] ?? "";
    const fresh = c.recent.filter((h) => h.published > s);
    const changed = c.update && c.update.at > s ? c.update : undefined;
    const moving = neighbours(c.id)
      .map((n) => ({ n, card: cards![n.event.id] }))
      .filter((x) => x.card && x.card.update && x.card.update.at > s)
      .slice(0, 4);
    const count = fresh.length + (changed ? 1 : 0);
    return { c, s, fresh, changed, moving, count };
  });
  const changedEvents = news.filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
  const quiet = news.filter((x) => x.count === 0);
  const headlines = changedEvents.reduce((n, x) => n + x.fresh.length, 0);
  const lines = changedEvents.filter((x) => x.changed).length;
  const lastVisit = S[VISIT] ?? "";
  const added = cards ? Object.values(cards).filter((c) => c.addedAt && (!lastVisit || c.addedAt > lastVisit)).sort((a, b) => ((a.addedAt ?? "") < (b.addedAt ?? "") ? 1 : -1)) : [];
  const oldest = Object.entries(S).filter(([k]) => follows.includes(k)).map(([, v]) => v).sort()[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p className="signpost">Your tracker</p>
      <h1 className="mt-1 text-4xl">What changed on what you follow</h1>
      <DigestChoice />

      {!follows.length ? (
        <Empty />
      ) : !cards || !since ? (
        <p className="py-12 text-center text-ink-2" aria-busy>Loading your tracker…</p>
      ) : (
        <>
          {/* the summary: how much is new, at a glance */}
          <section className={`mt-6 rounded-2xl border-2 p-5 ${changedEvents.length || added.length ? "border-gold bg-gold/10" : "border-line bg-paper-2"}`} aria-live="polite">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-gold">
              Since you last looked{oldest ? ` · ${timeAgo(oldest)}` : ""}
            </p>
            {changedEvents.length || added.length ? (
              <>
                <p className="mt-1 font-serif text-2xl leading-snug">
                  {changedEvents.length ? (
                    <>
                      {changedEvents.length} of your {events.length} event{events.length === 1 ? "" : "s"} changed
                    </>
                  ) : (
                    "Nothing new on your events"
                  )}
                  {added.length ? <>{changedEvents.length ? ", and " : ". "}{added.length} new event{added.length === 1 ? "" : "s"} joined the map</> : null}.
                </p>
                <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                  {lines ? <Chip icon={<Sparkles size={14} aria-hidden />}>{lines} new &ldquo;what changed&rdquo; line{lines === 1 ? "" : "s"}</Chip> : null}
                  {headlines ? <Chip icon={<Newspaper size={14} aria-hidden />}>{headlines} new headline{headlines === 1 ? "" : "s"}</Chip> : null}
                  {added.length ? <Chip icon={<Plus size={14} aria-hidden />}>{added.length} new on the map</Chip> : null}
                </ul>
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {changedEvents.map((x) => (
                    <a key={x.c.id} href={`#t-${x.c.id}`} className="underline">
                      {x.c.title} <span className="text-ink-3">({x.count} new)</span>
                    </a>
                  ))}
                </p>
              </>
            ) : (
              <p className="mt-1 font-serif text-2xl">Nothing new on your {events.length} event{events.length === 1 ? "" : "s"} yet. Check back after the next hourly refresh.</p>
            )}
          </section>

          {/* the events that changed, each showing exactly what is new */}
          {changedEvents.length ? (
            <ol className="mt-8 space-y-6">
              {changedEvents.map(({ c, fresh, changed, moving, count }) => (
                <li key={c.id} id={`t-${c.id}`} className="scroll-mt-20 rounded-xl border border-line border-l-4 border-l-gold bg-paper p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                        <NewPill>{count} new</NewPill>
                        {c.kicker}
                      </p>
                      <button type="button" onClick={() => ripple?.open(c.id)} className="mt-1 text-left font-serif text-2xl hover:underline">
                        {c.title}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <PulseBadge pulse={c.pulse} />
                      <FollowButton id={c.id} compact />
                    </div>
                  </div>

                  {changed ? (
                    <div className="mt-4 rounded-lg bg-gold/15 p-4 ring-1 ring-gold/50">
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-gold">
                        <Sparkles size={14} aria-hidden /> What changed · {timeAgo(changed.at)}
                      </p>
                      {changed.headline ? <p className="mt-1.5 font-serif text-[1.2rem] leading-snug">{changed.headline}</p> : null}
                      <p className="mt-1.5 text-[15px] leading-relaxed">{plainUpdate(changed.text)}</p>
                      {changed.quick?.next ? (
                        <p className="mt-2 text-[15px]">
                          <span className="font-semibold">Next: </span>
                          <span className="text-ink-2">{changed.quick.next}</span>
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-ink-3">AI summary of {changed.sources.length} headline{changed.sources.length === 1 ? "" : "s"}. Can be wrong; the headlines are below.</p>
                    </div>
                  ) : null}

                  {fresh.length ? (
                    <div className="mt-4">
                      <p className="text-sm font-semibold">
                        {fresh.length}{fresh.length >= c.recent.length ? "+" : ""} new headline{fresh.length === 1 ? "" : "s"}
                      </p>
                      <ul className="mt-2 space-y-2 text-[15px]">
                        {fresh.slice(0, 6).map((h) => (
                          <li key={h.url} className="flex gap-2">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="new" />
                            <span>
                              <a href={h.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">{h.title}</a>
                              <span className="text-sm text-ink-3"> · {h.publisher} · {timeAgo(h.published)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      {fresh.length > 6 ? <p className="mt-1.5 text-sm text-ink-3">and {fresh.length - 6} more on the event page</p> : null}
                    </div>
                  ) : null}

                  {moving.length ? (
                    <div className="mt-4 border-t border-line pt-3">
                      <p className="flex items-center gap-1.5 text-sm font-semibold"><Radio size={15} className="text-amber" aria-hidden /> Connected events that also changed</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {moving.map(({ n, card }) => (
                          <li key={n.event.id} className="flex items-start gap-2">
                            <FlowIcon flow={n.flow} size={11} />
                            <span>
                              <span className="text-ink-2">{FLOW_TEXT[n.flow]} </span>
                              <button type="button" className="font-medium hover:underline" onClick={() => ripple?.open(n.event.id)}>{n.event.title}</button>
                              {n.via ? <span className="text-ink-3"> · via {n.via}</span> : null}
                              <span className="block text-ink-2">{plainUpdate(card!.update!.text)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <Link href={`/events/${c.id}/#read=news`} className="inline-flex items-center gap-1 text-gold no-underline hover:underline">
                      Latest news on this event <ArrowRight size={14} aria-hidden />
                    </Link>
                    <Link href={`/events/${c.id}/#read=quick`} className="inline-flex items-center gap-1 text-ink-2 no-underline hover:underline">
                      Quick take <ArrowRight size={14} aria-hidden />
                    </Link>
                  </p>
                </li>
              ))}
            </ol>
          ) : null}

          {/* events the pipeline added to the map since the last visit */}
          {added.length ? (
            <section className="mt-10">
              <h2 className="flex items-center gap-2 text-2xl"><Plus size={20} className="text-gold" aria-hidden /> New on the map</h2>
              <p className="mt-1 text-sm text-ink-2">Added from the news since your last visit, after passing the ripple test.</p>
              <ul className="mt-3 space-y-3">
                {added.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line border-l-4 border-l-gold bg-paper p-4">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2"><NewPill>New</NewPill>{c.kicker} · added {timeAgo(c.addedAt!)}</p>
                      <Link href={`/events/${c.id}/`} className="mt-1 block font-serif text-xl no-underline hover:underline">{c.title}</Link>
                      <p className="mt-1 text-[15px] text-ink-2">{c.headline}</p>
                    </div>
                    <FollowButton id={c.id} compact />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* the rest, folded */}
          {quiet.length ? (
            <details className="mt-10 rounded-xl border border-line bg-paper-2 px-4 py-3">
              <summary className="cursor-pointer font-medium">
                No change since you last looked · {quiet.length} event{quiet.length === 1 ? "" : "s"}
              </summary>
              <ul className="mt-3 space-y-2 text-[15px]">
                {quiet.map(({ c }) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" onClick={() => ripple?.open(c.id)} className="text-left hover:underline">{c.title}</button>
                    <span className="text-sm text-ink-3">
                      {c.update ? `last update ${timeAgo(c.update.at)}` : c.recent[0] ? `last headline ${timeAgo(c.recent[0].published)}` : "quiet"}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {changedEvents.length || added.length ? (
            <p className="mt-8 text-center">
              <button type="button" onClick={doneReading} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm hover:border-ink">
                <CheckCheck size={16} aria-hidden /> Done reading: clear the highlights
              </button>
            </p>
          ) : null}

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
                        {pushed.slice(0, 10).map((c) => {
                          const isNew = c.update && c.update.at > (S[`driver:${d!.id}`] ?? "");
                          return (
                            <li key={c.id}>
                              <button type="button" onClick={() => ripple?.open(c.id)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm hover:border-ink ${isNew ? "border-gold bg-gold/10" : "border-line"}`}>
                                {c.pulse.trend === "rising" ? <TrendingUp size={14} className="text-amber" aria-label="rising" /> : null}
                                {c.title}
                                {isNew ? <span className="text-[11px] font-semibold text-gold">new</span> : null}
                              </button>
                            </li>
                          );
                        })}
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

function NewPill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-paper">{children}</span>;
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <li className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-paper px-3 py-1">{icon}{children}</li>;
}

function Empty() {
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
      </div>
      <p className="mt-6 text-xs text-ink-3">{DRIVERS.length} drivers and {EVENTS.length} events to choose from.</p>
    </div>
  );
}
