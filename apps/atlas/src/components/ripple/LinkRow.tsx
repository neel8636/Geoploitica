"use client";

import { ArrowLeft, ArrowLeftRight, ArrowRight, Waypoints } from "lucide-react";
import { KIND_HELP, LINK_WORDS, type Flow, type Neighbour } from "@/content/events";
import { getDriver } from "@/content/drivers";
import EventLink from "@/components/ripple/EventLink";
import { AspectBadge } from "@/components/ripple/Aspect";
import Link from "next/link";
import { teaserFor } from "@/content/explainPublic";

/*
  One connection, read as a sentence. An icon says which way the ripple travels (into the
  other event, in from it, both ways, or no direction because a shared driver pushes both),
  then the event, the channel ("via fuel and freight prices"), the reason, and the driver.
  Used in the postcard, the map panel and event pages.
*/
export const FLOW_TEXT: Record<Flow, string> = {
  out: "Ripples into",
  in: "Ripples in from",
  both: "Both ways with",
  shared: "Same driver as",
};

export function FlowIcon({ flow, size = 14 }: { flow: Flow; size?: number }) {
  const Icon = flow === "out" ? ArrowRight : flow === "in" ? ArrowLeft : flow === "both" ? ArrowLeftRight : Waypoints;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border ${flow === "shared" ? "border-dashed border-ink-3 text-ink-2" : "border-teal text-teal"}`}
      style={{ width: size + 10, height: size + 10 }}
      aria-hidden
    >
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}

export default function LinkRow({
  n,
  onOpen,
  size = "md",
  onPeek,
  host,
}: {
  n: Neighbour;
  host?: string; // the event this row sits on: shows the plain-words hook, with the full chain in its report
  onOpen?: (id: string) => void; // open in place (postcard, map); otherwise a link to the event
  size?: "sm" | "md" | "lg";
  onPeek?: (id: string | null) => void;
}) {
  const driver = getDriver(n.driver);
  const label = n.kind === "competes_with" ? "Competes with" : FLOW_TEXT[n.flow];
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
  const channel =
    n.flow === "shared" ? (n.kind === "competes_with" ? "competing for" : "both pushed by") : "via";

  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5" title={`${LINK_WORDS[n.kind]}: ${KIND_HELP[n.kind]}`}><FlowIcon flow={n.flow} size={size === "sm" ? 11 : 13} /></span>
      <div className="min-w-0">
        <p className={`${size === "sm" ? "text-[11px]" : "text-xs"} uppercase tracking-wide text-ink-2`}>{label}</p>
        {title}
        {n.via ? (
          <p className={`${size === "sm" ? "text-xs" : "text-sm"} mt-0.5 flex flex-wrap items-center gap-x-1.5`}>
            {n.flow !== "shared" ? <AspectBadge aspect={n.aspect} withLabel={false} size={size === "sm" ? 9 : 11} /> : null}
            <span className="text-ink-3">{channel} </span>
            <span className="font-medium text-teal">{n.via}</span>
          </p>
        ) : null}
        {host && teaserFor(host, n.event.id) ? (
          <p className={`${size === "sm" ? "text-xs" : "text-sm"} mt-0.5 text-ink-2`}>
            {teaserFor(host, n.event.id)!.hook}{" "}
            <Link href={`/events/${host}/#how-it-connects`} className="whitespace-nowrap text-teal hover:underline">How it unfolds →</Link>
          </p>
        ) : (
          <p className={`${size === "sm" ? "text-xs" : "text-sm"} mt-0.5 text-ink-2`}>{n.why}</p>
        )}
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
