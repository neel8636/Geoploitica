import type { Metadata } from "next";
import Link from "next/link";
import { listDossiers, formatDate } from "@/content/dossiers";
import { ImpactMeter } from "@/components/dossier/Primitives";

export const metadata: Metadata = { title: "Dossiers" };

export default function DossiersPage() {
  const dossiers = listDossiers();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl">Dossiers</h1>
      <p className="prose-dossier mt-2 text-ink-2">
        One living page per event. Developing dossiers update as the story moves; the change log shows what changed and when.
      </p>
      <ul className="mt-8 divide-y divide-line-2 border-t border-line">
        {dossiers.map((d) => (
          <li key={d.slug} className="py-6">
            <Link href={`/dossiers/${d.slug}`} className="no-underline">
              <p className="text-sm text-ink-2">
                {d.region} · {d.status === "developing" ? "Developing" : "Stable"} · updated {formatDate(d.updated)}
              </p>
              <p className="mt-1 font-serif text-2xl hover:underline">{d.title}</p>
              <p className="mt-1 max-w-prose text-ink-2">{d.deck}</p>
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-ink-2">
              <ImpactMeter level={d.card.impactMeter} />
              <span>{d.readingMinutes.card} / {d.readingMinutes.brief} / {d.readingMinutes.deep} min by layer</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
