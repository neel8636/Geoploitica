// Date helpers safe to import from client components (no Node APIs here).

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  return Math.round((b - a) / 86400000);
}

/* A "what changed" line for readers: drop the headline numbers it cites, like "(1, 3)",
   which only make sense next to the numbered list Claude was given, and the old
   "New since the last line:" opener. */
export function plainUpdate(text: string): string {
  return text
    .replace(/^New since the last line:\s*/i, "")
    .replace(/\s*\((?:\d+\s*(?:,|and|-|–)\s*)*\d+\)/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^./, (x) => x.toUpperCase());
}
