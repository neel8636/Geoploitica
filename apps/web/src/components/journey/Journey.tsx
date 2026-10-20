"use client";

import Link from "next/link";
import { useEffect } from "react";
import { STEPS, markStep, resetJourney, useJourney } from "@/lib/journey";

/*
  The journey page: a numbered path with progress, the two-minute explainer (step 1) and the
  cadence (step 6) inline. Steps 2-5 are done on their own pages and reported back here.
*/
export default function Journey() {
  const { state, done, total, next } = useJourney();

  // Reading this page is step 1; reaching the rhythm section is step 6.
  useEffect(() => {
    markStep("understand");
    const el = document.getElementById("rhythm");
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        markStep("rhythm");
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const complete = done >= total;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div>
          <p className="signpost">Get started</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">From a headline to your supply chain, in about half an hour.</h1>
          <p className="prose-dossier mt-4 text-ink-2">
            Six steps, in order. Each one happens in the product itself; this page keeps track. You can stop
            after any step and come back: progress is remembered in this browser.
          </p>
        </div>
        <aside className="rounded-lg border border-line bg-paper-2 p-4">
          <p className="text-sm text-ink-2">Your progress</p>
          <p className="mt-1 font-serif text-3xl">
            {done} <span className="text-ink-3">of {total}</span>
          </p>
          <div className="mt-2 flex gap-1" aria-hidden>
            {STEPS.map((s) => (
              <span key={s.id} className={`h-2 flex-1 rounded-sm ${state[s.id] ? "bg-teal" : "bg-line"}`} />
            ))}
          </div>
          {complete ? (
            <p className="mt-3 text-sm">You have been through the whole product. <Link href="/enterprise" className="text-teal hover:underline">Run your next report</Link>.</p>
          ) : next ? (
            <p className="mt-3 text-sm">
              Next: <Link href={next.href} className="text-teal hover:underline">{next.title}</Link> · {next.minutes} min
            </p>
          ) : null}
          <button type="button" onClick={resetJourney} className="mt-3 text-xs text-ink-3 hover:underline">Start over</button>
        </aside>
      </div>

      <ol className="mt-10 space-y-3">
        {STEPS.map((s, i) => {
          const isDone = Boolean(state[s.id]);
          const isNext = next?.id === s.id;
          return (
            <li key={s.id} id={s.id === "understand" || s.id === "rhythm" ? undefined : s.id} className={`grid gap-3 rounded-lg border p-5 sm:grid-cols-[3rem_1fr_11rem] ${isNext ? "border-teal bg-paper-2" : "border-line"}`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full font-sans text-sm ${isDone ? "bg-teal text-paper" : isNext ? "border-2 border-teal text-teal" : "border border-line text-ink-2"}`} aria-label={isDone ? "done" : isNext ? "next" : "not yet"}>
                {isDone ? "✓" : i + 1}
              </div>
              <div>
                <p className="font-serif text-xl">{s.title} <span className="font-sans text-sm text-ink-3">· {s.minutes} min</span></p>
                <p className="mt-1 text-[15px]">{s.what}</p>
                <p className="mt-1 text-[15px] text-ink-2">{s.why}</p>
              </div>
              <div className="sm:text-right">
                <Link href={s.href} className={`inline-block rounded-sm px-3 py-1.5 text-sm no-underline ${isNext ? "bg-teal text-paper hover:opacity-90" : "border border-line hover:border-teal"}`}>
                  {isDone ? "Open again" : s.cta}
                </Link>
                {isDone ? <p className="mt-1 text-xs text-ink-3">done</p> : null}
              </div>
            </li>
          );
        })}
      </ol>

      <section id="understand" className="mt-14 scroll-mt-24 border-t border-line pt-8">
        <p className="signpost">Step 1 · the two-minute version</p>
        <h2 className="mt-1 text-3xl">What Geopolitica does</h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-line p-5">
            <p className="font-serif text-xl">1. An event becomes a report</p>
            <p className="mt-2 text-[15px] text-ink-2">
              Every event that matters gets a dossier in layers: a 30-second card with the one number and the ripple map, a
              5-minute brief with the same signposts every time (what happened, why it matters, who wins and loses, what is
              next), deep-dive modules you open only if you need them, and an evidence layer with every source and a
              confidence label per claim.
            </p>
          </div>
          <div className="rounded-lg border border-line p-5">
            <p className="font-serif text-xl">2. Consequences become dated changes</p>
            <p className="mt-2 text-[15px] text-ink-2">
              From each report we extract the things that will actually land on a company: a regulation with an effective
              date, a tariff, a strike window, a chokepoint, an energy shock. Each carries countries, HS codes, lanes and
              a severity. That calendar is the change radar.
            </p>
          </div>
          <div className="rounded-lg border border-line p-5">
            <p className="font-serif text-xl">3. Changes meet your footprint</p>
            <p className="mt-2 text-[15px] text-ink-2">
              You share suppliers, parts, lanes and sites. The engine matches them against the radar, scores each exposure
              (severity × closeness × your spend at risk) and writes a brief per department: what changes, when, your
              exposure, the cost if unprepared, the next action and who owns it.
            </p>
          </div>
        </div>
        <p className="mt-5 max-w-prose text-[15px] text-ink-2">
          Nothing is stored server-side: the engine answers and forgets. Every number links to its source. Forecasts are
          dated and graded in public as events resolve. <Link href="/method" className="text-teal hover:underline">How we work</Link>.
        </p>
      </section>

      <section id="rhythm" className="mt-14 scroll-mt-24 border-t border-line pt-8">
        <p className="signpost">Step 6 · the cadence</p>
        <h2 className="mt-1 text-3xl">Set your rhythm</h2>
        <dl className="mt-5 grid gap-x-8 gap-y-4 text-[15px] sm:grid-cols-[10rem_1fr]">
          <dt className="font-medium">Weekly</dt>
          <dd className="text-ink-2">Read the leadership tab of your latest report: the top five exposures and their next actions. Ten minutes.</dd>
          <dt className="font-medium">When the radar moves</dt>
          <dd className="text-ink-2">A new dated change, or a developing situation that gets a date, is the trigger to re-run. The radar page says when it was last updated.</dd>
          <dt className="font-medium">When your footprint moves</dt>
          <dd className="text-ink-2">A new supplier, a lane change, a plant opening: re-upload the CSVs. Keep the files; the templates are stable.</dd>
          <dt className="font-medium">Each quarter</dt>
          <dd className="text-ink-2">Send each department its own tab. The briefs are written to be forwarded as they are.</dd>
        </dl>
        <p className="mt-5 max-w-prose text-[15px] text-ink-2">
          Coming next for the enterprise edition: saved footprints, alerts when a change touching you moves, and a public
          scorecard of past forecasts. Until then, this rhythm is the product.
        </p>
      </section>
    </div>
  );
}
