"use client";

import { useEffect, useState } from "react";

export interface LayerLink {
  id: string;
  label: string;
  minutes?: number;
  children?: { id: string; label: string }[];
}

/*
  Sticky layer navigation. Tracks which section is in view so a reader always knows
  how deep they are and how much is left: the progress cue from the design plan.
*/
export default function LayerNav({ layers }: { layers: LayerLink[] }) {
  const [active, setActive] = useState<string>(layers[0]?.id ?? "");

  useEffect(() => {
    const ids = layers.flatMap((l) => [l.id, ...(l.children?.map((c) => c.id) ?? [])]);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [layers]);

  const activeLayer = layers.findIndex(
    (l) => l.id === active || l.children?.some((c) => c.id === active),
  );

  return (
    <nav aria-label="Dossier layers" className="text-[15px]">
      <p className="mb-3 text-sm text-ink-2">
        Layer {Math.max(activeLayer, 0) + 1} of {layers.length}
      </p>
      <ol className="space-y-1">
        {layers.map((l, i) => {
          const isHere = i === activeLayer;
          return (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                className={`flex items-baseline justify-between gap-3 rounded-sm px-2 py-1 no-underline ${
                  isHere ? "bg-teal-2 text-ink" : "text-ink-2 hover:text-ink"
                }`}
                aria-current={isHere ? "location" : undefined}
              >
                <span>{l.label}</span>
                {l.minutes ? <span className="text-xs text-ink-3">{l.minutes} min</span> : null}
              </a>
              {l.children && isHere ? (
                <ul className="ml-3 mt-1 space-y-0.5 border-l border-line pl-3">
                  {l.children.map((c) => (
                    <li key={c.id}>
                      <a
                        href={`#${c.id}`}
                        className={`block py-0.5 text-sm no-underline ${
                          active === c.id ? "text-ink" : "text-ink-2 hover:text-ink"
                        }`}
                      >
                        {c.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
