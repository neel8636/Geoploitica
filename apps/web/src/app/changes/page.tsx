import type { Metadata } from "next";
import ChangeRadar from "@/components/enterprise/ChangeRadar";
import JourneyMark from "@/components/journey/JourneyMark";

export const metadata: Metadata = { title: "Change radar" };

export default function ChangesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <JourneyMark step="radar" />
      <h1 className="text-4xl">Change radar</h1>
      <p className="prose-dossier mt-3 text-ink-2">
        Dated regulations, trade measures, strikes and developing situations that can reach a supply chain, sorted by when they bite.
        This is the calendar the company reports are matched against.
      </p>
      <div className="mt-8"><ChangeRadar /></div>
    </div>
  );
}
