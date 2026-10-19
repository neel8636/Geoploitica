"use client";

import { useState } from "react";
import { analyzeCsv, analyzeFootprint, type AnalysisResult, type Footprint } from "@/lib/engine";
import Results from "./Results";

type Status = "idle" | "running" | "done" | "error";

/*
  Level-1 and level-2 onboarding: a supplier list is enough to start; parts, lanes and sites deepen it.
  Nothing leaves the browser except the files you submit, and the engine keeps nothing after it answers.
*/
export default function Analyzer() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [company, setCompany] = useState({ name: "", currency: "EUR", home: "DE" });

  async function runSample() {
    setStatus("running");
    setError("");
    try {
      const fp = (await (await fetch("/samples/nordwerk.json")).json()) as Footprint;
      const r = await analyzeFootprint(fp);
      setCompany({ name: fp.company_name, currency: fp.currency, home: fp.home_country });
      setResult(r);
      setStatus("done");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }

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
      setStatus("done");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }

  if (status === "done" && result) {
    return (
      <div>
        <button type="button" onClick={() => { setResult(null); setStatus("idle"); }} className="mb-6 text-sm text-ink-2 hover:underline">
          Start over with different data
        </button>
        <Results result={result} currency={company.currency} companyName={company.name} />
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
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

        <FileField name="suppliers" label="Suppliers" required hint="id, name, country, region, tier, category, annual_spend, single_source" />
        <FileField name="parts" label="Parts" hint="id, name, hs_code, supplier_ids (pipe-separated), origin_country, annual_volume_value, critical" />
        <FileField name="lanes" label="Shipping lanes" hint="id, origin_country, destination_country, mode, via (chokepoints, pipe-separated), annual_shipments, lead_time_days" />
        <FileField name="sites" label="Sites" hint="id, name, country, type, headcount" />

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

      <aside className="rounded-lg border border-line bg-paper-2 p-5 text-[15px]">
        <p className="font-medium">No data to hand? Try the sample company.</p>
        <p className="mt-1 text-ink-2">
          Nordwerk Industrial GmbH is a fictional German manufacturer with 12 suppliers in five countries, rubber and steel imports, a sea lane through the Red Sea, and a plant in France.
        </p>
        <button type="button" onClick={runSample} disabled={status === "running"} className="mt-3 rounded-sm border border-teal px-4 py-2 text-teal hover:bg-teal-2 disabled:opacity-60">
          {status === "running" ? "Analysing…" : "Run the sample"}
        </button>
        <div className="mt-6 space-y-2 text-sm text-ink-2">
          <p className="font-medium text-ink">What happens to your data</p>
          <p>Files go to the impact engine for this one request and are not stored. Share only what you are comfortable with: a supplier list with countries is enough for a first report.</p>
          <p>Every alert shows its source and confidence. Scores follow a published formula so your own team can check them.</p>
        </div>
      </aside>
    </div>
  );
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
