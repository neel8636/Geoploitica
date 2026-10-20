"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { analyzeCsv, analyzeFootprint, type AnalysisResult, type Department, type Footprint } from "@/lib/engine";
import Results from "./Results";
import Tour, { type TourStep } from "./Tour";
import { markStep } from "@/lib/journey";

type Status = "idle" | "running" | "done" | "error";
const TOUR_SEEN_KEY = "geoploitica.tour.enterprise.v1";

/*
  Level-1 and level-2 onboarding: a supplier list is enough to start; parts, lanes and sites deepen it.
  Nothing leaves the browser except the files you submit, and the engine keeps nothing after it answers.
  A guided walkthrough takes a manager from "what to prepare" through a sample run to each part of the report.
*/
export default function Analyzer() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [company, setCompany] = useState({ name: "", currency: "EUR", home: "DE" });
  const [dept, setDept] = useState<Department | "leadership">("leadership");

  const [tourOn, setTourOn] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [tourBusy, setTourBusy] = useState(false);
  // First-visit offer, read from localStorage without a hydration mismatch.
  const [dismissed, setDismissed] = useState(false);
  const seen = useSyncExternalStore(subscribeNoop, readSeen, () => true);
  const offerTour = !seen && !dismissed;
  const setOfferTour = (v: boolean) => setDismissed(!v);
  const resultsRef = useRef<HTMLDivElement>(null);

  function markTourSeen() {
    try { localStorage.setItem(TOUR_SEEN_KEY, "1"); } catch {}
    setOfferTour(false);
  }

  async function runSample() {
    setStatus("running");
    setError("");
    try {
      const fp = (await (await fetch("/samples/nordwerk.json")).json()) as Footprint;
      const r = await analyzeFootprint(fp);
      setCompany({ name: fp.company_name, currency: fp.currency, home: fp.home_country });
      setResult(r);
      setDept("leadership");
      setStatus("done");
      markStep("sample");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
      throw e;
    }
  }

  // Arriving on /enterprise#sample (from the journey) runs the sample at once.
  useEffect(() => {
    if (window.location.hash !== "#sample") return;
    const t = setTimeout(() => {
      runSample().catch(() => {});
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = new FormData(ev.currentTarget);
    const suppliers = form.get("suppliers") as File | null;
    if (!suppliers || suppliers.size === 0) {
      setError("A suppliers CSV is required.");
      setStatus("error");
      return;
    }
    setStatus("running");
    setError("");
    try {
      const r = await analyzeCsv(form);
      setCompany({
        name: String(form.get("company_name") || "Your company"),
        currency: String(form.get("currency") || "EUR"),
        home: String(form.get("home_country") || ""),
      });
      setResult(r);
      setDept("leadership");
      setStatus("done");
      markStep("own-data");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }

  function startTour() {
    setTourIndex(0);
    setTourOn(true);
    setOfferTour(false);
  }

  function closeTour() {
    setTourOn(false);
    markTourSeen();
  }

  // The walkthrough script. Form steps run first; if no report exists yet, step 3 runs the sample.
  const formSteps: TourStep[] = [
    {
      target: "company",
      title: "Tell us who you are",
      body: "Company name, the currency you report in, and the country you are based in. That is all the engine needs to know about the company itself.",
    },
    {
      target: "suppliers",
      title: "Your supplier list is enough to start",
      body: "One CSV with supplier id, name, country and tier. Add spend and single-source flags if you have them; they sharpen the scores. Parts with HS codes, lanes and sites are optional and add more matches.",
    },
    {
      target: "sample",
      title: "See it on a sample company first",
      body: "Nordwerk is a fictional German manufacturer with suppliers in five countries, rubber and steel imports and a sea lane through the Red Sea. We will run its report now; your own data works the same way.",
      cta: "Run the sample and continue",
      handoff: true,
      action: async () => {
        setTourBusy(true);
        try { await runSample(); } finally { setTourBusy(false); }
      },
    },
  ];

  const resultSteps: TourStep[] = [
    {
      target: "summary",
      title: "The headline",
      body: "How many coming changes touch your footprint, how many suppliers they reach, and how much spend and volume sits in their path. Read this first; the rest explains it.",
    },
    {
      target: "countries",
      title: "Where the risk sits",
      body: "Each bar is your spend in one country. The colour is the worst change touching it: teal is manageable, amber needs a plan, red needs action this quarter.",
      placement: "right",
    },
    {
      target: "radar",
      title: "When each change lands",
      body: "Dated changes on one time axis, left to right from today. Bigger dots carry higher scores. Undated, developing situations are listed below the axis.",
    },
    {
      target: "departments",
      title: "Pick your department",
      body: "Leadership sees the top five across the company. Every other tab is written for one function. We will open Logistics next.",
      cta: "Open Logistics",
      action: async () => {
        const target = result?.briefs.some((b) => b.department === "logistics") ? "logistics" : result?.briefs[0]?.department ?? "leadership";
        setDept(target as Department);
        await new Promise((r) => setTimeout(r, 250));
      },
    },
    {
      target: "brief",
      title: "Read one brief",
      body: "Five fixed lines: what changes, your exposure, the cost if unprepared, the next action with an owner, and who else to notify. The bar under the headline is the score; the sources at the bottom are where the facts came from.",
    },
    {
      target: "exposures",
      title: "Check the working",
      body: "Every supplier, part, lane, site and market that matched a change, with the reason and the score. If a row looks wrong, the data behind it is wrong; fix the CSV and run again.",
      placement: "above",
    },
    {
      target: "restart",
      title: "Now run it on your own supply chain",
      body: "Start over, upload your supplier list, and the same report is built from your footprint. Nothing you upload is stored after the request.",
      placement: "below",
    },
  ];

  // When the tour started on the form, it continues on the results once the sample finishes.
  const prevResult = useRef<AnalysisResult | null>(null);
  useEffect(() => {
    if (tourOn && result && !prevResult.current) setTourIndex(0);
    prevResult.current = result;
  }, [result, tourOn]);

  const stageSteps: TourStep[] = result ? resultSteps : formSteps;
  const stageOffset = result ? formSteps.length : 0;
  const totalSteps = formSteps.length + resultSteps.length;

  if (status === "done" && result) {
    return (
      <div ref={resultsRef}>
        <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
          <button type="button" data-tour="restart" onClick={() => { setResult(null); setStatus("idle"); setTourOn(false); }} className="text-ink-2 hover:underline">
            Start over with different data
          </button>
          {!tourOn ? (
            <button type="button" onClick={() => { setTourOn(true); setTourIndex(0); }} className="rounded-sm border border-teal px-3 py-1 text-teal hover:bg-teal-2">
              Walk me through this report
            </button>
          ) : null}
        </div>
        <Results result={result} currency={company.currency} companyName={company.name} dept={dept} onDept={setDept} />
        {tourOn ? <Tour steps={stageSteps} index={tourIndex} onIndex={setTourIndex} onClose={closeTour} busy={tourBusy} offset={stageOffset} total={totalSteps} /> : null}
      </div>
    );
  }

  return (
    <div>
      {offerTour && !tourOn ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal bg-teal-2/40 p-4 text-[15px]">
          <div>
            <p className="font-medium">First time here? Take the three-minute walkthrough.</p>
            <p className="text-ink-2">Ten steps: what to prepare, a sample report, and how to read each part of it.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={startTour} className="rounded-sm bg-teal px-3 py-1.5 text-paper hover:opacity-90">Start the walkthrough</button>
            <button type="button" onClick={markTourSeen} className="rounded-sm border border-line px-3 py-1.5 hover:border-teal">Not now</button>
          </div>
        </div>
      ) : null}
      {!offerTour && !tourOn ? (
        <button type="button" onClick={startTour} className="mb-6 text-sm text-teal hover:underline">Show the walkthrough</button>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3" data-tour="company">
            <label className="block text-sm">
              <span className="text-ink-2">Company name</span>
              <input name="company_name" required className="mt-1 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base" placeholder="Nordwerk Industrial GmbH" />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Reporting currency</span>
              <input name="currency" required pattern="[A-Z]{3}" defaultValue="EUR" className="mt-1 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base uppercase" />
            </label>
            <label className="block text-sm">
              <span className="text-ink-2">Home country</span>
              <input name="home_country" required pattern="[A-Z]{2}" defaultValue="DE" className="mt-1 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base uppercase" placeholder="ISO-2" />
            </label>
          </div>

          <div data-tour="suppliers" className="space-y-5">
            <FileField name="suppliers" label="Suppliers" required hint="id, name, country, region, tier, category, annual_spend, single_source" />
            <FileField name="parts" label="Parts" hint="id, name, hs_code, supplier_ids (pipe-separated), origin_country, annual_volume_value, critical" />
            <FileField name="lanes" label="Shipping lanes" hint="id, origin_country, destination_country, mode, via (chokepoints, pipe-separated), annual_shipments, lead_time_days" />
            <FileField name="sites" label="Sites" hint="id, name, country, type, headcount" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={status === "running"} className="rounded-sm bg-teal px-4 py-2 text-paper hover:opacity-90 disabled:opacity-60">
              {status === "running" ? "Analysing…" : "Build my impact report"}
            </button>
            <a href="/samples/templates.zip" className="text-sm hover:underline">Download CSV templates</a>
          </div>
          {status === "error" ? (
            <p role="alert" className="rounded-sm border border-red bg-red-2 px-3 py-2 text-[15px]">{error}</p>
          ) : null}
        </form>

        <aside className="rounded-lg border border-line bg-paper-2 p-5 text-[15px]" data-tour="sample">
          <p className="font-medium">No data to hand? Try the sample company.</p>
          <p className="mt-1 text-ink-2">
            Nordwerk Industrial GmbH is a fictional German manufacturer with 12 suppliers in five countries, rubber and steel imports, a sea lane through the Red Sea, and a plant in France.
          </p>
          <button type="button" onClick={() => runSample().catch(() => {})} disabled={status === "running"} className="mt-3 rounded-sm border border-teal px-4 py-2 text-teal hover:bg-teal-2 disabled:opacity-60">
            {status === "running" ? "Analysing…" : "Run the sample"}
          </button>
          <div className="mt-6 space-y-2 text-sm text-ink-2">
            <p className="font-medium text-ink">What happens to your data</p>
            <p>Files go to the impact engine for this one request and are not stored. Share only what you are comfortable with: a supplier list with countries is enough for a first report.</p>
            <p>Every alert shows its source and confidence. Scores follow a published formula so your own team can check them.</p>
          </div>
        </aside>
      </div>

      {tourOn ? <Tour steps={stageSteps} index={tourIndex} onIndex={setTourIndex} onClose={closeTour} busy={tourBusy} offset={stageOffset} total={totalSteps} /> : null}
    </div>
  );
}

function subscribeNoop() { return () => {}; }
function readSeen(): boolean {
  try { return Boolean(localStorage.getItem(TOUR_SEEN_KEY)); } catch { return true; }
}

function FileField({ name, label, hint, required }: { name: string; label: string; hint: string; required?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="text-ink-2">{label}{required ? "" : " (optional)"}</span>
      <input type="file" name={name} accept=".csv,text/csv" required={required} className="mt-1 block w-full text-[15px] file:mr-3 file:rounded-sm file:border file:border-line file:bg-paper file:px-3 file:py-1.5 file:text-sm" />
      <span className="mt-1 block text-xs text-ink-3">Columns: {hint}</span>
    </label>
  );
}
