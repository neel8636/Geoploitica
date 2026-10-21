"use client";

import Link from "next/link";
import { useState } from "react";
import { DASHED_KINDS, TYPE_LABELS, neighbours, type WorldEvent } from "@/content/events";
import LinkRow from "@/components/ripple/LinkRow";
import { formatDate } from "@/content/format";
import MapLegend, { DotSwatch, LineSwatch } from "@/components/atlas/MapLegend";

/*
  The map's side panel. Labels live here instead of on the map, so the map stays readable.
  Two tabs:
    Events: the events in the current frame, or, when one is pointed at or selected,
            that event with every connection and the reason for it.
    Key:    what the dots and lines mean.
  Rows in the panel "peek": they light the event up on the map without changing the panel,
  so the list never jumps under the pointer.
*/

export function dotFill(e: WorldEvent): { fill?: string; hollow?: boolean } {
  if (e.status === "scheduled") return { hollow: true };
  return { fill: e.severity >= 4 ? "var(--amber)" : "var(--teal)" };
}


export default function MapPanel({
  inFrame,
  offFrameCount,
  detail,
  selected,
  visibleIds,
  onPeek,
  onSelect,
  onShowWorld,
}: {
  inFrame: WorldEvent[];
  offFrameCount: number;
  detail: WorldEvent | null; // the event the panel describes (pointed at, or selected)
  selected: string | null;
  visibleIds: Set<string>;
  onPeek: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onShowWorld?: () => void;
}) {
  const [tab, setTab] = useState<"events" | "key">("events");
  const tabClass = (t: "events" | "key") =>
    `flex-1 border-b-2 px-3 py-2 text-sm ${tab === t ? "border-teal font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`;

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-lg border border-line bg-paper" aria-label="Map panel">
      <div className="flex shrink-0 border-b border-line" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "events"} className={tabClass("events")} onClick={() => setTab("events")}>
          Events
        </button>
        <button type="button" role="tab" aria-selected={tab === "key"} className={tabClass("key")} onClick={() => setTab("key")}>
          Key
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3" onMouseLeave={() => onPeek(null)}>
        {tab === "key" ? (
          <MapLegend layout="column" />
        ) : detail ? (
          <Detail e={detail} pinned={selected === detail.id} visibleIds={visibleIds} onPeek={onPeek} onSelect={onSelect} />
        ) : (
          <>
            <p className="mb-2 text-xs text-ink-2">
              {inFrame.length} in this frame, most severe first. Point at one to light it up; click to select.
              {offFrameCount && onShowWorld ? (
                <>
                  {" "}
                  {offFrameCount} more outside ·{" "}
                  <button type="button" className="underline" onClick={onShowWorld}>show the world</button>
                </>
              ) : null}
            </p>
            <ol>
              {inFrame.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 rounded-sm px-1.5 py-1.5 text-left hover:bg-paper-2 focus-visible:bg-paper-2"
                    onMouseEnter={() => onPeek(e.id)}
                    onFocus={() => onPeek(e.id)}
                    onBlur={() => onPeek(null)}
                    onClick={() => onSelect(e.id)}
                  >
                    <span className="mt-0.5"><DotSwatch {...dotFill(e)} r={3 + e.severity} size={18} /></span>
                    <span className="min-w-0">
                      <span className="block text-[14px] leading-snug">{e.title}</span>
                      <span className="block text-xs text-ink-3">{TYPE_LABELS[e.type]} · {e.region}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </aside>
  );
}

function Detail({
  e,
  pinned,
  visibleIds,
  onPeek,
  onSelect,
}: {
  e: WorldEvent;
  pinned: boolean;
  visibleIds: Set<string>;
  onPeek: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) {
  const links = neighbours(e.id).filter((l) => visibleIds.has(l.event.id));
  const causal = links.filter((l) => !DASHED_KINDS.includes(l.kind));
  const related = links.filter((l) => DASHED_KINDS.includes(l.kind));
  const summary = e.summary.length > 220 ? e.summary.slice(0, 218).replace(/\s+\S*$/, "") + "…" : e.summary;

  const group = (title: string, help: string, dashed: boolean, items: typeof links) =>
    items.length ? (
      <div className="mt-4">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-2">
          <LineSwatch dashed={dashed} width={28} /> {title} · {items.length}
        </p>
        <p className="mt-0.5 text-xs text-ink-3">{help}</p>
        <ul className="mt-2 space-y-3">
          {items.map((l) => (
            <li key={l.event.id}>
              <LinkRow n={l} size="sm" onOpen={(id) => onSelect(id)} onPeek={onPeek} host={e.id} />
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs text-ink-2">
          <DotSwatch {...dotFill(e)} r={5} size={14} />
          {TYPE_LABELS[e.type]} · {e.region} · {e.status === "scheduled" ? formatDate(e.date) : `updated ${formatDate(e.date)}`}
        </p>
        {pinned ? (
          <button type="button" className="shrink-0 text-xs text-ink-2 underline" onClick={() => onSelect(null)}>
            All events
          </button>
        ) : null}
      </div>
      <p className="mt-1 font-serif text-lg leading-snug">{e.title}</p>
      <p className="mt-1 text-[13px] text-ink-2">{summary}</p>
      <Link href={`/events/${e.id}`} className="mt-2 inline-block rounded-sm bg-teal px-3 py-1.5 text-sm text-paper no-underline hover:opacity-90">
        Open the full report →
      </Link>
      {!pinned ? <p className="mt-2 text-xs text-ink-3">Click the dot to keep this open.</p> : null}
      {group("How it ripples", "Solid lines: one event acts on the other.", false, causal)}
      {group("Related through a driver", "Dotted lines: not cause and effect; the same force pushes both, or they compete.", true, related)}
      {!links.length ? <p className="mt-4 text-sm text-ink-2">No connections recorded yet.</p> : null}
    </div>
  );
}

