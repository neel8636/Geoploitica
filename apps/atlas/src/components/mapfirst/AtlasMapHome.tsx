"use client";

import { useCallback } from "react";
import MapFirst, { type CardLite, type FuelLite, type ReportSize } from "@/components/mapfirst/MapFirst";
import { loadRipples } from "@/components/ripple/RippleProvider";
import { useTracker } from "@/components/tracker/FollowProvider";
import FollowButton from "@/components/tracker/FollowButton";
import { AskButton } from "@/components/ask/AskProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import SignInGate from "@/components/auth/SignInGate";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/* The Atlas's map-first home: the shared map, with the reader's tracker, Follow and Ask. */
export default function AtlasMapHome({
  fuel,
  pulse,
  today,
}: {
  fuel: Record<string, FuelLite[]>;
  pulse: Record<string, { trend: string; day: number }>;
  today: { id: string; headline: string }[];
}) {
  const t = useTracker();
  const a = useAuth();
  const signedIn = !a.enabled || Boolean(a.user && a.profileComplete);
  const loadCards = useCallback(() => loadRipples() as unknown as Promise<Record<string, CardLite>>, []);
  const eventHref = useCallback((id: string) => `${BASE}/events/${id}/`, []);
  const reportHref = useCallback((id: string, size: ReportSize) => `${BASE}/events/${id}/?size=${size}#report`, []);
  const actions = useCallback(
    (id: string) => (
      <>
        <FollowButton id={id} compact />
        <AskButton eventId={id} compact />
      </>
    ),
    [],
  );
  return (
    <MapFirst
      fuel={fuel}
      pulse={pulse}
      today={today}
      loadCards={loadCards}
      eventHref={eventHref}
      reportHref={reportHref}
      actions={actions}
      following={(t?.state.follows ?? []).filter((f) => !f.startsWith("driver:"))}
      buildNote="3 reports a day for each account."
      buildGate={signedIn ? undefined : <SignInGate what="build a report" />}
    />
  );
}
