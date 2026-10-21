"use client";

import { useCallback, type ReactNode } from "react";
import MapFirst, { type CardLite, type FuelLite, type ReportSize } from "@/components/mapfirst/MapFirst";

const ATLAS = (process.env.NEXT_PUBLIC_ATLAS_URL || "https://neel8636.github.io/Geopolitica").replace(/\/$/, "");

let cardsP: Promise<Record<string, CardLite>> | null = null;
function loadLive(): Promise<Record<string, CardLite>> {
  // the Atlas's live layer (refreshed every 20 minutes); GitHub Pages serves it to any origin
  if (!cardsP) {
    cardsP = fetch(`${ATLAS}/ripples.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .catch((err) => {
        cardsP = null;
        throw err;
      });
  }
  return cardsP;
}

/* The enterprise edition's front page: the same map as the Atlas, with a Tools tab. */
export default function WebMapHome({
  fuel,
  pulse,
  today,
  tools,
}: {
  fuel: Record<string, FuelLite[]>;
  pulse: Record<string, { trend: string; day: number }>;
  today: { id: string; headline: string }[];
  tools: ReactNode;
}) {
  const eventHref = useCallback((id: string) => `/events/${id}`, []);
  const reportHref = useCallback((id: string, size: ReportSize) => `/events/${id}?size=${size}#report`, []);
  return (
    <MapFirst
      fuel={fuel}
      pulse={pulse}
      today={today}
      loadCards={loadLive}
      eventHref={eventHref}
      reportHref={reportHref}
      extraTab={{ label: "Tools", content: tools }}
    />
  );
}
