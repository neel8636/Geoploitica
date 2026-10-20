import type { CauseLayer, LineChart, Scenario, Source, WatchItem } from "@/content/types";
import { formatDate } from "@/content/format";

const fmtDay = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}`;
};

/* Line chart: the finding in the title, values on the few points that matter, references drawn as marks. */
export function SpreadChart({ chart, sources }: { chart: LineChart; sources: Source[] }) {
  const W = 760;
  const H = 360;
  const left = 70;
  const right = 640;
  const top = 86;
  const bottom = 316;
  const t = (d: string) => Date.parse(d) / 86400000;
  const t0 = Math.min(...chart.series.map((p) => t(p.date))) - 1;
  const t1 = Math.max(...chart.series.map((p) => t(p.date))) + 1;
  const vals = [
    ...chart.series.flatMap((p) => [p.value, p.low ?? p.value, p.high ?? p.value]),
    ...(chart.references ?? []).flatMap((r) => [r.value, r.low ?? r.value, r.high ?? r.value]),
  ];
  const vMin = Math.floor((Math.min(...vals) - 10) / 25) * 25;
  const vMax = Math.ceil((Math.max(...vals) + 10) / 25) * 25;
  const X = (d: string) => left + ((t(d) - t0) / (t1 - t0)) * (right - left);
  const Y = (v: number) => bottom - ((v - vMin) / (vMax - vMin)) * (bottom - top);
  const ticks: number[] = [];
  for (let v = vMin; v <= vMax; v += 25) ticks.push(v);
  const path = chart.series.map((p, i) => `${i ? "L" : "M"}${X(p.date)} ${Y(p.value)}`).join("");
  const first = chart.series[0];
  const last = chart.series[chart.series.length - 1];

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={chart.title} className="w-full" fontFamily="var(--font-sans)" fontSize={12}>
        <text x={24} y={28} fontSize={16} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-serif)">
          {chart.title}
        </text>
        <text x={24} y={48} fontSize={12} fill="var(--ink-2)">
          {chart.subtitle}
        </text>
        <text x={24} y={70} fontSize={11.5} fill="var(--ink-2)">{chart.unit}</text>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={left} x2={right} y1={Y(v)} y2={Y(v)} stroke="var(--line-2)" />
            <text x={left - 8} y={Y(v) + 4} textAnchor="end" fill="var(--ink-2)">{v}</text>
          </g>
        ))}
        {(chart.references ?? []).map((r) =>
          r.low !== undefined && r.high !== undefined ? (
            <g key={r.label}>
              <rect x={left} y={Y(r.high)} width={right - left} height={Y(r.low) - Y(r.high)} fill="var(--paper-2)" />
              <text x={left + 8} y={Y(r.low) - 8} fontSize={11.5} fill="var(--ink-2)">
                {r.label}: {r.low}–{r.high}
              </text>
            </g>
          ) : (
            <g key={r.label}>
              <line x1={left} x2={right} y1={Y(r.value)} y2={Y(r.value)} stroke="var(--ink-3)" strokeDasharray="4 4" />
              <text x={left + 8} y={Y(r.value) - 8} fontSize={11.5} fill="var(--ink-2)">
                {r.label}: {r.value}
              </text>
            </g>
          ),
        )}
        <line x1={left} x2={right} y1={bottom} y2={bottom} stroke="var(--line)" />
        {[first, chart.series[Math.floor(chart.series.length / 2)], last].map((p) => (
          <text key={p.date} x={X(p.date)} y={bottom + 20} textAnchor="middle" fill="var(--ink-2)">
            {fmtDay(p.date)}
          </text>
        ))}
        <path d={path} fill="none" stroke="var(--teal)" strokeWidth={2} />
        {chart.series.map((p) => (
          <g key={p.date}>
            {p.low !== undefined && p.high !== undefined ? (
              <line x1={X(p.date)} x2={X(p.date)} y1={Y(p.high)} y2={Y(p.low)} stroke="var(--teal)" strokeWidth={1.25} />
            ) : null}
            <circle cx={X(p.date)} cy={Y(p.value)} r={4} fill="var(--teal)">
              <title>{`${formatDate(p.date)}: ${p.value} ${chart.unit}`}</title>
            </circle>
          </g>
        ))}
        <text x={X(first.date) + 12} y={Y(first.value) + 5} fontWeight={600} fill="var(--ink)">
          {fmtDay(first.date)}: {first.low ?? first.value}{first.high ? `–${first.high}` : ""}
        </text>
        {(chart.annotations ?? []).map((a) => (
          <text key={a.date} x={X(a.date) + 12} y={Y(chart.series.find((p) => p.date === a.date)?.value ?? 0) + 22} fontSize={11.5} fill="var(--ink-2)">
            {a.text}
          </text>
        ))}
        <text x={X(last.date)} y={Y(last.value) - 14} textAnchor="end" fontWeight={600} fill="var(--ink)">
          {fmtDay(last.date)}: {last.low ?? last.value}{last.high ? `–${last.high}` : ""}
        </text>
      </svg>
      <figcaption className="mt-1 text-sm text-ink-2">
        Sources:{" "}
        {chart.sourceIndexes.map((i, k) => (
          <span key={i}>
            <a href={sources[i]?.url} target="_blank" rel="noreferrer" className="hover:underline">
              {sources[i]?.publisher}
            </a>
            {k < chart.sourceIndexes.length - 1 ? ", " : ""}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/* Causes diagram: read bottom-up, roots to trigger to accelerants. */
export function CausesDiagram({ layers }: { layers: CauseLayer[] }) {
  return (
    <div className="flex flex-col-reverse gap-3">
      {layers.map((layer, li) => (
        <div key={layer.name} className="relative rounded-lg border border-line bg-paper-2 p-4">
          {li < layers.length - 1 ? (
            <span aria-hidden className="absolute -top-3 left-1/2 -translate-x-1/2 text-ink-3">↑</span>
          ) : null}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg">{layer.name}</h3>
            <span className="text-sm text-ink-2">{layer.when}</span>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {layer.causes.map((c) => (
              <li key={c.name} className="rounded-sm border border-line bg-paper p-3 text-[15px]">
                <span className="font-medium">{c.name}. </span>
                <span className="text-ink-2">{c.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* Scenario odds: one accent bar, the rest grey. Reader has already guessed before seeing this. */
export function ScenarioBars({ scenarios }: { scenarios: Scenario[] }) {
  const max = Math.max(...scenarios.map((s) => s.probability));
  return (
    <ol className="space-y-3">
      {scenarios.map((s) => {
        const lead = s.probability === max;
        return (
          <li key={s.name} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 sm:grid-cols-[11rem_1fr_3rem]">
            <span className={lead ? "font-medium" : ""}>{s.name}</span>
            <div className="h-5 rounded-[3px] bg-paper-2">
              <div
                className="h-5 rounded-[3px]"
                style={{ width: `${(s.probability / 50) * 100}%`, background: lead ? "var(--teal)" : "var(--line)" }}
              />
            </div>
            <span className={`tabular text-right ${lead ? "font-medium" : ""}`}>{s.probability}%</span>
          </li>
        );
      })}
    </ol>
  );
}

/* Dated things to watch, to scale. */
export function WatchTimeline({ items, today }: { items: WatchItem[]; today: string }) {
  const dated = items.filter((i) => i.date) as (WatchItem & { date: string })[];
  if (dated.length === 0) return null;
  const t = (d: string) => Date.parse(d) / 86400000;
  const lo = Math.min(t(today), ...dated.map((d) => t(d.date)));
  const hi = Math.max(...dated.map((d) => t(d.date))) + 14;
  const W = 760;
  const left = 250;
  const right = 700;
  const X = (d: string) => left + ((t(d) - lo) / (hi - lo)) * (right - left);
  const rowH = 32;
  const H = 70 + dated.length * rowH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Key dates to watch" className="w-full" fontFamily="var(--font-sans)" fontSize={13}>
      <line x1={X(today)} x2={X(today)} y1={40} y2={H - 16} stroke="var(--teal)" strokeDasharray="4 4" />
      <text x={X(today) + 6} y={34} fontSize={11.5} fill="var(--teal)">today</text>
      {dated.map((d, i) => {
        const y = 60 + i * rowH;
        const next = i === 0;
        return (
          <g key={d.title}>
            <line x1={left} x2={X(d.date)} y1={y} y2={y} stroke="var(--line-2)" />
            <text x={24} y={y + 4} fill="var(--ink)" fontWeight={next ? 600 : 400}>{d.title}</text>
            <path d={`M${X(d.date)} ${y - 6}l6 6l-6 6l-6 -6z`} fill={next ? "var(--teal)" : "var(--ink-3)"} />
            <text x={X(d.date) + 10} y={y + 4} fontSize={11.5} fill="var(--ink-2)">{fmtDay(d.date)}</text>
          </g>
        );
      })}
    </svg>
  );
}
