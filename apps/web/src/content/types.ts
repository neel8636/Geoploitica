// Content model for public dossiers. One JSON file per dossier in src/content/dossiers/.
// Every number a reader can compare lives in exactly one place; sources ride with the claim.

export type Confidence = "low" | "medium" | "high";

export interface Source {
  title: string;
  url: string;
  publisher: string;
  date?: string; // ISO date of publication
}

export interface KeyNumber {
  value: string; // formatted, e.g. "550,000"
  label: string; // e.g. "marched on 17 Oct"
  sourceIndex: number; // index into dossier.sources
}

export interface RippleRing {
  label: string; // "First-order", "Second-order", "Third-order"
  effects: { text: string; sector?: string }[];
}

export interface TimelineEvent {
  date: string; // ISO
  title: string;
  detail: string;
  sourceIndex?: number;
  turning?: boolean; // highlight as a turning point
}

export interface CauseLayer {
  name: string; // "Structural roots", "Trigger", "Accelerants"
  when: string;
  causes: { name: string; detail: string }[];
}

export interface SeriesPoint {
  date: string;
  value: number;
  low?: number;
  high?: number;
}

export interface LineChart {
  kind: "line";
  title: string; // states the finding
  subtitle: string;
  unit: string;
  series: SeriesPoint[];
  references?: { label: string; value: number; low?: number; high?: number }[];
  annotations?: { date: string; text: string }[];
  sourceIndexes: number[];
}

export interface Stakeholder {
  name: string;
  role: string;
  wants: string;
  leverage: string;
  likelyMove: string;
}

export interface SectorImpact {
  sector: string;
  direction: "up" | "down" | "mixed";
  size: 1 | 2 | 3; // 1 small, 3 large
  why: string;
}

export interface DailyLifeItem {
  item: string;
  effect: string;
  sourceIndex?: number;
}

export interface Scenario {
  name: string;
  probability: number; // percent, author judgement
  looksLike: string;
  signposts: string[];
  effectOnWorld: string;
}

export interface Prediction {
  text: string;
  horizon: string; // e.g. "by May 2027"
  resolves?: string; // ISO date when it can be graded
}

export interface PredictPrompt {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface Countermeasure {
  audience: "businesses" | "investors" | "households" | "policymakers";
  actions: string[];
}

export interface WatchItem {
  date?: string; // ISO if dated
  title: string;
  why: string;
}

export interface ChangeLogEntry {
  date: string;
  change: string;
}

export interface FuelAspect {
  // the part of the economy: money (markets, budget), goods (energy, trade, food) or people
  // (jobs, living, politics, security, displacement)
  aspect: "markets" | "budget" | "energy" | "trade" | "food" | "jobs" | "living" | "politics" | "security" | "displacement";
  title: string; // the concrete development, at most 8 words: "French 10-year yield hits 5%"
  how: string; // one sentence: how it feeds the event
  sourceIndex?: number; // index into evidence.sources
}

export interface Dossier {
  slug: string;
  title: string;
  deck: string; // one-sentence standfirst
  updated: string; // ISO
  status: "developing" | "stable" | "archived";
  region: string;
  tags: string[];
  readingMinutes: { card: number; brief: number; deep: number };
  // What is fueling the event, one entry per part of the economy that feeds it (at least three
  // when the material supports it). The report is built around these: the brief's "why it
  // matters", the sectors and the first ripple ring take them in turn.
  fuel?: FuelAspect[];
  // Present when the report was drafted by the draft script rather than written by hand.
  generated?: {
    by: string;
    at: string;
    model: string;
    sources: number;
    headlines: number;
    reviewed: boolean; // checked by a person
    // checked claim by claim against sources by an AI fact-checker; fixes are in the change log
    sourceChecked?: { at: string; by: string; claims: number; fixed: number };
    // set when events have overtaken the report; the next pipeline run redrafts it
    outdated?: string;
    // how big a report was asked for: snapshot, standard brief, or full deep dive
    size?: "snapshot" | "brief" | "deep";
  };

  // Layer 1: 30-second card
  card: {
    headline: string;
    keyNumber: KeyNumber;
    impactMeter: 1 | 2 | 3 | 4 | 5;
    forYou: { role: string; line: string }[]; // short lines per reader type
    ripple: RippleRing[];
  };

  // Layer 2: 5-minute brief, fixed labels
  brief: {
    whatHappened: string[];
    whyItMatters: string[];
    winners: { who: string; why: string }[];
    losers: { who: string; why: string }[];
    whatsNext: string[];
    predict: PredictPrompt;
    recap: { question: string; options: string[]; answerIndex: number }[];
  };

  // Layer 3: deep-dive modules
  deep: {
    timeline: TimelineEvent[];
    causes: CauseLayer[];
    chart?: LineChart;
    stakeholders: Stakeholder[];
    sectors: SectorImpact[];
    dailyLife: DailyLifeItem[];
    scenarios: Scenario[];
    predictions: Prediction[];
    countermeasures: Countermeasure[];
    analogues: { event: string; year: string; whatFollowed: string }[];
    watch: WatchItem[];
  };

  // Layer 4: evidence
  evidence: {
    sources: Source[];
    confidence: { claim: string; level: Confidence; note: string }[];
    method: string;
    changeLog: ChangeLogEntry[];
  };
}
