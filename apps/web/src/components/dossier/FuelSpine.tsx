import { Briefcase, Fuel, Home, Landmark, Shield, Ship, TrendingUp, Users, Vote, Wheat, type LucideIcon } from "lucide-react";
import type { FuelAspect } from "@/content/types";
import { ASPECTS, FAMILY_LABEL } from "@/content/fueling";

/*
  The spine of a report: the parts of the economy feeding the event (money, goods, people),
  each with the concrete development behind it. Same colours and icons as the Atlas.
*/
const ICON: Record<FuelAspect["aspect"], LucideIcon> = {
  markets: TrendingUp,
  budget: Landmark,
  energy: Fuel,
  trade: Ship,
  food: Wheat,
  jobs: Briefcase,
  living: Home,
  politics: Vote,
  security: Shield,
  displacement: Users,
};

export default function FuelSpine({ fuel }: { fuel?: FuelAspect[] }) {
  if (!fuel?.length) return null;
  return (
    <div className="mt-6 rounded-lg border border-line p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-2">What&rsquo;s fueling it · this report is built around these</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {fuel.map((f) => {
          const fam = ASPECTS[f.aspect]?.family ?? "people";
          const Icon = ICON[f.aspect] ?? Vote;
          return (
            <li key={f.title} className="flex gap-2.5">
              <span
                className="mt-0.5 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: `var(--${fam})` }}
                title={`${FAMILY_LABEL[fam]} · ${ASPECTS[f.aspect]?.label}`}
                aria-label={`${FAMILY_LABEL[fam]}: ${ASPECTS[f.aspect]?.label}`}
              >
                <Icon size={12} strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="block font-medium leading-snug">{f.title}</span>
                <span className="block text-sm text-ink-2">{f.how}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
