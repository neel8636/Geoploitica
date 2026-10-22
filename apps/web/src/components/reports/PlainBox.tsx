/*
  The "in plain words" box every report view opens with: a title, then two to three short
  paragraphs read as a chain (1 → 2 → 3), or three labelled lines for the quick take.
  SHARED FILE (npm run sync:shared in apps/atlas).
*/
export function PlainBox({ title, paras, kicker = "In plain words", chain = true }: { title: string; paras: string[]; kicker?: string; chain?: boolean }) {
  if (!paras.length) return null;
  return (
    <div className="rounded-2xl border border-gold/60 bg-paper-2 p-5 sm:p-6">
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-gold">{kicker}</p>
      <h2 className="mt-1.5 text-[1.45rem] leading-snug sm:text-[1.7rem]">{title}</h2>
      <ol className="mt-4">
        {paras.map((p, i) => (
          <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
            {chain && i < paras.length - 1 ? <span className="absolute left-[13px] top-8 bottom-1 w-px bg-gold/40" aria-hidden /> : null}
            {chain ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold text-sm font-semibold text-gold">{i + 1}</span>
            ) : (
              <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-gold" aria-hidden />
            )}
            <p className="pt-0.5 text-[17px] leading-relaxed">{p}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function QuickBox({ points, title, kicker = "In plain words" }: { points: { label: string; text: string }[]; title: string; kicker?: string }) {
  if (!points.length) return null;
  return (
    <div className="rounded-2xl border border-gold/60 bg-paper-2 p-5 sm:p-6">
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-gold">{kicker}</p>
      <h2 className="mt-1.5 text-[1.45rem] leading-snug sm:text-[1.7rem]">{title}</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {points.map((p) => (
          <div key={p.label} className="rounded-xl border border-line bg-paper p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-2">{p.label}</dt>
            <dd className="mt-1.5 text-[16px] leading-snug">{p.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
