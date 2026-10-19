/*
  The map's key, drawn with the same marks the map uses so the reader matches by eye:
  the two kinds of line, the highlighted line, and the three kinds of dot.
*/
const SW = 44; // swatch width

function Line({ dashed, lit }: { dashed?: boolean; lit?: boolean }) {
  return (
    <svg width={SW} height={14} viewBox={`0 0 ${SW} 14`} aria-hidden className="shrink-0">
      <path
        d={`M2 11 Q ${SW / 2} -4 ${SW - 2} 11`}
        fill="none"
        stroke={lit ? "var(--teal)" : "var(--ink-3)"}
        strokeWidth={lit ? 1.8 : 1.1}
        strokeDasharray={dashed ? "3 3" : undefined}
      />
    </svg>
  );
}

function Dot({ r, fill, hollow }: { r: number; fill?: string; hollow?: boolean }) {
  return (
    <svg width={SW} height={22} viewBox={`0 0 ${SW} 22`} aria-hidden className="shrink-0">
      <circle cx={SW / 2} cy={11} r={r} fill={hollow ? "var(--paper)" : fill ?? "var(--teal)"} stroke="var(--ink)" strokeWidth={1} />
    </svg>
  );
}

const ITEMS: { swatch: React.ReactNode; label: string; detail: string }[] = [
  { swatch: <Line />, label: "Solid line", detail: "cause and effect: one event feeds into, affects or is a response to the other" },
  { swatch: <Line dashed />, label: "Dotted line", detail: "related, not cause and effect: the two share a driver or compete for the same thing" },
  { swatch: <Line lit />, label: "Highlighted line", detail: "a connection of the event you are hovering; the rest fade" },
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
  { swatch: <Dot r={8} fill="var(--amber)" />, label: "Amber dot", detail: "severe: 4 or 5 of 5" },
  { swatch: <Dot r={7} hollow />, label: "Hollow dot", detail: "scheduled: an election, a deadline, a decision with a date" },
];

export default function MapLegend({ compact = false }: { compact?: boolean }) {
  return (
    <dl className={`grid gap-x-6 gap-y-1.5 ${compact ? "grid-cols-2 text-xs" : "text-sm sm:grid-cols-2 lg:grid-cols-3"}`} aria-label="Map key">
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
