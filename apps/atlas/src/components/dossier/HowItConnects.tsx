import type { ConnRow } from "@/content/connections";
import FamIcon from "@/components/mapfirst/FamIcon";
import type { Family } from "@/content/fueling";

/*
  "How it connects", inside the report: every connection of the event, one fold each. Closed,
  a fold shows the two events, what moves between them and the connection in one sentence;
  open, the chain step by step and what to watch. The page passes the rows in
  (connectionsFor, server side), so the chains are not part of any browser code.
  SHARED FILE (npm run sync:shared in apps/atlas).
*/
export default function HowItConnects({ rows }: { rows?: ConnRow[] }) {
  if (!rows?.length) return null;
  return (
    <div className="space-y-3">
      {rows.map((r, i) => {
        const dashed = r.kind === "shares_driver" || r.kind === "competes_with";
        return (
          <details key={r.id} id={`via-${r.id}`} open={i === 0} className="group scroll-mt-28 rounded-xl border border-line open:border-ink-3">
            <summary className="flex cursor-pointer list-none gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
              {dashed ? (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-ink-3 text-ink-2" aria-hidden>┄</span>
              ) : (
                <FamIcon f={r.family as Family} size={28} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] text-ink-2">
                  {r.from} <span className="text-gold">{dashed ? "┄" : r.flow === "both" ? "⇄" : "→"}</span> {r.to}
                </span>
                <span className="mt-0.5 block text-[16.5px] font-semibold leading-snug">{r.line}</span>
                <span className="mt-0.5 block text-xs" style={{ color: dashed ? undefined : `var(--${r.family})` }}>
                  {dashed ? "Same driver: neither caused the other" : `${r.family[0].toUpperCase() + r.family.slice(1)} · ${r.label}${r.via ? ` · moves in: ${r.via}` : ""}`}
                </span>
              </span>
              <span className="mt-1 shrink-0 text-ink-3 transition-transform group-open:rotate-90" aria-hidden>›</span>
            </summary>
            <div className="border-t border-line-2 px-4 pb-4 pt-3">
              <ol className="space-y-2.5">
                {r.steps.map((st, k) => (
                  <li key={k} className="flex gap-3 text-[15.5px] leading-snug">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[12px] font-semibold text-paper">{k + 1}</span>
                    <span>{st}</span>
                  </li>
                ))}
              </ol>
              {r.watch ? (
                <p className="mt-3 rounded-lg bg-paper-2 px-3 py-2 text-[14.5px]">
                  <span className="font-semibold">Watch: </span>
                  {r.watch}
                </p>
              ) : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}
