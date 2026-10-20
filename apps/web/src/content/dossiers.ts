import fs from "node:fs";
import path from "node:path";
import type { Dossier } from "./types";

export { formatDate, daysBetween } from "./format";

/*
  Registry of dossiers: every JSON file in src/content/dossiers is a published report,
  so a drafted file becomes live the moment it is committed. Server-only (reads the disk);
  client components import dates from ./format instead.
*/
// Reports are read from the Atlas (where the pipeline drafts them) and from this app's own
// folder; a file here wins over the Atlas copy with the same slug, which is how a report
// generated on this server shows up before the next deploy.
const DIRS = [
  path.resolve(process.cwd(), "..", "atlas", "src", "content", "dossiers"),
  path.join(process.cwd(), "src", "content", "dossiers"),
];

let cache: Dossier[] | null = null;

function load(): Dossier[] {
  if (cache) return cache;
  const bySlug = new Map<string, Dossier>();
  for (const dir of DIRS) {
    let files: string[] = [];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    } catch {
      continue;
    }
    for (const f of files) {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Dossier;
        if (d && d.slug && d.card && d.brief && d.deep && d.evidence) bySlug.set(d.slug, d);
      } catch {
        // a malformed draft never takes the site down; it is simply not listed
      }
    }
  }
  cache = [...bySlug.values()];
  return cache;
}

/* Forget the cached registry, e.g. after a report has been generated and written to disk. */
export function resetDossierCache() {
  cache = null;
}

export function listDossiers(): Dossier[] {
  return [...load()].sort((a, b) => (a.updated < b.updated ? 1 : -1));
}

export function getDossier(slug: string): Dossier | undefined {
  return load().find((d) => d.slug === slug);
}
