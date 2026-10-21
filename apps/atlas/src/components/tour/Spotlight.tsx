"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bookmark, MessageCircleQuestion, MousePointerClick, Sparkles, Waypoints } from "lucide-react";

/*
  A four-step spotlight on the map-first home page, shown once: it dims the page, lights up one feature
  at a time and says what it does in a line. "Skip" ends it; the footer link replays it.
*/
const KEY = "geopolitica.tour.v1";
export const TOUR_EVENT = "geopolitica:tour";

const STEPS = [
  {
    target: "map",
    Icon: MousePointerClick,
    title: "Click any dot",
    body: "The map flies to it. The small coloured dots around it are what is fueling it; the coloured lines are other events feeding in. Gold lines show where it ripples next.",
  },
  {
    target: "key",
    Icon: Sparkles,
    title: "Money, goods, people",
    body: "Every colour is one part of the economy. The key stays on screen; point at a row to light that colour up on the map. After a few looks, the words step back.",
  },
  {
    target: "today",
    Icon: Waypoints,
    title: "Today's ripples, and your report",
    body: "The panel lists what the news is moving on now. Open any event to build a report around what is fueling it, at the size you need.",
  },
  {
    target: "tracker",
    Icon: Bookmark,
    title: "Follow and track",
    body: "Press Follow on any event. Your tracker shows what changed since you last looked, and which connected events are heading its way.",
    extra: { Icon: MessageCircleQuestion, text: "On any event, press Ask to ask a question while you read." },
  },
];

export default function Spotlight() {
  const path = usePathname();
  const [step, setStep] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const start = useCallback(() => setStep(0), []);

  useEffect(() => {
    const onStart = () => start();
    window.addEventListener(TOUR_EVENT, onStart);
    if (path !== "/") return () => window.removeEventListener(TOUR_EVENT, onStart);
    let seen = true;
    try {
      // the introduction comes first; the spotlight waits until it has been seen
      seen = localStorage.getItem(KEY) === "done" || localStorage.getItem("geopolitica.intro.v1") !== "done";
    } catch {}
    const t = seen ? 0 : window.setTimeout(start, 1800);
    return () => {
      window.removeEventListener(TOUR_EVENT, onStart);
      if (t) window.clearTimeout(t);
    };
  }, [path, start]);

  const s = step >= 0 ? STEPS[step] : null;

  useEffect(() => {
    if (!s) return;
    const el = document.querySelector<HTMLElement>(`[data-spotlight="${s.target}"]`);
    if (!el) {
      queueMicrotask(() => setRect(null));
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => setRect(el.getBoundingClientRect());
    const t = window.setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [s]);

  const finish = useCallback(() => {
    setStep(-1);
    setRect(null);
    try {
      localStorage.setItem(KEY, "done");
    } catch {}
  }, []);

  useEffect(() => {
    if (!s) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, finish]);

  if (!s) return null;
  const pad = 8;
  const box = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  // the card sits below the lit area when there is room, otherwise above it
  const below = box ? box.top + box.height + 220 < window.innerHeight : true;
  const cardTop = box ? (below ? box.top + box.height + 12 : Math.max(12, box.top - 12 - 200)) : window.innerHeight / 2 - 100;
  const cardLeft = box ? Math.min(Math.max(12, box.left), window.innerWidth - 352) : window.innerWidth / 2 - 170;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Feature tour">
      {box ? (
        <div
          className="pointer-events-none fixed rounded-lg transition-all duration-300"
          style={{ ...box, boxShadow: "0 0 0 9999px rgba(30, 26, 22, 0.55)", outline: "2px solid var(--amber)" }}
        />
      ) : (
        <div className="fixed inset-0 bg-ink/50" />
      )}
      <div className="fixed w-[340px] max-w-[calc(100vw-24px)] rounded-lg border border-line bg-paper p-4 shadow-2xl" style={{ top: cardTop, left: cardLeft }}>
        <p className="flex items-center gap-2 font-serif text-xl">
          <s.Icon size={20} className="text-teal" aria-hidden /> {s.title}
        </p>
        <p className="mt-1.5 text-[15px] text-ink-2">{s.body}</p>
        {s.extra ? (
          <p className="mt-2 flex items-start gap-2 text-sm text-ink-2">
            <s.extra.Icon size={16} className="mt-0.5 shrink-0 text-teal" aria-hidden /> {s.extra.text}
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-ink-3">{step + 1} of {STEPS.length}</span>
          <div className="flex gap-2">
            <button type="button" onClick={finish} className="rounded-sm px-3 py-1.5 text-sm text-ink-2 hover:text-ink">Skip</button>
            <button
              type="button"
              autoFocus
              onClick={() => (step + 1 < STEPS.length ? setStep(step + 1) : finish())}
              className="rounded-sm bg-teal px-4 py-1.5 text-sm text-paper hover:opacity-90"
            >
              {step + 1 < STEPS.length ? "Next" : "Start exploring"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReplayTour() {
  return (
    <button type="button" className="hover:underline" onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}>
      Take the tour
    </button>
  );
}
