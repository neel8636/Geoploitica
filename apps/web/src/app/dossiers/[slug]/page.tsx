import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JourneyMark from "@/components/journey/JourneyMark";
import { getDossier, listDossiers } from "@/content/dossiers";
import { getEvent } from "@/content/events";
import { DossierBody } from "@/components/dossier/DossierBody";
import GenerateReport from "@/components/reports/GenerateReport";

export function generateStaticParams() {
  return listDossiers().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata(props: PageProps<"/dossiers/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const d = getDossier(slug);
  return d ? { title: d.title, description: d.deck } : {};
}

export default async function DossierPage(props: PageProps<"/dossiers/[slug]">) {
  const { slug } = await props.params;
  const d = getDossier(slug);
  if (!d) notFound();
  const event = getEvent(slug);
  return (
    <>
      <JourneyMark step="read-event" />
      <DossierBody
        d={d}
        after={
          <>
            {event ? (
              <div className="mt-8">
                <GenerateReport eventId={event.id} existing />
              </div>
            ) : null}
            <div className="mt-8 rounded-lg border border-teal bg-teal-2/40 p-4 text-[15px]">
              <p className="font-medium">See what this means for your supply chain.</p>
              <p className="mt-1 text-ink-2">Upload a supplier list and get a brief per department, with dates, cost ranges and owners.</p>
              <Link href="/enterprise" className="mt-3 inline-block rounded-sm bg-teal px-3 py-1.5 text-paper no-underline hover:opacity-90">
                Run it on your company
              </Link>
            </div>
          </>
        }
      />
    </>
  );
}
