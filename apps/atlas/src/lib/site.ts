// The public address of the published atlas, used for share cards, the sitemap and canonical
// links. Set NEXT_PUBLIC_SITE_URL at build time when the site moves (a custom domain, say).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://neel8636.github.io/Geopolitica").replace(/\/$/, "");
export const SITE_ORIGIN = new URL(SITE_URL).origin;
export const SITE_NAME = "Geopolitica Atlas";
export const TAGLINE = "Follow one world event to everything it touches: prices, jobs and other countries, with a source behind every link.";

// Where readers flag a mistake: a GitHub issue, prefilled.
export function reportErrorUrl(title: string, path: string): string {
  const body = `Page: ${SITE_URL}${path}\n\nWhat is wrong:\n\nWhat it should say (with a source if you have one):\n`;
  return `https://github.com/neel8636/Geopolitica/issues/new?labels=correction&title=${encodeURIComponent(`Correction: ${title}`)}&body=${encodeURIComponent(body)}`;
}
