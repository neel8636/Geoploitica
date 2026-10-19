import type { Dossier } from "./types";
import france from "./dossiers/france-unrest-2026.json";

// Registry of published dossiers. Add a JSON file and import it here.
const all: Dossier[] = [france as Dossier];

export function listDossiers(): Dossier[] {
  return [...all].sort((a, b) => (a.updated < b.updated ? 1 : -1));
}

export function getDossier(slug: string): Dossier | undefined {
  return all.find((d) => d.slug === slug);
}

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
