import { cacheLife } from "next/cache";
import type { Aspect, FuelSet } from "@/content/fueling";

/*
  The live layer the Atlas builds every 20 minutes (ripples.json: each event's pulse, latest
  headlines, "what changed" line, ripples incoming and what's fueling it). The enterprise
  edition reads it from the published Atlas rather than from its own build, so it stays as
  fresh as the Atlas without redeploying. Cached here for a few minutes.
*/
const ATLAS = (process.env.ATLAS_URL || "https://neel8636.github.io/Geopolitica").replace(/\/$/, "");

export interface LiveCard {
  id: string;
  title: string;
  kicker?: string;
  headline: string;
  pulse: { day: number; perDay: number; trend: "rising" | "steady" | "cooling" | "quiet" };
  recent: { title: string; publisher: string; url: string; published: string }[];
  update?: { at: string; text: string; sources: { title: string; url: string; publisher: string }[]; headline?: string; quick?: { happened: string; matters: string; next: string } };
  incoming?: { id: string; title: string; day: number; via?: string; aspect?: Aspect }[];
  fuel?: FuelSet;
}
export type { Aspect };

export async function liveCards(): Promise<Record<string, LiveCard>> {
  "use cache";
  cacheLife("minutes");
  try {
    const r = await fetch(`${ATLAS}/ripples.json`);
    if (!r.ok) return {};
    return (await r.json()) as Record<string, LiveCard>;
  } catch {
    return {};
  }
}

export async function liveCard(id: string): Promise<LiveCard | undefined> {
  "use cache";
  cacheLife("minutes");
  return (await liveCards())[id];
}

/* Today's ripples as the Atlas picked them on its last run (live.json). */
export async function liveToday(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  try {
    const r = await fetch(`${ATLAS}/live.json`);
    if (!r.ok) return [];
    return ((await r.json()) as { today?: string[] }).today ?? [];
  } catch {
    return [];
  }
}
