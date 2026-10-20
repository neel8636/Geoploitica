import { allRipples } from "@/content/ripples";

// Every event's ripple card, for the postcard pop-up. Rebuilt with the site every hour.
export const dynamic = "force-static";

export function GET() {
  return Response.json(Object.fromEntries(allRipples().map((r) => [r.id, r])));
}
