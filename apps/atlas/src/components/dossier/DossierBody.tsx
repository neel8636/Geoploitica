import Link from "next/link";
import type { ReactNode } from "react";
import FuelSpine from "@/components/dossier/FuelSpine";
import HowItConnects from "@/components/dossier/HowItConnects";
import type { ConnRow } from "@/content/connections";
import type { Dossier } from "@/content/types";
import { formatDate } from "@/content/format";
import RippleMap from "@/components/RippleMap";
import ChapterBar from "@/components/dossier/ChapterBar";
import { Chapter, Fold, Lead, Sub } from "@/components/dossier/ReportParts";
import Timeline from "@/components/dossier/Timeline";
import { CausesDiagram, ScenarioBars, SpreadChart, WatchTimeline } from "@/components/dossier/Charts";
import { ForYou, PredictReveal, Recap } from "@/components/dossier/Interactive";
import { ImpactMeter, Pill, SourceRef } from "@/components/dossier/Primitives";
import MembersOnly from "@/components/auth/MembersOnly";

/*
  The layered report, laid out so a reader never loses the thread:
    - a short "in three points" box first,
    - five numbered chapters with big headings and a chapter bar that stays on screen,
    - the brief written as short blocks with the point of each paragraph in bold,
    - the deep dive and the evidence folded, one module at a time, each saying what is inside.
  The whole report sits behind a free account. SHARED FILE (npm run sync:shared in apps/atlas).
*/

export type ChapterId = "card" | "how-it-connects" | "brief" | "deep" | "evidence";
const CHAPTERS: { id: ChapterId; label: string }[] = [
  { id: "card", label: "In 30 seconds" },
  { id: "how-it-connects", label: "How it connects" },
  { id: "brief", label: "The brief" },
  { id: "deep", label: "Deep dive" },
  { id: "evidence", label: "Evidence" },
];

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

export function DossierBody({
  d,
  backHref = "/events",
  backLabel = "All events",
  errorUrl,
  after,
  connections,
  parts,
  embedded = false,
}: {
  d: Dossier;
  backHref?: string;
  backLabel?: string;
  errorUrl?: string; // where readers report a mistake
  after?: ReactNode; // anything the page adds at the end
  connections?: ConnRow[];
  parts?: ChapterId[]; // only these chapters (the reader picked a shorter report); default all
  embedded?: boolean; // inside an event page's report chooser, which already shows the title
}) {
  const S = d.evidence.sources;
  const conns = connections ?? [];
  const want = (id: ChapterId) => !parts || parts.includes(id);
  const chapters = CHAPTERS.filter((c) => want(c.id) && (c.id !== "how-it-connects" || conns.length));
  const has = (id: ChapterId) => chapters.some((c) => c.id === id);
  const n = (id: string) => chapters.findIndex((c) => c.id === id) + 1;
  const likely = [...d.deep.scenarios].sort((a, b) => b.probability - a.probability)[0];
  const nextWatch = [...d.deep.watch].filter((w) => w.date).sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? -1 : 1))[0];
  const three = [
    d.card.headline,
    `${d.card.keyNumber.value}: ${d.card.keyNumber.label}`,
    d.brief.whatsNext[0] ?? (nextWatch ? `${nextWatch.title} (${formatDate(nextWatch.date!)})` : ""),
  ].filter(Boolean);

  return (
    <MembersOnly
      title="Sign in to read this report"
      points={["The 30-second card: the headline, the key number and what it means for you", "How it connects, step by step", "The 5-minute brief: what happened, why it matters, who wins and who loses", "The deep dive: causes, scenarios with odds, predictions on the record", "Every source, with a confidence label on each claim"]}
      anchors={["card", "how-it-connects", "brief", "deep", "evidence"]}
    >
      <article className={embedded ? "mx-auto max-w-3xl pb-12 pt-2" : "mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6"}>
        {embedded ? (
          <p className="text-sm text-ink-2">Report · {d.region} · updated {formatDate(d.updated)}</p>
        ) : (
          <>
            <p className="text-sm text-ink-2">
              <Link href={backHref} className="hover:underline">{backLabel}</Link> · Report · {d.region} · updated {formatDate(d.updated)}
            </p>
            <h1 className="mt-2 text-[2.1rem] leading-[1.12] sm:text-[2.6rem]">{d.title}</h1>
            <p className="mt-3 font-serif text-lg leading-relaxed text-ink-2">{d.deck}</p>
          </>
        )}
        <Trust d={d} errorUrl={errorUrl} />

        {chapters.length > 2 ? <ChapterBar chapters={chapters} /> : null}

        {/* the whole report in three points */}
        {has("card") ? <div className="mt-6 rounded-2xl border border-gold/60 bg-paper-2 p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-gold">In three points</p>
          <ol className="mt-3 space-y-3">
            {three.map((t, i) => (
              <li key={i} className="flex gap-3 text-[17px] leading-snug">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold text-sm font-semibold text-gold">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div> : null}

        {/* 1. the card */}
        {has("card") ? <Chapter n={n("card")} id="card" title="In 30 seconds" minutes={d.readingMinutes.card} lead="The number that matters, what it means for you, and how far it spreads">
          <div className="grid gap-6 sm:grid-cols-[1fr_1fr]">
            <div className="rounded-xl border border-line p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-2">The key number</p>
              <p className="mt-1 font-serif">
                <span className="tabular text-5xl font-medium text-gold">{d.card.keyNumber.value}</span>
                <SourceRef sources={S} index={d.card.keyNumber.sourceIndex} />
              </p>
              <p className="mt-1 text-[15px] text-ink-2">{d.card.keyNumber.label}</p>
              <div className="mt-4"><ImpactMeter level={d.card.impactMeter} /></div>
            </div>
            <div className="rounded-xl border border-line p-4">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-2">What it means for you</p>
              <ForYou lines={d.card.forYou} />
            </div>
          </div>
          <FuelSpine fuel={d.fuel} />
          <div className="mt-6">
            <Fold id="ripple-rings" title="How far it spreads" teaser={`${plural(d.card.ripple.length, "ring")} of effects, from first to ${d.card.ripple.length === 3 ? "third" : "last"} order`}>
              <RippleMap centre={d.title} rings={d.card.ripple} compact />
            </Fold>
          </div>
        </Chapter> : null}

        {/* 2. how it connects */}
        {has("how-it-connects") ? (
          <Chapter n={n("how-it-connects")} id="how-it-connects" title="How it connects" lead={`${plural(conns.length, "connection")}, each from cause to effect; open one to read it`}>
            <HowItConnects rows={conns} />
          </Chapter>
        ) : null}

        {/* 3. the brief */}
        {has("brief") ? <Chapter n={n("brief")} id="brief" title="The brief" minutes={d.readingMinutes.brief} lead="What happened, why it matters, who wins and loses, what comes next">
          <div className="space-y-10 text-[16.5px]">
            <div>
              <Sub id="what-happened">What happened</Sub>
              <div className="space-y-3">{d.brief.whatHappened.map((p) => <Lead key={p.slice(0, 40)} text={p} />)}</div>
            </div>
            <div>
              <Sub id="why-it-matters">Why it matters</Sub>
              <ul className="space-y-2.5">
                {d.brief.whyItMatters.map((p) => (
                  <li key={p.slice(0, 40)} className="rounded-lg bg-paper-2 px-4 py-3">
                    <Lead text={p} />
                  </li>
                ))}
              </ul>
            </div>
            <div id="winners-losers" className="scroll-mt-28">
              <Sub>Who wins, who loses</Sub>
              <div className="grid gap-3 sm:grid-cols-2">
                <WinLose title="Wins" tone="green" items={d.brief.winners} />
                <WinLose title="Loses" tone="red" items={d.brief.losers} />
              </div>
            </div>
            <div>
              <Sub id="whats-next">What comes next</Sub>
              <ol className="space-y-2">
                {d.brief.whatsNext.map((p, i) => (
                  <li key={p} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[12px] font-semibold text-paper">{i + 1}</span>
                    <span className="leading-relaxed">{p}</span>
                  </li>
                ))}
              </ol>
            </div>
            <Fold id="test-yourself" title="Test yourself" teaser="Make a call, then two quick questions on what you just read">
              <div className="space-y-6">
                <PredictReveal prompt={d.brief.predict} />
                <Recap questions={d.brief.recap} />
              </div>
            </Fold>
          </div>
        </Chapter> : null}

        {/* 4. the deep dive: one module at a time */}
        {has("deep") ? <Chapter n={n("deep")} id="deep" title="Deep dive" minutes={d.readingMinutes.deep} lead="Open the part you need; each says what is inside">
          <div className="space-y-3">
            <Fold id="timeline" title="How it unfolded" teaser={`${plural(d.deep.timeline.length, "moment")}${d.deep.timeline[0] ? `, from ${formatDate(d.deep.timeline[0].date)}` : ""}`}>
              <Timeline events={d.deep.timeline} sources={S} />
            </Fold>
            <Fold id="causes" title="Root causes" teaser="From long-running strains to the trigger, read bottom-up">
              <CausesDiagram layers={d.deep.causes} />
            </Fold>
            {d.deep.chart ? (
              <Fold id="markets" title="Markets" teaser={d.deep.chart.title}>
                <SpreadChart chart={d.deep.chart} sources={S} />
              </Fold>
            ) : null}
            <Fold id="stakeholders" title="Who wants what" teaser={`${plural(d.deep.stakeholders.length, "player")}: their goal, their leverage, their next move`}>
              <div className="space-y-3">
                {d.deep.stakeholders.map((s) => (
                  <div key={s.name} className="rounded-lg border border-line-2 p-3 text-[15px]">
                    <p className="font-semibold">{s.name} <span className="font-normal text-ink-3">· {s.role}</span></p>
                    <dl className="mt-1.5 grid gap-1 sm:grid-cols-[6.5rem_1fr]">
                      <dt className="text-ink-3">Wants</dt><dd>{s.wants}</dd>
                      <dt className="text-ink-3">Leverage</dt><dd className="text-ink-2">{s.leverage}</dd>
                      <dt className="text-ink-3">Next move</dt><dd className="text-ink-2">{s.likelyMove}</dd>
                    </dl>
                  </div>
                ))}
              </div>
            </Fold>
            <Fold id="industries" title="Industries" teaser={`${plural(d.deep.sectors.filter((s) => s.direction === "up").length, "gains", "gain")}, ${plural(d.deep.sectors.filter((s) => s.direction === "down").length, "is hurt", "are hurt")}`}>
              <ul className="grid gap-3 sm:grid-cols-2">
                {d.deep.sectors.map((s) => (
                  <li key={s.sector} className="rounded-lg border border-line-2 p-3 text-[15px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{s.sector}</span>
                      <Pill tone={s.direction}>{s.direction === "up" ? "Gains" : s.direction === "down" ? "Hurt" : "Mixed"} · {s.size}/3</Pill>
                    </div>
                    <p className="mt-1 text-ink-2">{s.why}</p>
                  </li>
                ))}
              </ul>
            </Fold>
            <Fold id="daily-life" title="Daily life" teaser="What it means at home, in plain terms">
              <dl className="grid gap-3 sm:grid-cols-2">
                {d.deep.dailyLife.map((i) => (
                  <div key={i.item} className="rounded-lg bg-paper-2 p-3 text-[15px]">
                    <dt className="font-semibold">
                      {i.item}
                      {i.sourceIndex !== undefined ? <SourceRef sources={S} index={i.sourceIndex} /> : null}
                    </dt>
                    <dd className="mt-1 text-ink-2">{i.effect}</dd>
                  </div>
                ))}
              </dl>
            </Fold>
            <Fold id="scenarios" title="Scenarios and predictions" teaser={likely ? `Most likely: ${likely.name} (${likely.probability}%) · ${plural(d.deep.predictions.length, "prediction")} on the record` : undefined}>
              <p className="mb-3 text-sm text-ink-3">Odds are the author&apos;s judgement, graded publicly as events resolve.</p>
              <ScenarioBars scenarios={d.deep.scenarios} />
              <div className="mt-4 space-y-2">
                {d.deep.scenarios.map((s) => (
                  <div key={s.name} className="rounded-lg border border-line-2 p-3 text-[15px]">
                    <p className="font-semibold">{s.name} <span className="tabular font-normal text-ink-2">· {s.probability}%</span></p>
                    <p className="mt-1">{s.looksLike}</p>
                    <p className="mt-1 text-ink-2"><span className="text-ink-3">Signs it is happening: </span>{s.signposts.join("; ")}.</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-2">Predictions on the record</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px]">
                {d.deep.predictions.map((p) => (
                  <li key={p.text}>{p.text} <span className="text-ink-3">({p.horizon})</span></li>
                ))}
              </ol>
            </Fold>
            <Fold id="countermeasures" title="What to do" teaser={`Actions for ${d.deep.countermeasures.map((c) => c.audience).join(", ")}`}>
              <div className="grid gap-4 sm:grid-cols-2">
                {d.deep.countermeasures.map((c) => (
                  <div key={c.audience} className="rounded-lg border border-line-2 p-3">
                    <p className="font-semibold">{c.audience[0].toUpperCase() + c.audience.slice(1)}</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] text-ink-2">
                      {c.actions.map((a) => <li key={a}>{a}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </Fold>
            <Fold id="analogues" title="Last time this happened" teaser={d.deep.analogues.map((a) => `${a.event} (${a.year})`).join(" · ")}>
              <ul className="space-y-3 text-[15px]">
                {d.deep.analogues.map((a) => (
                  <li key={a.event}>
                    <p className="font-semibold">{a.event} <span className="font-normal text-ink-3">· {a.year}</span></p>
                    <p className="text-ink-2">{a.whatFollowed}</p>
                  </li>
                ))}
              </ul>
            </Fold>
            <Fold id="watch" title="What to watch" teaser={nextWatch ? `Next: ${nextWatch.title}, ${formatDate(nextWatch.date!)}` : plural(d.deep.watch.length, "thing")}>
              <WatchTimeline items={d.deep.watch} today={d.updated} />
              <ul className="mt-4 space-y-2 text-[15px]">
                {d.deep.watch.map((w) => (
                  <li key={w.title} className="grid gap-1 sm:grid-cols-[7rem_1fr]">
                    <span className="tabular text-ink-3">{w.date ? formatDate(w.date) : "Ongoing"}</span>
                    <span><span className="font-semibold">{w.title}. </span><span className="text-ink-2">{w.why}</span></span>
                  </li>
                ))}
              </ul>
            </Fold>
          </div>
        </Chapter> : null}

        {/* 5. evidence */}
        {has("evidence") ? <Chapter n={n("evidence")} id="evidence" title="Evidence" minutes={2} lead={`${plural(S.length, "source")}, a confidence label on each claim, every fix logged`}>
          <div className="space-y-3">
            <Fold id="confidence" title="How sure we are" teaser={`${plural(d.evidence.confidence.length, "claim")} rated high, medium or low`}>
              <ul className="space-y-2 text-[15px]">
                {d.evidence.confidence.map((c) => (
                  <li key={c.claim} className="flex flex-wrap items-baseline gap-2">
                    <Pill tone={c.level === "high" ? "up" : c.level === "medium" ? "mixed" : "neutral"}>{c.level}</Pill>
                    <span className="font-semibold">{c.claim}.</span>
                    <span className="text-ink-2">{c.note}</span>
                  </li>
                ))}
              </ul>
            </Fold>
            <Fold id="sources" title="Sources" teaser={plural(S.length, "source")}>
              <ol className="list-decimal space-y-1 pl-5 text-[15px]">
                {S.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="hover:underline">{s.title}</a>
                    <span className="text-ink-2"> · {s.publisher}{s.date ? `, ${formatDate(s.date)}` : ""}</span>
                  </li>
                ))}
              </ol>
            </Fold>
            <Fold id="method" title="How this report was made" teaser="Method and change log">
              <p className="text-[15px] text-ink-2">{d.evidence.method}</p>
              <ul className="mt-3 text-[15px] text-ink-2">
                {d.evidence.changeLog.map((c) => (
                  <li key={c.date + c.change}><span className="tabular">{formatDate(c.date)}</span>: {c.change}</li>
                ))}
              </ul>
              {errorUrl ? (
                <p className="mt-3 text-[15px]">
                  Spotted a mistake? <a href={errorUrl} target="_blank" rel="noreferrer" className="underline">Report an error</a>; fixes are logged here.
                </p>
              ) : null}
            </Fold>
          </div>
        </Chapter> : null}
        {after}
      </article>
    </MembersOnly>
  );
}

function WinLose({ title, tone, items }: { title: string; tone: "green" | "red"; items: { who: string; why: string }[] }) {
  return (
    <div className={`rounded-xl border-t-4 bg-paper-2 p-4 ${tone === "green" ? "border-green" : "border-red"}`}>
      <p className={`text-[13px] font-semibold uppercase tracking-[0.1em] ${tone === "green" ? "text-green" : "text-red"}`}>{title}</p>
      <ul className="mt-2 space-y-2.5 text-[15px]">
        {items.map((w) => (
          <li key={w.who}>
            <span className="block font-semibold">{w.who}</span>
            <span className="text-ink-2">{w.why}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* One short line on how far to trust the report; the detail opens on demand. */
function Trust({ d, errorUrl }: { d: Dossier; errorUrl?: string }) {
  const g = d.generated;
  if (!g) return null;
  const [tone, label, detail] = g.outdated
    ? ["border-red bg-red-2", "Out of date", `This report needs redrafting because ${g.outdated}. A fresh draft is on its way; until then, trust the event summary over this report.`]
    : g.reviewed
      ? ["border-green bg-green-2", "Checked by a person", ""]
      : g.sourceChecked
        ? ["border-line bg-paper-2", "AI-drafted, then fact-checked", `Written by ${g.model} from cited reporting, then checked claim by claim by ${g.sourceChecked.by} on ${formatDate(g.sourceChecked.at)}: ${g.sourceChecked.claims} claims checked, ${g.sourceChecked.fixed} corrected. Not yet reviewed by a person.`]
        : ["border-amber bg-amber-2", "AI-drafted", `Written by ${g.by} (${g.model}) on ${formatDate(g.at.slice(0, 10))} from ${g.sources} sources and ${g.headlines} headlines, not yet checked by a person. Treat numbers as leads, not facts; every claim links to where it came from.`];
  return (
    <details className={`mt-4 rounded-lg border px-3 py-2 text-sm ${tone}`}>
      <summary className="cursor-pointer font-medium">{label} · how far to trust this</summary>
      {detail ? <p className="mt-1.5 text-ink-2">{detail}</p> : null}
      {errorUrl ? <p className="mt-1"><a href={errorUrl} target="_blank" rel="noreferrer" className="underline">Report an error</a></p> : null}
    </details>
  );
}
