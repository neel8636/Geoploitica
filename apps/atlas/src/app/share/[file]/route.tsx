import { EVENTS, TYPE_LABELS, allEdges, getEvent, neighbours } from "@/content/events";
import { getDossier } from "@/content/dossiers";
import { shareCard } from "@/lib/shareCard";

/*
  Share-card images, written at export time as /share/<event-id>.png and /share/atlas.png.
  (A route with a .png name, rather than the opengraph-image convention, so GitHub Pages serves
  them with an image content type.) Pages point at them through their openGraph metadata.
*/
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ file: "atlas.png" }, ...EVENTS.map((e) => ({ file: `${e.id}.png` }))];
}

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const id = file.replace(/\.png$/, "");
  const e = getEvent(id);
  if (!e) {
    return shareCard({
      kicker: `${EVENTS.length} world events · ${allEdges().length} connections · free`,
      title: "Follow one world event to everything it touches.",
      lines: ["Prices, jobs and other countries, traced on one map", "A source behind every link", "A 30-second card, a 5-minute brief and a deep dive for each"],
      footer: "neel8636.github.io/Geopolitica",
    });
  }
  const d = getDossier(e.id);
  const own = d?.slug === e.id;
  const lines = own && d ? d.card.ripple[0]?.effects.map((x) => x.text) ?? [] : neighbours(e.id).slice(0, 3).map((l) => l.event.title);
  return shareCard({
    kicker: `${TYPE_LABELS[e.type]} · ${e.region} · how it ripples outward`,
    title: e.title,
    lines,
    footer: "Trace the full ripple: neel8636.github.io/Geopolitica",
    rings: own && d ? d.card.ripple.length : 3,
  });
}
