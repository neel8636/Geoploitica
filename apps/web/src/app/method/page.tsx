import type { Metadata } from "next";

export const metadata: Metadata = { title: "How we work" };

export default function MethodPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl">How we work</h1>
      <div className="prose-dossier mt-6 space-y-6">
        <section>
          <h2 className="text-2xl">Sources come in tiers</h2>
          <p>Tier one is primary data: statistics offices, central banks, ministries, treaty texts and company filings. Tier two is wire services and established outlets. Tier three is commentary and market blogs. Headline numbers use tiers one and two only. Where sources disagree we show the range rather than pick a number.</p>
        </section>
        <section>
          <h2 className="text-2xl">Facts and judgement stay apart</h2>
          <p>Each dossier labels what is sourced and what is our view. Scenario probabilities and predictions are judgement calls and say so. Every claim in the evidence layer carries a confidence label.</p>
        </section>
        <section>
          <h2 className="text-2xl">Forecasts are graded</h2>
          <p>Every prediction has a date on which it can be resolved. Once it resolves we grade it, publish the result and keep the misses visible. A scorecard page will list every call once there are enough to score.</p>
        </section>
        <section>
          <h2 className="text-2xl">AI drafts, a person signs off</h2>
          <p>Language models help gather sources and draft modules against a fixed template. A person checks every number against its source, reviews tone and legal risk, and signs off before anything is published. The same change calendar feeds both the public dossiers and the company reports.</p>
        </section>
        <section>
          <h2 className="text-2xl">What this is not</h2>
          <p>Decision support, not advice. Nothing here is investment, legal or tax advice. Company reports show their assumptions and ranges so that the people who know the business can check them.</p>
        </section>
      </div>
    </div>
  );
}
