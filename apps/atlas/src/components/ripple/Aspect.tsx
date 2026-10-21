"use client";

import { Banknote, Briefcase, Fuel, Home, Landmark, Shield, Ship, TrendingUp, Users, Vote, Wheat, type LucideIcon } from "lucide-react";
import { ASPECTS, FAMILY_LABEL, type Aspect, type Family } from "@/content/fueling";

// One icon per aspect of the economy; the colour is its family (money, goods, people).
export const ASPECT_ICON: Record<Aspect, LucideIcon> = {
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
export const FAMILY_ICON: Record<Family, LucideIcon> = { money: Banknote, goods: Ship, people: Users };
export const familyOf = (a: Aspect): Family => ASPECTS[a]?.family ?? "people";
export const familyColor = (f: Family) => `var(--${f})`;

export function AspectBadge({ aspect, withLabel = true, size = 13 }: { aspect: Aspect; withLabel?: boolean; size?: number }) {
  const fam = familyOf(aspect);
  const Icon = ASPECT_ICON[aspect] ?? Vote;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
      <span className="inline-flex shrink-0 items-center justify-center rounded-full text-white ring-1 ring-ink/30" style={{ background: familyColor(fam), width: size + 9, height: size + 9 }} aria-hidden>
        <Icon size={size} strokeWidth={2.2} />
      </span>
      {withLabel ? (
        <span>
          <span className="font-medium text-ink">{FAMILY_LABEL[fam]}</span> · {ASPECTS[aspect]?.label}
        </span>
      ) : null}
    </span>
  );
}

/* The three families, for keys: "Moving in: Money · Goods · People". */
export function FamilyKey({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2 ${className}`}>
      {(Object.keys(FAMILY_LABEL) as Family[]).map((f) => {
        const Icon = FAMILY_ICON[f];
        return (
          <span key={f} className="inline-flex items-center gap-1">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full text-white ring-1 ring-ink/30" style={{ background: familyColor(f) }} aria-hidden>
              <Icon size={10} strokeWidth={2.4} />
            </span>
            {FAMILY_LABEL[f]}
          </span>
        );
      })}
    </span>
  );
}
