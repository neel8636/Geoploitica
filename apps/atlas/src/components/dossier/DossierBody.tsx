import Link from "next/link";
import type { Dossier } from "@/content/types";
import { formatDate } from "@/content/dossiers";
import RippleMap from "@/components/RippleMap";
import LayerNav from "@/components/dossier/LayerNav";
import Timeline from "@/components/dossier/Timeline";
import { CausesDiagram, ScenarioBars, SpreadChart, WatchTimeline } from "@/components/dossier/Charts";
import { ForYou, PredictReveal, Recap } from "@/components/dossier/Interactive";
import { ImpactMeter, Pill, Section, Signpost, SourceRef } from "@/components/dossier/Primitives";

export const dossierLayers = [
  { id: "card", label: "30-second card", minutes: 1 },
  {
    id: "brief",
    label: "5-minute brief",
    minutes: 5,
    children: [
      { id: "what-happened", label: "What happened" },
      { id: "why-it-matters", label: "Why it matters" },
      { id: "winners-losers", label: "Who wins, who loses" },
      { id: "whats-next", label: "What's next" },
    ],
  },
  {
    id: "deep",
    label: "Deep dive",
    minutes: 15,
    children: [
      { id: "timeline", label: "How it unfolded" },
      { id: "causes", label: "Root causes" },
      { id: "markets", label: "Markets" },
      { id: "stakeholders", label: "Who wants what" },
      { id: "industries", label: "Industries" },
      { id: "daily-life", label: "Daily life" },
      { id: "scenarios", label: "Scenarios" },
      { id: "countermeasures", label: "What to do" },
      { id: "analogues", label: "Last time this happened" },
      { id: "watch", label: "What to watch" },
    ],
  },
  { id: "evidence", label: "Evidence", minutes: 2 },
];

export function DossierBody({ d, backHref = "/events", backLabel = "All events" }: { d: Dossier; backHref?: string; backLabel?: string }) {
  const S = d.evidence.sources;
  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-12">
      <aside className="mb-8 lg:mb-0">
        <div className="lg:sticky lg:top-6">
          <p className="mb-3 text-sm text-ink-2">
            <Link href={backHref} className="hover:underline">{backLabel}</Link>
          </p>
          <LayerNav layers={dossierLayers} />
          <p className="mt-6 text-sm text-ink-2">
            Updated {formatDate(d.updated)}
            <br />
            {d.status === "developing" ? "Developing story: this page updates." : "Stable."}
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Layer 1: the card */}
        <section id="card" className="scroll-mt-24">
          <p className="text-sm text-ink-2">{d.region}</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">{d.title}</h1>
          <p className="prose-dossier mt-3 text-ink-2">{d.deck}</p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="font-serif text-2xl leading-snug">{d.card.headline}</p>
              <p className="mt-5 font-serif">
                <span className="tabular text-5xl font-medium">{d.card.keyNumber.value}</span>
                <SourceRef sources={S} index={d.card.keyNumber.sourceIndex} />
                <span className="mt-1 block text-[15px] text-ink-2">{d.card.keyNumber.label}</span>
              </p>
              <div className="mt-5">
                <ImpactMeter level={d.card.impactMeter} />
              </div>
              <div className="mt-6">
                <Signpost>What it means for you</Signpost>
                <div className="mt-2">
                  <ForYou lines={d.card.forYou} />
                </div>
              </div>
            </div>
            <div>
              <Signpost>How it ripples outward</Signpost>
              <div className="mt-2">
                <RippleMap centre={d.title} rings={d.card.ripple} compact />
              </div>
            </div>
          </div>
        </section>

        {/* Layer 2: the brief */}
        <Section id="brief" title="The five-minute brief">
          <div className="prose-dossier space-y-8">
            <div id="what-happened" className="scroll-mt-24">
              <Signpost>What happened</Signpost>
              {d.brief.whatHappened.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
            </div>
            <div id="why-it-matters" className="scroll-mt-24">
              <Signpost>Why it matters</Signpost>
              {d.brief.whyItMatters.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
            </div>
            <div id="winners-losers" className="scroll-mt-24 grid gap-6 font-sans text-[15px] sm:grid-cols-2">
              <div>
                <Signpost>Who wins</Signpost>
                <ul className="mt-2 space-y-2">
                  {d.brief.winners.map((w) => (
                    <li key={w.who} className="border-l-2 border-green pl-3">
                      <span className="font-medium">{w.who}. </span>
                      <span className="text-ink-2">{w.why}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <Signpost>Who loses</Signpost>
                <ul className="mt-2 space-y-2">
                  {d.brief.losers.map((w) => (
                    <li key={w.who} className="border-l-2 border-red pl-3">
                      <span className="font-medium">{w.who}. </span>
                      <span className="text-ink-2">{w.why}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div id="whats-next" className="scroll-mt-24">
              <Signpost>What&apos;s next</Signpost>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {d.brief.whatsNext.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
            <div className="font-sans">
              <PredictReveal prompt={d.brief.predict} />
            </div>
            <div className="font-sans">
              <Recap questions={d.brief.recap} />
            </div>
          </div>
        </Section>

        {/* Layer 3: deep dive */}
        <div id="deep" className="scroll-mt-24" />
        <Section id="timeline" title="How it unfolded" lead="Turning points are marked. Scroll to move through it.">
          <Timeline events={d.deep.timeline} sources={S} />
        </Section>

        <Section id="causes" title="Root causes" lead="Read it bottom-up: long-running strains primed the ground, the trigger lit it, and the accelerants turned it national.">
          <CausesDiagram layers={d.deep.causes} />
        </Section>

        {d.deep.chart ? (
          <Section id="markets" title="Markets">
            <SpreadChart chart={d.deep.chart} sources={S} />
          </Section>
        ) : null}

        <Section id="stakeholders" title="Who wants what" lead="Each actor's goal, leverage and likely next move. The question news rarely answers.">
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="border-b border-line text-left text-sm text-ink-2">
                  <th className="py-2 pr-3 font-medium">Actor</th>
                  <th className="py-2 pr-3 font-medium">Wants</th>
                  <th className="py-2 pr-3 font-medium">Leverage</th>
                  <th className="py-2 font-medium">Likely move</th>
                </tr>
              </thead>
              <tbody>
                {d.deep.stakeholders.map((s) => (
                  <tr key={s.name} className="border-b border-line-2 align-top">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{s.name}</span>
                      <span className="block text-sm text-ink-2">{s.role}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-2">{s.wants}</td>
                    <td className="py-2.5 pr-3 text-ink-2">{s.leverage}</td>
                    <td className="py-2.5 text-ink-2">{s.likelyMove}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="industries" title="Industries: who gains, who loses">
          <ul className="grid gap-3 sm:grid-cols-2">
            {d.deep.sectors.map((s) => (
              <li key={s.sector} className="rounded-sm border border-line p-3 text-[15px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.sector}</span>
                  <Pill tone={s.direction}>
                    {s.direction === "up" ? "Gains" : s.direction === "down" ? "Hurt" : "Mixed"} · size {s.size}/3
                  </Pill>
                </div>
                <p className="mt-1 text-ink-2">{s.why}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="daily-life" title="Daily life" lead="The macro numbers translated into household terms.">
          <dl className="grid gap-3 sm:grid-cols-2">
            {d.deep.dailyLife.map((i) => (
              <div key={i.item} className="rounded-sm bg-paper-2 p-3 text-[15px]">
                <dt className="font-medium">
                  {i.item}
                  {i.sourceIndex !== undefined ? <SourceRef sources={S} index={i.sourceIndex} /> : null}
                </dt>
                <dd className="mt-1 text-ink-2">{i.effect}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="scenarios" title="Scenarios and predictions" lead="Probabilities are the author's judgement, not a sourced forecast, and are graded publicly as events resolve.">
          <ScenarioBars scenarios={d.deep.scenarios} />
          <div className="mt-6 space-y-4">
            {d.deep.scenarios.map((s) => (
              <details key={s.name} className="rounded-sm border border-line p-3 text-[15px]">
                <summary className="cursor-pointer font-medium">
                  {s.name} <span className="tabular text-ink-2">· {s.probability}%</span>
                </summary>
                <p className="mt-2">{s.looksLike}</p>
                <p className="mt-2 text-ink-2"><span className="font-medium text-ink">Signposts: </span>{s.signposts.join("; ")}.</p>
                <p className="mt-1 text-ink-2"><span className="font-medium text-ink">Effect beyond France: </span>{s.effectOnWorld}</p>
              </details>
            ))}
          </div>
          <div className="mt-6">
            <Signpost>Five predictions on the record</Signpost>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-[15px]">
              {d.deep.predictions.map((p) => (
                <li key={p.text}>
                  {p.text} <span className="text-ink-2">({p.horizon})</span>
                </li>
              ))}
            </ol>
          </div>
        </Section>

        <Section id="countermeasures" title="What to do" lead="Actions by who you are.">
          <div className="grid gap-4 sm:grid-cols-2">
            {d.deep.countermeasures.map((c) => (
              <div key={c.audience}>
                <Signpost>{c.audience[0].toUpperCase() + c.audience.slice(1)}</Signpost>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
                  {c.actions.map((a) => <li key={a}>{a}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="analogues" title="Last time this happened">
          <ul className="space-y-3 text-[15px]">
            {d.deep.analogues.map((a) => (
              <li key={a.event} className="grid gap-1 sm:grid-cols-[6rem_1fr]">
                <span className="tabular text-ink-2">{a.year}</span>
                <span><span className="font-medium">{a.event}. </span><span className="text-ink-2">{a.whatFollowed}</span></span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="watch" title="What to watch">
          <WatchTimeline items={d.deep.watch} today={d.updated} />
          <ul className="mt-4 space-y-2 text-[15px]">
            {d.deep.watch.map((w) => (
              <li key={w.title} className="grid gap-1 sm:grid-cols-[7rem_1fr]">
                <span className="tabular text-ink-2">{w.date ? formatDate(w.date) : "Ongoing"}</span>
                <span><span className="font-medium">{w.title}. </span><span className="text-ink-2">{w.why}</span></span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Layer 4: evidence */}
        <Section id="evidence" title="Evidence" lead={d.evidence.method}>
          <Signpost>Confidence by claim</Signpost>
          <ul className="mt-2 space-y-1 text-[15px]">
            {d.evidence.confidence.map((c) => (
              <li key={c.claim} className="flex flex-wrap items-baseline gap-2">
                <Pill tone={c.level === "high" ? "up" : c.level === "medium" ? "mixed" : "neutral"}>{c.level}</Pill>
                <span className="font-medium">{c.claim}.</span>
                <span className="text-ink-2">{c.note}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Signpost>Sources</Signpost>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px]">
              {S.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">{s.title}</a>
                  <span className="text-ink-2"> — {s.publisher}{s.date ? `, ${formatDate(s.date)}` : ""}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-6">
            <Signpost>Change log</Signpost>
            <ul className="mt-2 text-[15px] text-ink-2">
              {d.evidence.changeLog.map((c) => (
                <li key={c.date + c.change}><span className="tabular">{formatDate(c.date)}</span>: {c.change}</li>
              ))}
            </ul>
          </div>
        </Section>
      </div>
    </article>
  );
}
