import { loadWire } from "@/content/wire";
import { todaysRipples } from "@/content/ripples";

// A tiny file open pages poll to notice a newer build: each hourly build pulls the wire again,
// so a different wireFetchedAt from the one the page was built with means fresh content.
export const dynamic = "force-static";

export function GET() {
  const wire = loadWire();
  return Response.json({
    wireFetchedAt: wire.fetchedAt,
    headlines: wire.items.length,
    today: todaysRipples().map((r) => r.id),
  });
}
