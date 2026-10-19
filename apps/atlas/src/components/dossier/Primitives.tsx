import type { ReactNode } from "react";
import type { Source } from "@/content/types";

export function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-8 pb-10">
      <h2 className="text-2xl sm:text-[1.75rem]">{title}</h2>
      {lead ? <p className="prose-dossier mt-2 text-ink-2">{lead}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Signpost({ children }: { children: ReactNode }) {
  return <p className="signpost">{children}</p>;
}

export function ImpactMeter({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  const words = ["", "Minor", "Notable", "Significant", "Severe", "Systemic"];
  return (
    <div className="flex items-center gap-3" aria-label={`Impact ${level} of 5: ${words[level]}`}>
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className="block h-2.5 w-6 rounded-[2px]"
            style={{
              background: n <= level ? (level >= 4 ? "var(--amber)" : "var(--teal)") : "var(--line)",
            }}
          />
        ))}
      </div>
      <span className="text-sm text-ink-2">
        Impact {level}/5, {words[level].toLowerCase()}
      </span>
    </div>
  );
}

export function SourceRef({ sources, index }: { sources: Source[]; index: number }) {
  const s = sources[index];
  if (!s) return null;
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noreferrer"
      className="ml-1 align-super text-[11px] text-teal no-underline hover:underline"
      title={`${s.publisher}: ${s.title}`}
    >
      [{index + 1}]
    </a>
  );
}

export function Pill({ tone, children }: { tone: "up" | "down" | "mixed" | "neutral"; children: ReactNode }) {
  const map = {
    up: "bg-green-2 text-green",
    down: "bg-red-2 text-red",
    mixed: "bg-amber-2 text-amber",
    neutral: "bg-paper-2 text-ink-2",
  } as const;
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 text-[13px] font-medium ${map[tone]}`}>{children}</span>
  );
}
