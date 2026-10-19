import fs from "node:fs";
import path from "node:path";

// Headlines pulled by scripts/wire.mjs and matched to events by keyword.
// Server-only: read at render time so a fresh `npm run wire` shows up on the next request or build.

export interface WireItem {
  id: string;
  title: string;
  url: string;
  publisher: string;
  published: string; // ISO
  summary?: string;
  eventIds: string[]; // matched events, may be empty
}

export interface Wire {
  fetchedAt: string | null;
  items: WireItem[];
}

export function loadWire(): Wire {
  try {
    const file = path.join(process.cwd(), "src", "content", "wire.json");
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as Wire;
    return { fetchedAt: parsed.fetchedAt ?? null, items: parsed.items ?? [] };
  } catch {
    return { fetchedAt: null, items: [] };
  }
}
