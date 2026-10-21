"use client";

import type { FuelAspect } from "@/content/types";
import { AspectBadge } from "@/components/ripple/Aspect";

/*
  The spine of a report: the parts of the economy feeding the event, each with the concrete
  development behind it. Sits on the card, so the rest of the report reads against it.
*/
export default function FuelSpine({ fuel }: { fuel?: FuelAspect[] }) {
  if (!fuel?.length) return null;
  return (
    <div className="mt-6 rounded-lg border border-line p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-2">What&rsquo;s fueling it · this report is built around these</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {fuel.map((f) => (
          <li key={f.title} className="flex gap-2.5">
            <span className="mt-0.5"><AspectBadge aspect={f.aspect} withLabel={false} size={12} /></span>
            <span className="min-w-0">
              <span className="block font-medium leading-snug">{f.title}</span>
              <span className="block text-sm text-ink-2">{f.how}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
