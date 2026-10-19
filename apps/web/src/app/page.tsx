import Link from "next/link";
import { listDossiers, formatDate } from "@/content/dossiers";
import RippleMap from "@/components/RippleMap";
import { ImpactMeter } from "@/components/dossier/Primitives";

export default function Home() {
  const [latest, ...rest] = listDossiers();
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-16">
        <div>
          <h1 className="text-[2.5rem] leading-[1.08] sm:text-[3.25rem]">
            One event. Every ripple. What you should be ready for.
          </h1>
          <p className="prose-dossier mt-5 text-ink-2">
            Geoploitica turns each major world event into a layered dossier: what happened, why,
            who wins and loses, what it costs you, and what to do before it lands. Read it in
            thirty seconds or fifteen minutes. Every number links to its source.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-[15px]">
            <Link href={`/dossiers/${latest.slug}`} className="rounded-sm bg-teal px-4 py-2 text-paper no-underline hover:opacity-90">
              Read the latest dossier
            </Link>
            <Link href="/enterprise" className="rounded-sm border border-line px-4 py-2 no-underline hover:border-teal">
              Run it on your supply chain
            </Link>
          </div>
        </div>
        <div>
          <RippleMap centre={latest.title} rings={latest.card.ripple} />
        </div>
      </section>

      <section className="border-t border-line py-10">
        <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
          <h2 className="text-2xl">Dossiers</h2>
          <ul className="divide-y divide-line-2">
            {[latest, ...rest].map((d) => (
              <li key={d.slug} className="py-5">
                <Link href={`/dossiers/${d.slug}`} className="no-underline">
                  <p className="text-sm text-ink-2">
                    {d.region} · {d.status === "developing" ? "Developing" : "Stable"} · updated {formatDate(d.updated)}
                  </p>
                  <p className="mt-1 font-serif text-2xl hover:underline">{d.title}</p>
                  <p className="mt-1 max-w-prose text-ink-2">{d.deck}</p>
                </Link>
                <div className="mt-3"><ImpactMeter level={d.card.impactMeter} /></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-line py-10">
        <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
          <h2 className="text-2xl">How a dossier works</h2>
          <div className="grid gap-6 text-[15px] sm:grid-cols-2">
            <div>
              <p className="font-medium">Four layers, your choice of depth</p>
              <p className="mt-1 text-ink-2">A 30-second card, a 5-minute brief with the same signposts every time, deep-dive modules you open only if you need them, and an evidence layer with every source and a confidence label on each claim.</p>
            </div>
            <div>
              <p className="font-medium">Predict, then read</p>
              <p className="mt-1 text-ink-2">Before the scenarios, you make a call. Then you see ours. Committing to a guess sharpens attention and memory.</p>
            </div>
            <div>
              <p className="font-medium">Forecasts on the record</p>
              <p className="mt-1 text-ink-2">Every probability and prediction is dated and graded publicly once the event resolves. Misses stay visible.</p>
            </div>
            <div>
              <p className="font-medium">Built for your company</p>
              <p className="mt-1 text-ink-2">Share your supplier list and the same engine tells each department which coming changes hit it, when, and what to do first.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
