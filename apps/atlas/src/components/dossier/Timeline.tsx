"use client";

import { useEffect, useRef } from "react";
import type { Source, TimelineEvent } from "@/content/types";
import { formatDate } from "@/content/format";
import { SourceRef } from "./Primitives";

/*
  Origin timeline. Events reveal as the reader scrolls (scroll-driven, never autoplay).
  Turning points carry the accent; everything else stays quiet.
*/
export default function Timeline({ events, sources }: { events: TimelineEvent[]; sources: Source[] }) {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    // Progressive: items render visible; only those below the fold are hidden and revealed on scroll.
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("li") ?? []);
    const below = items.filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    below.forEach((el) => el.classList.add("reveal"));
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-visible")),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.2 },
    );
    below.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <ol ref={ref} className="relative ml-2 border-l border-line pl-6">
      {events.map((e) => (
        <li key={e.date + e.title} className="relative pb-7 last:pb-0">
          <span
            aria-hidden
            className="absolute -left-[31px] top-1.5 block h-2.5 w-2.5 rounded-full"
            style={{
              background: e.turning ? "var(--teal)" : "var(--paper)",
              boxShadow: `0 0 0 1.5px ${e.turning ? "var(--teal)" : "var(--ink-3)"}`,
            }}
          />
          <p className="tabular text-sm text-ink-2">{formatDate(e.date)}</p>
          <p className={`font-serif text-lg leading-snug ${e.turning ? "font-medium" : ""}`}>
            {e.title}
            {e.sourceIndex !== undefined ? <SourceRef sources={sources} index={e.sourceIndex} /> : null}
          </p>
          <p className="mt-0.5 max-w-prose text-[15px] text-ink-2">{e.detail}</p>
        </li>
      ))}
    </ol>
  );
}
