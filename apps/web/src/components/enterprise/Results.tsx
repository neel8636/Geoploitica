"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CHANGE_TYPE_LABELS,
  DEPARTMENT_LABELS,
  money,
  type AnalysisResult,
  type BriefItem,
  type Department,
} from "@/lib/engine";
import { formatDate } from "@/content/dossiers";

const fmtDay = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${d}`;
};

function scoreTone(score: number) {
  return score >= 70 ? "var(--red)" : score >= 40 ? "var(--amber)" : "var(--teal)";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-line pl-3">
      <p className="tabular font-serif text-2xl">{value}</p>
      <p className="text-sm text-ink-2">{label}</p>
    </div>
  );
}

/* Exposure by country: spend bars, coloured by the worst score touching that country. */
function CountryBars({ rows, currency }: { rows: AnalysisResult["by_country"]; currency: string }) {
  const max = Math.max(1, ...rows.map((r) => r.spend));
  return (
    <ol className="space-y-2">
      {rows.slice(0, 10).map((r) => (
        <li key={r.country} className="grid grid-cols-[2.5rem_1fr_6rem] items-center gap-3 text-[15px]">
          <span className="font-medium">{r.country}</span>
          <div className="h-4 rounded-[3px] bg-paper-2" title={`${r.suppliers} suppliers, worst score ${r.max_score}`}>
            <div className="h-4 rounded-[3px]" style={{ width: `${Math.max(2, (r.spend / max) * 100)}%`, background: scoreTone(r.max_score) }} />
          </div>
          <span className="tabular text-right text-sm text-ink-2">{money(r.spend, currency) || `${r.suppliers} sup.`}</span>
        </li>
      ))}
    </ol>
  );
}

/* Change radar: every matched change on one time axis, sized by score. */
function Radar({ rows, asOf }: { rows: AnalysisResult["by_change"]; asOf: string }) {
  const dated = rows.filter((r) => r.effective_date).sort((a, b) => (a.effective_date! < b.effective_date! ? -1 : 1));
  const undated = rows.filter((r) => !r.effective_date);
  const t = (d: string) => Date.parse(d) / 86400000;
  const lo = t(asOf);
  const hi = Math.max(lo + 60, ...dated.map((d) => t(d.effective_date!))) + 10;
  const W = 760;
  const left = 300;
  const right = 660;
  const X = (d: string) => left + ((t(d) - lo) / (hi - lo)) * (right - left);
  const rowH = 30;
  const H = 50 + dated.length * rowH;
  return (
    <div>
      {dated.length ? (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Dated changes that touch your footprint" className="w-full" fontFamily="var(--font-sans)" fontSize={13}>
          <line x1={X(asOf)} x2={X(asOf)} y1={30} y2={H - 10} stroke="var(--teal)" strokeDasharray="4 4" />
          <text x={X(asOf) + 6} y={24} fontSize={11.5} fill="var(--teal)">today</text>
          {dated.map((r, i) => {
            const y = 46 + i * rowH;
            const x = X(r.effective_date!);
            const rad = 5 + (r.max_score / 100) * 7;
            return (
              <g key={r.change_id}>
                <line x1={left} x2={x} y1={y} y2={y} stroke="var(--line-2)" />
                <text x={24} y={y + 4} fill="var(--ink)">
                  {r.title.length > 44 ? r.title.slice(0, 42) + "…" : r.title}
                </text>
                <circle cx={x} cy={y} r={rad} fill={scoreTone(r.max_score)} fillOpacity={0.85}>
                  <title>{`${r.title}: ${fmtDay(r.effective_date!)}, score ${r.max_score}, ${r.exposures} exposures`}</title>
                </circle>
                <text x={x + rad + 6} y={y + 4} fontSize={11.5} fill="var(--ink-2)">
                  {fmtDay(r.effective_date!)}{r.days_until !== undefined ? ` · ${r.days_until}d` : ""}
                </text>
              </g>
            );
          })}
        </svg>
      ) : null}
      {undated.length ? (
        <p className="mt-2 text-sm text-ink-2">
          Developing now, no fixed date: {undated.map((u) => u.title).join("; ")}.
        </p>
      ) : null}
    </div>
  );
}

function BriefCard({ item, currency }: { item: BriefItem; currency: string }) {
  void currency;
  return (
    <article className="rounded-lg border border-line p-4 text-[15px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-sans text-base font-semibold">{item.headline}</h3>
        <span className="text-sm text-ink-2">
          {item.days_until !== undefined ? (item.days_until <= 0 ? "Now" : `${item.days_until} days`) : "Developing"} · confidence {item.confidence}
        </span>
      </div>
      <div className="mt-1 h-1 w-full rounded bg-paper-2">
        <div className="h-1 rounded" style={{ width: `${item.score}%`, background: scoreTone(item.score) }} aria-label={`Score ${item.score} of 100`} />
      </div>
      <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[9.5rem_1fr]">
        <dt className="signpost">What changes</dt><dd>{item.what_changes}</dd>
        <dt className="signpost">Your exposure</dt><dd>{item.your_exposure}</dd>
        <dt className="signpost">Cost if unprepared</dt><dd>{item.cost_if_unprepared}</dd>
        <dt className="signpost">Next action</dt>
        <dd>{item.next_action} <span className="text-ink-2">— {item.owner_role}</span></dd>
        {item.also_notify.length ? (
          <>
            <dt className="signpost">Also notify</dt>
            <dd className="text-ink-2">{item.also_notify.map((d) => DEPARTMENT_LABELS[d]).join(", ")}</dd>
          </>
        ) : null}
      </dl>
      <p className="mt-3 text-sm text-ink-2">
        Sources:{" "}
        {item.sources.map((s, i) => (
          <span key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">{s.publisher ?? s.title}</a>
            {i < item.sources.length - 1 ? ", " : ""}
          </span>
        ))}
      </p>
    </article>
  );
}

export default function Results({ result, currency, companyName }: { result: AnalysisResult; currency: string; companyName: string }) {
  const depts = result.briefs.map((b) => b.department);
  const [dept, setDept] = useState<Department | "leadership">("leadership");
  const current = dept === "leadership" ? result.leadership_top5 : result.briefs.find((b) => b.department === dept)?.items ?? [];
  const exposedSuppliers = new Set(result.exposures.filter((e) => e.item_type === "supplier").map((e) => e.item_id)).size;
  // Count each footprint item once, at its own value, however many changes touch it.
  const seen = new Map<string, number>();
  for (const e of result.exposures) {
    if (e.value_at_risk) seen.set(`${e.item_type}:${e.item_id}`, e.value_at_risk);
  }
  const valueAtRisk = Array.from(seen.values()).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm text-ink-2">Impact report · {companyName} · as of {formatDate(result.as_of)}</p>
        <h2 className="mt-1 text-3xl">
          {result.by_change.length} coming changes touch your footprint
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="suppliers exposed" value={`${exposedSuppliers} of ${result.footprint.suppliers}`} />
          <Stat label="countries in footprint" value={`${result.footprint.countries.length}`} />
          <Stat label="spend and volume touched" value={money(valueAtRisk, currency) || "—"} />
          <Stat label="department briefs" value={`${result.briefs.length}`} />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="signpost">Where your spend sits, coloured by worst change</p>
          <div className="mt-3"><CountryBars rows={result.by_country} currency={currency} /></div>
        </div>
        <div>
          <p className="signpost">When each change lands</p>
          <div className="mt-3"><Radar rows={result.by_change} asOf={result.as_of} /></div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Department">
          <button type="button" role="tab" aria-selected={dept === "leadership"} onClick={() => setDept("leadership")}
            className={`rounded-sm border px-3 py-1.5 text-sm ${dept === "leadership" ? "border-teal bg-teal text-paper" : "border-line hover:border-teal"}`}>
            Leadership: top 5
          </button>
          {depts.filter((d) => d !== "leadership").map((d) => (
            <button key={d} type="button" role="tab" aria-selected={dept === d} onClick={() => setDept(d)}
              className={`rounded-sm border px-3 py-1.5 text-sm ${dept === d ? "border-teal bg-teal text-paper" : "border-line hover:border-teal"}`}>
              {DEPARTMENT_LABELS[d]}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4" role="tabpanel">
          {current.length ? current.map((item) => <BriefCard key={`${dept}-${item.change_id}`} item={item} currency={currency} />) : (
            <p className="text-ink-2">No changes touch this department yet.</p>
          )}
        </div>
      </section>

      <section>
        <p className="signpost">All exposures</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="border-b border-line text-left text-sm text-ink-2">
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 font-medium">Change</th>
                <th className="py-2 pr-3 font-medium">Why</th>
                <th className="py-2 pr-3 text-right font-medium">Score</th>
                <th className="py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {result.exposures.slice(0, 50).map((e) => {
                const ch = result.by_change.find((c) => c.change_id === e.change_id);
                return (
                  <tr key={`${e.change_id}-${e.item_type}-${e.item_id}`} className="border-b border-line-2 align-top">
                    <td className="py-2 pr-3"><span className="font-medium">{e.item_label}</span><span className="block text-sm text-ink-2">{e.item_type}</span></td>
                    <td className="py-2 pr-3">{ch?.title ?? e.change_id}<span className="block text-sm text-ink-2">{ch ? CHANGE_TYPE_LABELS[ch.type] : ""}</span></td>
                    <td className="py-2 pr-3 text-ink-2">{e.reason}</td>
                    <td className="tabular py-2 pr-3 text-right" style={{ color: scoreTone(e.score) }}>{e.score}</td>
                    <td className="tabular py-2 text-right text-ink-2">{money(e.value_at_risk, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {result.exposures.length > 50 ? <p className="mt-2 text-sm text-ink-2">Showing the top 50 of {result.exposures.length}.</p> : null}
      </section>

      <p className="text-sm text-ink-2">
        Decision support, not advice. Every score follows the published formula in{" "}
        <Link href="/method" className="hover:underline">How we work</Link>; cost ranges are estimates to be checked by the people who know the business.
      </p>
    </div>
  );
}
