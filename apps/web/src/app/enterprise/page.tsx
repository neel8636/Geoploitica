import type { Metadata } from "next";
import Analyzer from "@/components/enterprise/Analyzer";

export const metadata: Metadata = {
  title: "For your company",
  description: "Share your supply-chain footprint and get a brief for every department on the changes coming for it.",
};

export default function EnterprisePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl">What is coming for your supply chain, by department</h1>
      <p className="prose-dossier mt-3 text-ink-2">
        Share your footprint once. The engine matches every supplier, part, lane and site against the change calendar
        and writes a short brief for each department: what changes, when, what it costs if you are unprepared, who acts first.
      </p>
      <div className="mt-10">
        <Analyzer />
      </div>
    </div>
  );
}
