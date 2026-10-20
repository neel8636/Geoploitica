import type { MetadataRoute } from "next";
import { EVENTS } from "@/content/events";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/events/", "/drivers/", "/wire/", "/guide/", "/join/"].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "hourly" as const, priority: p === "/" ? 1 : 0.5 }));
  const events = EVENTS.map((e) => ({ url: `${SITE_URL}/events/${e.id}/`, lastModified: e.date, changeFrequency: "daily" as const, priority: 0.8 }));
  return [...pages, ...events];
}
