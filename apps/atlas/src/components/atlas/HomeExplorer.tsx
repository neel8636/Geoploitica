"use client";

import { useState } from "react";
import WorldMap, { VIEWS, type View, type FuelDots } from "@/components/WorldMap";

/*
  The front-page map with the "start from a region" chips above it. The chips own the frame
  so the invitation and the map agree; every event stays drawn whichever frame is chosen.
*/
export default function HomeExplorer({ pulse, fuel }: { pulse?: Record<string, "rising" | "steady" | "cooling" | "quiet">; fuel?: FuelDots }) {
  const [view, setView] = useState<View>("world");
  const chip = (v: View) =>
    `rounded-full border px-3 py-1 text-sm ${view === v ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="signpost mr-1">Start from a region</span>
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <button key={v} type="button" className={chip(v)} onClick={() => setView(v)}>
            {VIEWS[v].label}
          </button>
        ))}
      </div>
      <div className="mt-3" data-spotlight="map">
        <WorldMap view={view} onView={setView} hideFrames pulse={pulse} fuel={fuel} />
      </div>
    </div>
  );
}
