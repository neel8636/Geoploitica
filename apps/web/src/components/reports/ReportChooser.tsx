"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, Layers, Lock, Newspaper, Sparkles, Waypoints, Zap, type LucideIcon } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

/*
  The event page, reader's choice. Nothing but the event's one-line hook shows until the reader
  picks how they want to read it: a quick take, how it connects, the brief, the full report, the
  latest news, or a report built fresh to the size they want. The pick renders right below.
  The last pick is remembered (in this browser only) so the next event opens the same way, and
  #read=<id> links straight to a view. SHARED FILE (npm run sync:shared in apps/atlas).
*/
export type ReadIcon = "quick" | "connect" | "brief" | "full" | "news" | "build";
export interface ReadOption {
  id: string;
  label: string;
  time: string; // "2 min", "about 20 min", "you pick"
  blurb: string; // one short line on what you get
  icon: ReadIcon;
  members?: boolean; // needs a free account
  view: ReactNode;
}

const ICONS: Record<ReadIcon, LucideIcon> = { quick: Zap, connect: Waypoints, brief: BookOpen, full: Layers, news: Newspaper, build: Sparkles };
const KEY = "geo.readAs";

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

  // a link can name the view (#read=brief); the map's "Build report" arrives with ?size=…;
  // otherwise the reader's last pick, if this event offers it
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1)).get("read");
    const size = new URLSearchParams(window.location.search).get("size");
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    const first = has(hash) ? hash : size && has("build") ? "build" : has(saved) ? saved : null;
    if (first) queueMicrotask(() => setPick(first));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(id: string) {
    setPick(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {}
    try {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#read=${id}`);
    } catch {}
    requestAnimationFrame(() => out.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const chosen = options.find((o) => o.id === pick);

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

        <p className="mt-5 text-[15px] font-medium">{chosen ? "Read it another way:" : "How do you want to read it?"}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Report type">
          {options.map((o) => {
            const Icon = ICONS[o.icon];
            const on = o.id === pick;
            const locked = o.members && !signedIn;
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
                    {locked ? <Lock size={12} aria-label="free account" /> : null}
                    {o.time}
                  </span>
                </span>
                <span className="mt-2 font-medium leading-tight">{o.label}</span>
                <span className="mt-1 text-[13px] leading-snug text-ink-2">{o.blurb}</span>
              </button>
            );
          })}
        </div>
        {!signedIn ? <p className="mt-3 text-xs text-ink-3"><Lock size={11} className="inline" aria-hidden /> needs a free account</p> : null}
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
            <div className="mt-4">{chosen.view}</div>
          </section>
        ) : (
          <p className="mt-6 text-center text-sm text-ink-3">Pick one above and it appears here.</p>
        )}
      </div>
    </>
  );
}
