"use client";

import { useSyncExternalStore } from "react";

/*
  The getting-started journey: six steps a new reader or manager walks through once.
  Progress lives in this browser (localStorage) and is marked by the pages themselves
  as the person actually does each thing, not by clicking "done" on a checklist.
*/
export type StepId = "understand" | "read-event" | "radar" | "sample" | "own-data" | "rhythm";

export const STEPS: { id: StepId; title: string; minutes: number; href: string; what: string; why: string; cta: string }[] = [
  {
    id: "understand",
    title: "See what Geopolitica does",
    minutes: 2,
    href: "/get-started#understand",
    what: "One event, three layers, and the line from a headline to your supply chain.",
    why: "So the rest of the product reads as one system rather than four pages.",
    cta: "Read the two-minute version",
  },
  {
    id: "read-event",
    title: "Read one event report",
    minutes: 5,
    href: "/dossiers",
    what: "Open any dossier. Skim the 30-second card, then the 5-minute brief; stop there or go deeper.",
    why: "Every change on the radar links to a report like this, so you will know what sits behind each line.",
    cta: "Open the dossiers",
  },
  {
    id: "radar",
    title: "Scan the change radar",
    minutes: 3,
    href: "/changes",
    what: "The dated calendar of regulations, tariffs, strikes and shocks the company reports are matched against.",
    why: "It is the same list your departments will be scored against; seeing it first makes the scores make sense.",
    cta: "Open the radar",
  },
  {
    id: "sample",
    title: "Run the sample company",
    minutes: 5,
    href: "/enterprise#sample",
    what: "Nordwerk, a fictional German manufacturer. One click runs its report and a walkthrough explains each part.",
    why: "You see the whole output, department tabs and all, before touching your own data.",
    cta: "Run Nordwerk",
  },
  {
    id: "own-data",
    title: "Run it on your own supplier list",
    minutes: 15,
    href: "/enterprise",
    what: "Download the CSV templates, fill in suppliers (id, name, country, tier; spend and single-source flags if you have them), upload.",
    why: "This is the product: every department gets a brief on what is coming for it, when, and what to do first.",
    cta: "Upload your footprint",
  },
  {
    id: "rhythm",
    title: "Set your rhythm",
    minutes: 2,
    href: "/get-started#rhythm",
    what: "Re-run after each supplier change and whenever the radar adds a dated item; read the leadership tab weekly.",
    why: "The calendar moves; a report from last month answers last month's question.",
    cta: "See the cadence",
  },
];

const KEY = "geopolitica.journey.v1";
const listeners = new Set<() => void>();

type State = Partial<Record<StepId, string>>; // step → ISO date done

let cache: { raw: string | null; state: State } = { raw: null, state: {} };

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cache.raw) return cache.state;
    const state = raw ? (JSON.parse(raw) as State) : {};
    cache = { raw, state };
    return state;
  } catch {
    return cache.state;
  }
}

const EMPTY: State = {};
function readServer(): State {
  return EMPTY;
}

function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
}

export function markStep(id: StepId) {
  try {
    const state = { ...read() };
    if (state[id]) return;
    state[id] = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

export function resetJourney() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

export function useJourney() {
  const state = useSyncExternalStore(subscribe, read, readServer);
  const done = STEPS.filter((s) => state[s.id]).length;
  const next = STEPS.find((s) => !state[s.id]) ?? null;
  return { state, done, total: STEPS.length, next, started: done > 0 };
}
