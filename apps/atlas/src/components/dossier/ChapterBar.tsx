"use client";

import { useEffect, useRef, useState } from "react";

/*
  The report's chapters as a row of pills that stays at the top while reading (on a phone this
  is the only navigation; on a desk it sits above the text). The current chapter is lit. A link
  to anything inside a closed fold opens it. SHARED FILE (npm run sync:shared in apps/atlas).
*/
export default function ChapterBar({ chapters }: { chapters: { id: string; label: string }[] }) {
  const [active, setActive] = useState(chapters[0]?.id ?? "");
  const bar = useRef<HTMLElement>(null);
  // keep the lit chapter in view inside the bar on a narrow screen
  useEffect(() => {
    const nav = bar.current, pill = nav?.querySelector<HTMLElement>(`a[href="#${active}"]`);
    if (nav && pill) nav.scrollTo({ left: pill.offsetLeft - nav.clientWidth / 2 + pill.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  useEffect(() => {
    const els = chapters.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (seen[0]) setActive(seen[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    // open a fold that a link points into
    const openTarget = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      const d = el?.closest("details") ?? (el?.tagName === "DETAILS" ? el : null);
      if (d && !(d as HTMLDetailsElement).open) {
        (d as HTMLDetailsElement).open = true;
        el?.scrollIntoView({ block: "start" });
      }
    };
    openTarget();
    window.addEventListener("hashchange", openTarget);
    return () => {
      obs.disconnect();
      window.removeEventListener("hashchange", openTarget);
    };
  }, [chapters]);

  return (
    <nav ref={bar} aria-label="Report chapters" className="sticky top-0 z-20 -mx-4 mb-2 overflow-x-auto border-b border-line bg-paper px-4 py-2 sm:mx-0 sm:rounded-b-xl sm:px-3">
      <ol className="flex gap-1.5 whitespace-nowrap">
        {chapters.map((c, i) => (
          <li key={c.id}>
            <a
              href={`#${c.id}`}
              aria-current={active === c.id ? "location" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] no-underline ${active === c.id ? "bg-gold font-semibold text-paper" : "text-ink-2 hover:bg-paper-2 hover:text-ink"}`}
            >
              <span className={`text-[11px] ${active === c.id ? "" : "text-ink-3"}`}>{i + 1}</span>
              {c.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
