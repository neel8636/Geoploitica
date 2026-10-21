import { EVENTS, allEdges } from "@/content/events";
import { allRipples, todaysRipples } from "@/content/ripples";
import IntroGate from "@/components/intro/IntroGate";
import AtlasMapHome from "@/components/mapfirst/AtlasMapHome";
import type { FuelLite } from "@/components/mapfirst/MapFirst";

/*
  Map first: the home page is the map. Lists, reports and following all open from it, in
  the side panel. The page hands the map only what it needs to draw (what is fueling each
  event, how fast its news moves, today's picks); the panel fetches the full live cards
  (ripples.json) when it first opens.
*/
export default function Home() {
  const cards = allRipples();
  const fuel: Record<string, FuelLite[]> = {};
  const pulse: Record<string, { trend: string; day: number }> = {};
  for (const c of cards) {
    fuel[c.id] = (c.fuel?.items ?? []).map((f) => ({ title: f.title, aspect: f.aspect, via: f.via, place: f.place }));
    pulse[c.id] = { trend: c.pulse.trend, day: c.pulse.day };
  }
  const today = todaysRipples(5).map((c) => ({ id: c.id, headline: c.headline }));
  const regions = new Set(EVENTS.map((e) => e.region)).size;
  return (
    <>
      <IntroGate />
      <h1 className="sr-only">Geopolitica Atlas: follow one event to everything it touches</h1>
      <p className="sr-only">
        {EVENTS.length} world events across {regions} places, joined by {allEdges().length} connections. Each event shows what is
        fueling it, in money, goods and people, and where it ripples next.
      </p>
      <AtlasMapHome fuel={fuel} pulse={pulse} today={today} />
    </>
  );
}
