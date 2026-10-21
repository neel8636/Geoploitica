import type { ReactNode } from "react";

/*
  The building blocks that keep a report easy to follow: a big numbered chapter heading, a
  fold that opens one module at a time, and a paragraph whose first sentence is bold so a
  reader can skim the leads. SHARED FILE (npm run sync:shared in apps/atlas).
*/

export function Chapter({ n, id, title, minutes, lead, children }: { n: number; id: string; title: string; minutes?: number; lead?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 pt-12 first:pt-4">
      <div className="flex items-center gap-3 border-b-2 border-gold/60 pb-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold font-serif text-xl font-semibold text-paper" aria-hidden>
          {n}
        </span>
        <div className="min-w-0">
          <h2 className="text-[1.7rem] leading-tight sm:text-[2rem]">{title}</h2>
          {lead || minutes ? (
            <p className="mt-0.5 text-sm text-ink-2">
              {lead}
              {lead && minutes ? " · " : ""}
              {minutes ? `about ${minutes} min` : ""}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/* A sub-heading inside a chapter: short, bold, with a small marker so it stands out. */
export function Sub({ id, children, icon }: { id?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <h3 id={id} className="mb-3 flex scroll-mt-28 items-center gap-2 text-xl leading-snug" style={{ fontFamily: "var(--font-sans)", fontWeight: 650 }}>
      {icon ?? <span className="inline-block h-4 w-1.5 rounded-full bg-gold" aria-hidden />}
      {children}
    </h3>
  );
}

/* One module, closed until the reader wants it. The summary line says what is inside. */
export function Fold({ id, title, teaser, children, open = false }: { id: string; title: string; teaser?: string; children: ReactNode; open?: boolean }) {
  return (
    <details id={id} open={open} className="group scroll-mt-28 rounded-xl border border-line bg-paper open:border-ink-3">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-2 transition-transform group-open:rotate-90" aria-hidden>
          ›
        </span>
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold leading-snug">{title}</span>
          {teaser ? <span className="block text-[13.5px] text-ink-2">{teaser}</span> : null}
        </span>
      </summary>
      <div className="border-t border-line-2 px-4 pb-5 pt-4">{children}</div>
    </details>
  );
}

/* A paragraph with its first sentence in bold, so the point comes first. */
export function Lead({ text }: { text: string }) {
  const m = text.match(/^(.+?[.!?])(\s+)([\s\S]*)$/);
  if (!m) return <p className="leading-relaxed">{text}</p>;
  return (
    <p className="leading-relaxed">
      <strong className="font-semibold text-ink">{m[1]}</strong> <span className="text-ink-2">{m[3]}</span>
    </p>
  );
}
