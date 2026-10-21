"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, Layers, Lock, Newspaper, Sparkles, Waypoints, Zap, type LucideIcon } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

/*
  The event page, reader's choice. Only the event's one-line hook shows until the reader picks
  how they want to read it: a quick take, how it connects, the brief, the full report, the
  latest news, or (the highlighted feature) a report built fresh to the size they want. The pick
  renders right below, each view opening with a short summary in plain words.
  Every view needs a free account: a signed-out reader who picks one gets the sign-in right
  there, and comes back to that same view after signing in (#read=<id>). The last pick is
  remembered in this browser so the next event opens the same way.
  SHARED FILE (npm run sync:shared in apps/atlas).
*/
export type ReadIcon = "quick" | "connect" | "brief" | "full" | "news" | "build";
export interface ReadOption {
  id: string;
  label: string;
  time: string; // "2 min", "about 20 min", "you pick"
  blurb: string; // one short line on what you get
  icon: ReadIcon;
  feature?: boolean; // the highlighted one (Build your own)
  view: ReactNode;
}

const ICONS: Record<ReadIcon, LucideIcon> = { quick: Zap, connect: Waypoints, brief: BookOpen, full: Layers, news: Newspaper, build: Sparkles };
const KEY = "geo.readAs";
// in-report anchors that older links point at, and the view that now holds them
const LEGACY: Record<string, string> = {
  card: "quick",
  "how-it-connects": "connect",
  brief: "brief",
  "what-happened": "brief",
  "why-it-matters": "brief",
  "winners-losers": "brief",
  "whats-next": "brief",
  deep: "full",
  evidence: "full",
  timeline: "full",
  scenarios: "full",
  watch: "full",
  sources: "full",
};

export default function ReportChooser({
  title,
  hook,
  meta,
  actions,
  options,
}: {
  title: string;
  hook: string; // the plain-words headline
  meta?: ReactNode; // impact meter etc.
  actions?: ReactNode; // Follow, Ask
  options: ReadOption[];
}) {
  const a = useAuth();
  const signedIn = !a.enabled || Boolean(a.user && a.profileComplete);
  const [pick, setPick] = useState<string | null>(null);
  const out = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLElement>(null);
  const has = (id: string | null) => Boolean(id && options.some((o) => o.id === id));

  const [via, setVia] = useState<string | null>(null);

  // which view a link asks for: #read=<id> (with &via=<event> to open one connection), or an
  // older in-report anchor (#how-it-connects, #brief, #deep…) from links made before the chooser
  function fromHash(): { id: string; via: string | null } | null {
    const h = window.location.hash.slice(1);
    if (!h) return null;
    const q = new URLSearchParams(h);
    const read = q.get("read");
    if (read && has(read)) return { id: read, via: q.get("via") };
    const old = h.startsWith("via-") ? "connect" : LEGACY[h];
    return old && has(old) ? { id: old, via: h.startsWith("via-") ? h.slice(4) : null } : null;
  }

  // on arrival: what the link names; the map's "Build report" arrives with ?size=…;
  // otherwise the reader's last pick, if this event offers it
  useEffect(() => {
    const linked = fromHash();
    const size = new URLSearchParams(window.location.search).get("size");
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    const first = linked?.id ?? (size && has("build") ? "build" : has(saved) ? saved : null);
    if (first)
      queueMicrotask(() => {
        setPick(first);
        setVia(linked?.via ?? null);
      });
    // a link on this same page (or back/forward) that names another view switches to it
    const onHash = () => {
      const next = fromHash();
      if (!next) return;
      setPick(next.id);
      setVia(next.via);
      requestAnimationFrame(() => out.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a link to one connection: open that fold and bring it into view once the view is showing
  useEffect(() => {
    if (!via || pick !== "connect" || !signedIn) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`via-${via}`);
      if (el instanceof HTMLDetailsElement) document.querySelectorAll<HTMLDetailsElement>('details[id^="via-"]').forEach((d) => (d.open = d === el));
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [via, pick, signedIn]);

  function choose(id: string) {
    setPick(id);
    setVia(null);
    try {
      localStorage.setItem(KEY, id);
    } catch {}
    try {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#read=${id}`);
    } catch {}
    requestAnimationFrame(() => out.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const chosen = options.find((o) => o.id === pick);
  const feature = options.find((o) => o.feature);
  const tiles = options.filter((o) => !o.feature);

  return (
    <>
      <section ref={top} id="build" className="scroll-mt-6 rounded-2xl border border-gold/70 bg-paper-2 p-4 sm:p-6" aria-label="Choose your report">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gold">Your report</p>
        <h1 className="mt-1 max-w-4xl text-[1.7rem] leading-[1.15] sm:text-[2.2rem]">{hook}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-[15px] font-medium text-ink-2">{title}</p>
          {meta}
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>

        {feature ? (
          <button
            type="button"
            onClick={() => choose(feature.id)}
            aria-pressed={pick === feature.id}
            className={`group mt-5 flex w-full flex-col gap-3 rounded-xl border-2 p-4 text-left transition-colors sm:flex-row sm:items-center sm:p-5 ${pick === feature.id ? "border-gold bg-gold/15" : "border-gold bg-gold/10 hover:bg-gold/15"}`}
          >
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-paper sm:flex">
              <Sparkles size={22} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-paper">Feature</span>
                <span className="text-lg font-semibold leading-tight">{feature.label}</span>
              </span>
              <span className="mt-1 block text-[14px] leading-snug text-ink-2">{feature.blurb}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-gold px-4 py-2 text-sm font-semibold text-paper sm:self-center">
              {!signedIn ? <Lock size={14} aria-hidden /> : null}
              Build it <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </button>
        ) : null}

        <p className="mt-5 text-[15px] font-medium">{feature ? "Or read what's ready:" : "How do you want to read it?"}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="Report type">
          {tiles.map((o) => {
            const Icon = ICONS[o.icon];
            const on = o.id === pick;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(o.id)}
                className={`flex flex-col rounded-xl border p-3 text-left transition-colors ${on ? "border-gold bg-paper ring-1 ring-gold" : "border-line bg-paper hover:border-ink-3"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <Icon size={20} className={on ? "text-gold" : "text-teal"} aria-hidden />
                  <span className="flex items-center gap-1 text-xs text-ink-2">
                    {!signedIn ? <Lock size={12} aria-label="free account" /> : null}
                    {o.time}
                  </span>
                </span>
                <span className="mt-2 font-medium leading-tight">{o.label}</span>
                <span className="mt-1 text-[13px] leading-snug text-ink-2">{o.blurb}</span>
              </button>
            );
          })}
        </div>
        {!signedIn && !a.loading ? (
          <p className="mt-3 text-sm text-ink-2">
            <Lock size={12} className="mr-1 inline" aria-hidden />
            Every report needs a free account.{" "}
            <Link href="/join?mode=signup" className="font-medium underline">Create one</Link> or{" "}
            <Link href="/join?mode=signin" className="underline">sign in</Link>.
          </p>
        ) : null}
      </section>

      <div ref={out} id="report" className="scroll-mt-4">
        {chosen ? (
          <section className="mt-8" aria-label={chosen.label}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-teal pb-2">
              <p className="signpost">{chosen.label} · {chosen.time}</p>
              <button type="button" onClick={() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="text-sm text-ink-2 underline hover:text-ink">
                Pick another
              </button>
            </div>
            <div className="mt-5">
              {a.loading ? (
                <p className="py-8 text-center text-ink-2" aria-busy="true">Checking your account…</p>
              ) : signedIn ? (
                chosen.view
              ) : (
                <SignInFirst option={chosen} />
              )}
            </div>
          </section>
        ) : (
          <p className="mt-6 text-center text-sm text-ink-3">Pick one above and it appears here.</p>
        )}
      </div>
    </>
  );
}

/* What a signed-out reader sees after picking: what the view holds, and the way in. */
function SignInFirst({ option }: { option: ReadOption }) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const here = typeof window === "undefined" ? "" : window.location.pathname.replace(base, "") + window.location.search + `#read=${option.id}`;
  const next = here ? `&next=${encodeURIComponent(here)}` : "";
  const Icon = ICONS[option.icon];
  return (
    <div className="mx-auto max-w-xl rounded-2xl border-2 border-teal/40 bg-paper p-6 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-2">
        <Icon size={24} className="text-gold" aria-hidden />
      </span>
      <h2 className="mt-3 text-2xl">Sign in to open {option.label}</h2>
      <p className="mt-2 text-[15px] text-ink-2">{option.blurb} It&apos;s free, with no ads; we keep reports for signed-in readers because each one costs us to write.</p>
      <p className="mt-4 flex flex-wrap justify-center gap-2">
        <Link href={`/join?mode=signup${next}`} className="inline-flex items-center rounded-sm bg-teal px-4 py-2 font-semibold text-paper no-underline hover:opacity-90">Create a free account</Link>
        <Link href={`/join?mode=signin${next}`} className="inline-flex items-center rounded-sm border border-line px-4 py-2 no-underline hover:border-ink">Sign in</Link>
      </p>
      <p className="mt-3 text-xs text-ink-3">You come straight back to this report after signing in.</p>
    </div>
  );
}
