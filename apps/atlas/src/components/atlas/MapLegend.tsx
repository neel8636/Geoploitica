import type { ReactNode } from "react";
import Link from "next/link";
import { KIND_HELP, LINK_WORDS, DASHED_KINDS, type LinkKind } from "@/content/events";

/*
  The map's key, drawn with the same marks the map uses so the reader matches by eye:
  the two kinds of line, the highlighted line, and the three kinds of dot.
  The swatches are exported so the map's side panel can reuse them next to each connection.
*/
const SW = 44; // swatch width

export function LineSwatch({ dashed, lit, width = SW }: { dashed?: boolean; lit?: boolean; width?: number }) {
  return (
    <svg width={width} height={14} viewBox={`0 0 ${width} 14`} aria-hidden className="shrink-0">
      <path
        d={`M2 11 Q ${width / 2} -4 ${width - 2} 11`}
        fill="none"
        stroke={lit ? "var(--teal)" : "var(--ink-3)"}
        strokeWidth={lit ? 1.8 : 1.3}
        strokeDasharray={dashed ? "3 3" : undefined}
      />
    </svg>
  );
}

export function DotSwatch({ fill, hollow, r = 6, size = 18 }: { fill?: string; hollow?: boolean; r?: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill={hollow ? "var(--paper)" : fill ?? "var(--teal)"} stroke="var(--ink)" strokeWidth={1} />
    </svg>
  );
}

const ITEMS: { swatch: ReactNode; label: string; detail: string }[] = [
  { swatch: <LineSwatch />, label: "Solid line", detail: "one event acts on the other" },
  { swatch: <LineSwatch dashed />, label: "Dotted line", detail: "related, not cause and effect: a shared driver pushes both" },
  { swatch: <LineSwatch lit />, label: "Highlighted line", detail: "a connection of the event you are pointing at; the rest fade" },
  {
    swatch: (
      <svg width={SW} height={22} viewBox={`0 0 ${SW} 22`} aria-hidden className="shrink-0">
        <circle cx={12} cy={11} r={4} fill="var(--teal)" stroke="var(--ink)" strokeWidth={1} />
        <circle cx={31} cy={11} r={9} fill="var(--teal)" stroke="var(--ink)" strokeWidth={1} />
      </svg>
    ),
    label: "Dot size",
    detail: "severity, 1 to 5",
  },
  { swatch: <span className="flex w-11 justify-center"><DotSwatch fill="var(--amber)" r={8} size={22} /></span>, label: "Amber dot", detail: "severe: 4 or 5 of 5" },
  { swatch: <span className="flex w-11 justify-center"><DotSwatch hollow r={7} size={22} /></span>, label: "Hollow dot", detail: "scheduled: an election, a deadline, a decision with a date" },
];

export default function MapLegend({ layout = "rows" }: { layout?: "rows" | "compact" | "column" }) {
  if (layout === "column") {
    // the side panel's Key tab: one entry per line, label above its explanation
    return (
      <div>
        <dl className="space-y-3 text-sm" aria-label="Map key">
          {ITEMS.map((it) => (
            <div key={it.label} className="flex items-start gap-3">
              <span className="mt-0.5">{it.swatch}</span>
              <div>
                <dt className="font-medium">{it.label}</dt>
                <dd className="text-ink-2">{it.detail}</dd>
              </div>
            </div>
          ))}
        </dl>
        <LineKinds />
      </div>
    );
  }
  return (
    <dl className={`grid gap-x-6 gap-y-1.5 ${layout === "compact" ? "grid-cols-2 text-xs" : "text-sm sm:grid-cols-2 lg:grid-cols-3"}`} aria-label="Map key">
      {ITEMS.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          {it.swatch}
          <dt className="shrink-0 font-medium">{it.label}</dt>
          <dd className="text-ink-2">{it.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

const KINDS: LinkKind[] = ["causes", "affects", "responds_to", "amplifies", "shares_driver", "competes_with"];

/* What each kind of line says, in the words the connections use. */
export function LineKinds({ wide = false }: { wide?: boolean }) {
  return (
    <div className={wide ? "" : "mt-5 border-t border-line pt-4"}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-2">What a line tells you</p>
      <dl className={`mt-2 text-sm ${wide ? "grid gap-x-8 gap-y-3 sm:grid-cols-2" : "space-y-2.5"}`}>
        {KINDS.map((k) => (
          <div key={k} className="flex items-start gap-2.5">
            <span className="mt-1.5"><LineSwatch dashed={DASHED_KINDS.includes(k)} width={26} /></span>
            <div>
              <dt className="font-medium">&ldquo;{LINK_WORDS[k]}&rdquo;</dt>
              <dd className="text-ink-2">{KIND_HELP[k]}</dd>
            </div>
          </div>
        ))}
      </dl>
      <p className={`mt-3 text-sm text-ink-2 ${wide ? "max-w-3xl" : ""}`}>
        Every line also names <span className="text-ink">how</span> the ripple travels, the channel: fuel prices, bond spreads,
        voters&apos; mood. A dotted line names the <span className="text-ink">driver</span> behind both events.{" "}
        <Link href="/drivers" className="underline">See all drivers</Link>.
      </p>
    </div>
  );
}
