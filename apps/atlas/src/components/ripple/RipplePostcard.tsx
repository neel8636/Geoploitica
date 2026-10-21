"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RippleCard } from "@/content/ripples";
import { DASHED_KINDS, neighbours } from "@/content/events";
import LinkRow from "@/components/ripple/LinkRow";
import RippleMap from "@/components/RippleMap";
import { ImpactMeter } from "@/components/dossier/Primitives";
import { track } from "@/lib/firebase";
import { Share2, Sparkles, Radio, ArrowRight } from "lucide-react";
import FollowButton from "@/components/tracker/FollowButton";
import { AskButton } from "@/components/ask/AskProvider";
import { PulseBadge, timeAgo } from "@/components/ripple/Pulse";
import FuelSection from "@/components/ripple/FuelSection";
import { AspectBadge } from "@/components/ripple/Aspect";

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

  // solid links first: they are the ripple itself; dotted ones are relatives
  const all = neighbours(id);
  const onward = [...all.filter((l) => !DASHED_KINDS.includes(l.kind)), ...all.filter((l) => DASHED_KINDS.includes(l.kind))].slice(0, 6);

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
        <div className="relative p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-ink-2">{card?.kicker ?? "Ripple"}</p>
              {card ? <PulseBadge pulse={card.pulse} /> : null}
            </div>
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
                </p>
                {card.update ? (
                  <p className="mt-3 flex gap-2 rounded-sm bg-paper-2 px-3 py-2 text-[15px]">
                    <Sparkles size={16} className="mt-1 shrink-0 text-amber" aria-hidden />
                    <span>
                      <span className="font-medium">What changed · {timeAgo(card.update.at)}.</span> {card.update.text}
                    </span>
                  </p>
                ) : null}
                {card.incoming?.length ? (
                  <div className="mt-3 rounded-sm border border-amber/50 px-3 py-2 text-sm">
                    <p className="flex items-center gap-1.5 font-medium"><Radio size={15} className="text-amber" aria-hidden /> Ripple incoming</p>
                    <ul className="mt-1 space-y-1">
                      {card.incoming.slice(0, 3).map((x) => (
                        <li key={x.id} className="flex items-start gap-1.5 text-ink-2">
                          {x.aspect ? <span className="mt-0.5"><AspectBadge aspect={x.aspect} withLabel={false} size={9} /></span> : <ArrowRight size={14} className="mt-0.5 shrink-0 text-teal" aria-hidden />}
                          <span>
                            <button type="button" className="font-medium text-ink hover:underline" onClick={() => onOpen(x.id)}>{x.title}</button> is rising
                            ({x.day} headlines today){x.via ? <> and reaches this via {x.via}</> : null}.
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/events/${card.id}`} onClick={onLeave} className="inline-flex items-center rounded-sm bg-teal px-4 py-2 text-paper no-underline hover:opacity-90">
                    Open the full event
                  </Link>
                  <FollowButton id={card.id} />
                  <AskButton eventId={card.id} />
                  <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-sm border border-line px-3 py-2 hover:border-ink" aria-label="Share this ripple">
                    <Share2 size={16} aria-hidden /> {shared || "Share"}
                  </button>
                </div>
              </div>
              <div>
                {card.rings.length ? <RippleMap centre={card.title} rings={card.rings} compact /> : <p className="text-ink-2">No ripple recorded yet.</p>}
              </div>
            </div>
          )}

          {card ? (
            <div className="mt-6 border-t border-line pt-4">
              <FuelSection eventId={card.id} initial={card.fuel} compact />
            </div>
          ) : null}

          {card && card.rings.length ? (
            <div className="mt-6 border-t border-line pt-4">
              <p className="signpost">How it ripples, step by step</p>
              <ol className="mt-2 grid gap-4 sm:grid-cols-3">
                {card.rings.slice(0, 3).map((r, n) => (
                  <li key={r.label} className="text-sm">
                    <p className="font-medium">
                      <span className="tabular mr-1 text-teal">{n + 1}.</span> {r.label}
                    </p>
                    <ul className="mt-1 space-y-1 text-ink-2">
                      {r.effects.slice(0, 3).map((x) => (
                        <li key={x.text}>{x.sector ? <span className="text-ink">{x.sector}: </span> : null}{x.text}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {card && card.recent.length ? (
            <div className="mt-6 border-t border-line pt-4">
              <p className="signpost">
                {card.fuel?.items.length ? "Other local news" : "Latest headlines"}
                {card.fresh ? ` · ${card.fresh} in 48 hours` : ""}
              </p>
              {card.fuel?.items.length ? <p className="mt-0.5 text-xs text-ink-3">The rest of this event&apos;s news; stories about each fueling event sit under it above.</p> : null}
              <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                {(card.fuel?.items.length && card.otherNews?.length ? card.otherNews.map((n) => ({ ...n, published: n.published ?? "" })) : card.recent).slice(0, 6).map((h) => (
                  <li key={h.url}>
                    <a href={h.url} target="_blank" rel="noreferrer" className="hover:underline">{h.title}</a>
                    <span className="text-ink-3"> · {h.publisher}{h.published ? ` · ${timeAgo(h.published)}` : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {onward.length ? (
            <div className="mt-6 border-t border-line pt-4">
              <p className="signpost">Where it ripples next</p>
              <p className="mt-0.5 text-xs text-ink-3">
                The arrow shows which way each ripple travels; the shared-driver icon means a common force pushes both. Click one to follow the chain.
              </p>
              <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                {onward.map((l) => (
                  <li key={l.event.id}>
                    <LinkRow n={l} size="md" onOpen={onOpen} host={card?.id} />
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
