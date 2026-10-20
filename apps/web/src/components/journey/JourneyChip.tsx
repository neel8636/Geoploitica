"use client";

import Link from "next/link";
import { useJourney } from "@/lib/journey";

/*
  Header progress: "Get started" for a newcomer, "Journey 3/6" while it is under way,
  nothing once it is complete. Always a link to the journey page.
*/
export default function JourneyChip() {
  const { done, total, started } = useJourney();
  if (done >= total) return null;
  return (
    <Link href="/get-started" className="flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm no-underline hover:border-teal">
      {started ? (
        <>
          <span className="flex gap-0.5" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-1.5 w-2.5 rounded-sm ${i < done ? "bg-teal" : "bg-line"}`} />
            ))}
          </span>
          <span>
            Journey {done}/{total}
          </span>
        </>
      ) : (
        <span>Get started</span>
      )}
    </Link>
  );
}
