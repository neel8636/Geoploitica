"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useTracker } from "@/components/tracker/FollowProvider";

// Follow an event (or a driver: id "driver:<id>") into the reader's tracker.
export default function FollowButton({ id, label = "Follow", compact = false }: { id: string; label?: string; compact?: boolean }) {
  const t = useTracker();
  if (!t) return null;
  const on = t.isFollowing(id);
  const Icon = on ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      onClick={() => t.toggle(id)}
      aria-pressed={on}
      data-spotlight="follow"
      title={on ? "In your tracker. Click to stop following." : "Add to your tracker: see new headlines and changes in connected events"}
      className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-2 text-[15px] ${on ? "border-teal bg-teal-2 text-ink" : "border-line hover:border-ink"} ${compact ? "px-2.5 py-1 text-sm" : ""}`}
    >
      <Icon size={compact ? 15 : 17} className={on ? "text-teal" : ""} />
      {on ? "Following" : label}
    </button>
  );
}
