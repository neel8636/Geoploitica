import { DASHED_KINDS, getEvent, neighbours } from "@/content/events";
import { ASPECTS } from "@/content/fueling";
import { explainFor } from "@/content/explain";

/*
  "How it connects", inside the report: every connection of the event told step by step, in
  plain words, with what to watch. The map shows only the hook and the first step; the whole
  chain is here, behind the free account like the rest of the report.
  SHARED FILE: both editions run it (npm run sync:shared in apps/atlas).
*/
export default function HowItConnects({ eventId }: { eventId: string }) {
  if (!getEvent(eventId)) return null;
  const rows = neighbours(eventId)
    .map((n) => ({ n, ex: explainFor(eventId, n.event.id) }))
    .filter((r) => r.ex)
    // what feeds it first, then where it ripples, then the relatives
    .sort((a, b) => rank(a.n.flow, a.n.kind) - rank(b.n.flow, b.n.kind));
  if (!rows.length) return null;
  const me = getEvent(eventId)!;
  return (
    <section id="how-it-connects" className="scroll-mt-24 border-t border-line pt-10">
      <p className="signpost">How it connects</p>
      <h2 className="mt-1 text-3xl">Step by step, every thread</h2>
      <p className="prose-dossier mt-2 text-ink-2">
        {rows.length} connection{rows.length > 1 ? "s" : ""}, each told from cause to effect, with the one thing to watch next.
      </p>
      <div className="mt-6 space-y-6">
        {rows.map(({ n, ex }) => {
          const dashed = DASHED_KINDS.includes(n.kind);
          const [from, to] = n.flow === "in" ? [n.event.title, me.title] : [me.title, n.event.title];
          const fam = ASPECTS[n.aspect]?.family ?? "people";
          return (
            <article key={n.event.id} id={`via-${n.event.id}`} className="scroll-mt-24 rounded-lg border border-line p-4 sm:p-5">
              <p className="text-sm text-ink-2">
                <span className="font-medium text-ink">{from}</span> {dashed ? "┄" : n.flow === "both" ? "⇄" : "→"}{" "}
                <span className="font-medium text-ink">{to}</span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">
                {dashed ? (
                  "Same driver: neither caused the other"
                ) : (
                  <>
                    <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: `var(--${fam})` }} aria-hidden />
                    <b className="font-semibold" style={{ color: `var(--${fam})` }}>{fam[0].toUpperCase() + fam.slice(1)}</b> · {ASPECTS[n.aspect]?.label}
                    {n.via ? ` · moves in: ${n.via}` : ""}
                  </>
                )}
              </p>
              <p className="mt-2 font-serif text-xl leading-snug">{ex!.line}</p>
              <ol className="mt-3 space-y-2">
                {ex!.steps.map((st, i) => (
                  <li key={i} className="flex gap-2.5 text-[15px] leading-snug">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[13px] font-semibold text-paper">{i + 1}</span>
                    <span>{st}</span>
                  </li>
                ))}
              </ol>
              {ex!.watch ? (
                <p className="mt-3 rounded-sm bg-paper-2 px-3 py-2 text-[14px]">
                  <span className="font-medium">Watch: </span>
                  {ex!.watch}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function rank(flow: string, kind: string) {
  if (DASHED_KINDS.includes(kind as never)) return 3;
  return flow === "in" ? 0 : flow === "both" ? 1 : 2;
}
