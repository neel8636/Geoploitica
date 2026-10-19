"use client";

import { useEffect, useLayoutEffect, useState } from "react";

export interface TourStep {
  target: string; // data-tour attribute value of the element to spotlight
  title: string;
  body: string;
  cta?: string; // label for the primary button when it does more than "Next"
  action?: () => Promise<void> | void; // run on primary button; the tour waits for it
  handoff?: boolean; // the action moves the tour to a new stage; do not advance or close afterwards
  placement?: "below" | "above" | "right";
}

interface Props {
  steps: TourStep[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  busy?: boolean; // true while an action is running
  offset?: number; // steps completed in an earlier stage, for the counter
  total?: number; // total steps across stages, for the counter
}

interface Box { top: number; left: number; width: number; height: number }

/*
  Spotlight walkthrough. One element at a time: everything else dims, the target scrolls into view,
  a card explains what the manager is looking at and what to do with it. Keyboard: arrows move, Esc closes.
  The tour never autoplays; every step is the reader's own click.
*/
export default function Tour({ steps, index, onIndex, onClose, busy, offset = 0, total }: Props) {
  const count = total ?? steps.length;
  const step = steps[index];
  const [box, setBox] = useState<Box | null>(null);
  const pad = 8;

  const measure = () => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) { setBox(null); return; }
    const r = el.getBoundingClientRect();
    setBox({ top: r.top + window.scrollY - pad, left: r.left + window.scrollX - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
  };

  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      const tall = r.height > window.innerHeight * 0.6;
      el.scrollIntoView({ block: tall ? "start" : "center", behavior: "smooth" });
    }
    const t = setTimeout(measure, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step.target]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < steps.length - 1 && !step.action) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, steps.length]);

  const last = offset + index + 1 >= count;

  async function primary() {
    if (step.action) {
      try { await step.action(); } catch { return; }
      if (step.handoff) return;
    }
    if (last) onClose();
    else onIndex(index + 1);
  }

  // Card position: beside the target when there is room, below it when that fits on screen,
  // otherwise pinned to the bottom of the viewport so it is always readable.
  const cardW = 360;
  const cardH = 220;
  let cardStyle: React.CSSProperties = { position: "absolute", width: cardW, zIndex: 60 };
  if (box) {
    const vw = window.innerWidth;
    const viewTop = window.scrollY;
    const viewBottom = viewTop + window.innerHeight;
    const roomRight = box.left + box.width + cardW + 24 < vw;
    const fitsBelow = box.top + box.height + 16 + cardH < viewBottom;
    const fitsAbove = box.top - 16 - cardH > viewTop;
    const placement = step.placement ?? "below";
    if ((placement === "right" && roomRight) || (!fitsBelow && !fitsAbove && roomRight)) {
      cardStyle = { ...cardStyle, top: Math.max(viewTop + 16, Math.min(box.top, viewBottom - cardH - 16)), left: box.left + box.width + 16 };
    } else if ((placement === "above" && fitsAbove) || (!fitsBelow && fitsAbove)) {
      cardStyle = { ...cardStyle, top: box.top - 16, left: Math.min(box.left, vw - cardW - 16), transform: "translateY(-100%)" };
    } else if (fitsBelow) {
      cardStyle = { ...cardStyle, top: box.top + box.height + 16, left: Math.max(16, Math.min(box.left, vw - cardW - 16)) };
    } else {
      cardStyle = { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", width: cardW, zIndex: 60 };
    }
  } else {
    cardStyle = { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", width: cardW, zIndex: 60 };
  }

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="tour-title">
      {box ? (
        <div
          aria-hidden
          className="absolute rounded-lg"
          style={{
            top: box.top, left: box.left, width: box.width, height: box.height, zIndex: 50,
            boxShadow: "0 0 0 9999px rgba(27,36,48,0.55), 0 0 0 2px var(--teal)",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0" style={{ background: "rgba(27,36,48,0.55)", zIndex: 50 }} />
      )}
      <div style={cardStyle} className="rounded-lg border border-line bg-paper p-4 shadow-xl">
        <p className="text-xs text-ink-2">Step {offset + index + 1} of {count}</p>
        <h3 id="tour-title" className="mt-1 font-sans text-base font-semibold">{step.title}</h3>
        <p className="mt-1 text-[15px] text-ink-2">{step.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={onClose} className="text-sm text-ink-2 hover:underline">Skip tour</button>
          <div className="flex gap-2">
            {index > 0 ? (
              <button type="button" onClick={() => onIndex(index - 1)} disabled={busy} className="rounded-sm border border-line px-3 py-1.5 text-sm hover:border-teal disabled:opacity-60">
                Back
              </button>
            ) : null}
            <button type="button" onClick={primary} disabled={busy} className="rounded-sm bg-teal px-3 py-1.5 text-sm text-paper hover:opacity-90 disabled:opacity-60">
              {busy ? "Working…" : step.cta ?? (last ? "Finish" : "Next")}
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-1" aria-hidden>
          {Array.from({ length: count }, (_, i) => (
            <span key={i} className="h-1 flex-1 rounded" style={{ background: i <= offset + index ? "var(--teal)" : "var(--line)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
