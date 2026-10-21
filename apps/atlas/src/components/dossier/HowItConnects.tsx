import type { ConnRow } from "@/content/connections";

/*
  "How it connects", inside the report: every connection of the event told step by step, in
  plain words, with what to watch. The map shows only the hook and the first step; the whole
  chain is here, behind the free account like the rest of the report. The page passes the
  rows in (connectionsFor, server side), so the chains are not part of any browser code.
  SHARED FILE: both editions run it (npm run sync:shared in apps/atlas).
*/
export default function HowItConnects({ rows }: { rows?: ConnRow[] }) {
  if (!rows?.length) return null;
  return (
    <section id="how-it-connects" className="scroll-mt-24 border-t border-line pt-10">
      <p className="signpost">How it connects</p>
      <h2 className="mt-1 text-3xl">Step by step, every thread</h2>
      <p className="prose-dossier mt-2 text-ink-2">
        {rows.length} connection{rows.length > 1 ? "s" : ""}, each told from cause to effect, with the one thing to watch next.
      </p>
      <div className="mt-6 space-y-6">
        {rows.map((r) => {
          const dashed = r.kind === "shares_driver" || r.kind === "competes_with";
          return (
            <article key={r.id} id={`via-${r.id}`} className="scroll-mt-24 rounded-lg border border-line p-4 sm:p-5">
              <p className="text-sm text-ink-2">
                <span className="font-medium text-ink">{r.from}</span> {dashed ? "┄" : r.flow === "both" ? "⇄" : "→"}{" "}
                <span className="font-medium text-ink">{r.to}</span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">
                {dashed ? (
                  "Same driver: neither caused the other"
                ) : (
                  <>
                    <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: `var(--${r.family})` }} aria-hidden />
                    <b className="font-semibold" style={{ color: `var(--${r.family})` }}>{r.family[0].toUpperCase() + r.family.slice(1)}</b> · {r.label}
                    {r.via ? ` · moves in: ${r.via}` : ""}
                  </>
                )}
              </p>
              <p className="mt-2 font-serif text-xl leading-snug">{r.line}</p>
              <ol className="mt-3 space-y-2">
                {r.steps.map((st, i) => (
                  <li key={i} className="flex gap-2.5 text-[15px] leading-snug">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[13px] font-semibold text-paper">{i + 1}</span>
                    <span>{st}</span>
                  </li>
                ))}
              </ol>
              {r.watch ? (
                <p className="mt-3 rounded-sm bg-paper-2 px-3 py-2 text-[14px]">
                  <span className="font-medium">Watch: </span>
                  {r.watch}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
