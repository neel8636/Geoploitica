import fs from "node:fs";
import path from "node:path";
import type { Dossier } from "./types";

export { formatDate, daysBetween } from "./format";

/*
  Registry of dossiers: every JSON file in src/content/dossiers is a published report,
  so a drafted file becomes live the moment it is committed. Server-only (reads the disk);
  client components import dates from ./format instead.
*/
const DIR = path.join(process.cwd(), "src", "content", "dossiers");

let cache: Dossier[] | null = null;

function load(): Dossier[] {
  if (cache) return cache;
  let files: string[] = [];
  try {
    files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
  } catch {
    files = [];
  }
  const out: Dossier[] = [];
  for (const f of files) {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Dossier;
      if (d && d.slug && d.card && d.brief && d.deep && d.evidence) out.push(d);
    } catch {
      // a malformed draft never takes the site down; it is simply not listed
    }
  }
  cache = out;
  return out;
}

export function listDossiers(): Dossier[] {
  return [...load()].sort((a, b) => (a.updated < b.updated ? 1 : -1));
}

export function getDossier(slug: string): Dossier | undefined {
  return load().find((d) => d.slug === slug);
}
