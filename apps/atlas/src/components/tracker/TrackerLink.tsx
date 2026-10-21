"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useTracker } from "@/components/tracker/FollowProvider";

// The header's way into the tracker, with a count of what is new on what you follow.
export default function TrackerLink() {
  const t = useTracker();
  const n = t?.totalNew ?? 0;
  return (
    <Link href="/tracker" data-spotlight="tracker" className="relative inline-flex items-center gap-1 no-underline hover:underline">
      <Bookmark size={15} aria-hidden /> Tracker
      {n > 0 ? (
        <span className="ml-0.5 rounded-full bg-amber px-1.5 text-[11px] font-medium leading-[18px] text-paper" aria-label={`${n} new`}>
          {n > 99 ? "99+" : n}
        </span>
      ) : null}
    </Link>
  );
}
