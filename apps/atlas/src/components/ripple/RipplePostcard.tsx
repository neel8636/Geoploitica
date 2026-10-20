"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RippleCard } from "@/content/ripples";
import { neighbours } from "@/content/events";
import RippleMap from "@/components/RippleMap";
import { ImpactMeter } from "@/components/dossier/Primitives";
import { track } from "@/lib/firebase";

export const TRUST_LABEL: Record<RippleCard["trust"], string> = {
  reviewed: "Reviewed report",
  checked: "Fact-checked against sources",
  auto: "Auto-drafted report",
  outdated: "Report being redrafted",
  none: "Drawn from its connections",
};

/*
  The postcard: one event's ripple, over the page. Esc, the backdrop or the close button shut it;
  "Ripples on to" opens the next event's card in place, so a reader can follow a chain without
  leaving the map.
*/
export default function RipplePostcard({
  id,
  card,
  failed,
  onClose,
  onLeave,
  onOpen,
}: {
  id: string;
  card?: RippleCard;
  failed: boolean;
  onClose: () => void;
  onLeave: () => void; // closing because the reader follows a link off the card
  onOpen: (id: string) => void;
}) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [shared, setShared] = useState("");

  useEffect(() => {
    closeBtn.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    track("ripple_open", { event_id: id });
  }, [id]);

  const onward = neighbours(id).slice(0, 5);

  async function share() {
    if (!card) return;
    const url = `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/events/${card.id}/?utm_source=share&utm_medium=ripple`;
    const text = `${card.title}: how it ripples outward`;
    const native = typeof navigator.share === "function";
    try {
      if (native) {
        await navigator.share({ title: text, text: card.headline, url });
        setShared("Shared");
      } else {
        await navigator.clipboard.writeText(url);
        setShared("Link copied");
      }
      track("share", { method: native ? "native" : "copy", content_type: "ripple", item_id: card.id });
    } catch {
      /* the reader cancelled */
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ripple-card-title"
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-xl border border-line bg-paper shadow-2xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* postcard edge: a thin double rule and a stamp */}
        <div className="pointer-events-none absolute inset-2 rounded-lg border border-line-2" aria-hidden />
        <div className="relative p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-ink-2">{card?.kicker ?? "Ripple"}</p>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden rotate-3 rounded-sm border-2 border-dashed border-teal px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-teal sm:inline-block" aria-hidden>
                Ripple
              </span>
              <button ref={closeBtn} type="button" onClick={onClose} className="rounded-full border border-line px-2.5 py-0.5 text-sm hover:border-ink" aria-label="Close">
                Close ✕
              </button>
            </div>
          </div>

          {!card ? (
            <p className="py-16 text-center text-ink-2" aria-busy={!failed}>
              {failed ? "Couldn't load this ripple. Check your connection and try again." : "Drawing the ripple…"}
            </p>
          ) : (
            <div className="mt-2 grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:items-center">
              <div>
                <h2 id="ripple-card-title" className="text-3xl leading-tight">{card.title}</h2>
                <p className="mt-3 font-serif text-xl leading-snug">{card.headline}</p>
                {card.keyNumber ? (
                  <p className="mt-4 font-serif">
                    <span className="tabular text-4xl font-medium">{card.keyNumber.value}</span>
                    <span className="mt-1 block text-[15px] text-ink-2">{card.keyNumber.label}</span>
                  </p>
                ) : null}
                <div className="mt-4"><ImpactMeter level={Math.min(5, Math.max(1, card.impact)) as 1 | 2 | 3 | 4 | 5} /></div>
                <p className="mt-4 text-sm text-ink-2">
                  <span className={card.trust === "auto" || card.trust === "outdated" ? "text-amber" : "text-teal"}>{TRUST_LABEL[card.trust]}</span>
                  {card.fresh ? <> · {card.fresh} new headline{card.fresh === 1 ? "" : "s"} in 48 hours</> : null}
                </p>
                {card.latest ? (
                  <p className="mt-1 text-sm">
                    Latest related headline:{" "}
                    <a href={card.latest.url} target="_blank" rel="noreferrer" className="underline">{card.latest.title}</a>
                    <span className="text-ink-3"> ({card.latest.publisher})</span>
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/events/${card.id}`} onClick={onLeave} className="rounded-sm bg-teal px-4 py-2 text-paper no-underline hover:opacity-90">
                    Open the full event
                  </Link>
                  <button type="button" onClick={share} className="rounded-sm border border-line px-4 py-2 hover:border-ink">
                    {shared || "Share this ripple"}
                  </button>
                </div>
              </div>
              <div>
                {card.rings.length ? <RippleMap centre={card.title} rings={card.rings} compact /> : <p className="text-ink-2">No ripple recorded yet.</p>}
              </div>
            </div>
          )}

          {onward.length ? (
            <div className="mt-6 border-t border-line pt-4">
              <p className="signpost">Ripples on to</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {onward.map((l) => (
                  <li key={l.event.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(l.event.id)}
                      title={l.why}
                      className="rounded-full border border-line px-3 py-1 text-left text-sm hover:border-ink"
                    >
                      {l.event.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
