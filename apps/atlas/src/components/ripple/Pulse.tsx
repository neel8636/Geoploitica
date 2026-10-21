"use client";

import { TrendingDown, TrendingUp, Minus, Moon } from "lucide-react";
import type { Pulse } from "@/content/ripples";

// How fast an event's news is moving: rising, steady, cooling or quiet, with today's count.
export function PulseBadge({ pulse }: { pulse: Pulse }) {
  const map = {
    rising: { Icon: TrendingUp, cls: "border-amber text-amber", word: "Rising" },
    steady: { Icon: Minus, cls: "border-line text-ink-2", word: "Steady" },
    cooling: { Icon: TrendingDown, cls: "border-line text-ink-2", word: "Cooling" },
    quiet: { Icon: Moon, cls: "border-line text-ink-3", word: "Quiet" },
  }[pulse.trend];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${map.cls}`}
      title={`${pulse.day} headlines in the last 24 hours, against ${pulse.perDay} a day over the three days before`}
    >
      <map.Icon size={13} aria-hidden /> {map.word} · {pulse.day} today
    </span>
  );
}

export function timeAgo(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} days ago`;
}
