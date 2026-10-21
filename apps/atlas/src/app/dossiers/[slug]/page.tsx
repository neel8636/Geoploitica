import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDossier, listDossiers } from "@/content/dossiers";
import { connectionsFor } from "@/content/connections";
import { reportErrorUrl } from "@/lib/site";
import { DossierBody } from "@/components/dossier/DossierBody";

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
  return <DossierBody d={d} backHref="/dossiers" backLabel="All dossiers" errorUrl={reportErrorUrl(d.title, `/dossiers/${d.slug}/`)} connections={connectionsFor(d.slug)} />;
}
