"use client";

import { DASHED_KINDS, KIND_HELP, TYPE_LABELS, linkPhrase, type Neighbour } from "@/content/events";
import { getDriver } from "@/content/drivers";
import { LineSwatch } from "@/components/atlas/MapLegend";
import EventLink from "@/components/ripple/EventLink";

/*
  One connection, read as a sentence: the kind of line, the event it reaches, the channel the
  ripple travels through ("via fuel and freight prices"), the sentence that justifies it, and,
  for dotted lines, the driver behind both. Used in the postcard, the map panel and event pages.
*/
export default function LinkRow({
  n,
  onOpen,
  size = "md",
  onPeek,
}: {
  n: Neighbour;
  onOpen?: (id: string) => void; // open in place (postcard, map); otherwise a link to the event
  size?: "sm" | "md" | "lg";
  onPeek?: (id: string | null) => void;
}) {
  const dashed = DASHED_KINDS.includes(n.kind);
  const driver = getDriver(n.driver);
  const titleClass = size === "lg" ? "font-serif text-xl" : size === "md" ? "font-serif text-[17px] leading-snug" : "text-[14px] leading-snug";
  const title = onOpen ? (
    <button
      type="button"
      className={`${titleClass} text-left hover:underline`}
      onClick={() => onOpen(n.event.id)}
      onMouseEnter={() => onPeek?.(n.event.id)}
      onFocus={() => onPeek?.(n.event.id)}
      onBlur={() => onPeek?.(null)}
    >
      {n.event.title}
    </button>
  ) : (
    <EventLink id={n.event.id} className={`${titleClass} hover:underline`}>{n.event.title}</EventLink>
  );

  return (
    <div className="flex gap-2.5">
      <span className="mt-1.5 shrink-0" title={KIND_HELP[n.kind]}><LineSwatch dashed={dashed} width={size === "sm" ? 22 : 30} /></span>
      <div className="min-w-0">
        <p className={`${size === "sm" ? "text-[11px]" : "text-xs"} uppercase tracking-wide text-ink-2`}>
          {linkPhrase(n)}
          {size !== "sm" ? <span className="normal-case tracking-normal text-ink-3"> · {TYPE_LABELS[n.event.type]}, {n.event.region}</span> : null}
        </p>
        {title}
        {n.via ? (
          <p className={`${size === "sm" ? "text-xs" : "text-sm"} mt-0.5`}>
            <span className="text-ink-3">{dashed ? (n.kind === "competes_with" ? "competing for " : "both pushed by ") : "ripples via "}</span>
            <span className="font-medium text-teal">{n.via}</span>
          </p>
        ) : null}
        <p className={`${size === "sm" ? "text-xs" : "text-sm"} mt-0.5 text-ink-2`}>{n.why}</p>
        {driver && size !== "sm" ? (
          <details className="mt-1 text-sm">
            <summary className="cursor-pointer text-ink-2">
              Driver: <span className="font-medium text-ink">{driver.name}</span>
            </summary>
            <div className="mt-1 space-y-1 border-l-2 border-line pl-3 text-ink-2">
              <p>{driver.what}</p>
              <p>{driver.how}</p>
              <p><span className="text-ink">Watch:</span> {driver.watch}</p>
            </div>
          </details>
        ) : driver ? (
          <p className="mt-0.5 text-xs text-ink-3">Driver: {driver.name}</p>
        ) : null}
      </div>
    </div>
  );
}
