/*
  How big a report the reader asks for. Every size keeps the same four layers (card, brief,
  deep dive, evidence), so the format never changes; the size sets how much goes in each.
*/
export type ReportSize = "snapshot" | "brief" | "deep";
export const REPORT_SIZES: Record<ReportSize, { label: string; minutes: number; blurb: string; maxTokens: number; rules: string }> = {
  snapshot: {
    label: "Snapshot",
    minutes: 3,
    blurb: "The 30-second card and a short brief, with the deep dive kept to the essentials.",
    maxTokens: 8000,
    rules: `SIZE: snapshot. Keep every layer but make it short. Ripple: three rings, 3 effects each. Brief: 1-2 short paragraphs per section, 2 winners, 2 losers, 2 recap questions. Deep: 3-4 timeline entries, 2 cause layers, 3 stakeholders, one sector per fuel aspect, 2 daily-life items, 2-3 scenarios, 2 predictions, 2 countermeasures, 1 analogue, 3 watch items; no chart. readingMinutes: card 1, brief 2, deep 4.`,
  },
  brief: {
    label: "Standard",
    minutes: 10,
    blurb: "The card, the full five-minute brief, and a focused deep dive.",
    maxTokens: 12000,
    rules: `SIZE: standard. Ripple: three rings, 3-4 effects each. Brief: full. Deep: 5-7 timeline entries, 3 cause layers, 4-5 stakeholders, 4-5 sectors, 3 daily-life items, 3 scenarios, 3 predictions, 3 countermeasures, 2 analogues, 4 watch items. readingMinutes: card 1, brief 5, deep 8-10.`,
  },
  deep: {
    label: "Deep dive",
    minutes: 25,
    blurb: "Everything: the full brief and every deep-dive module at full depth, with the evidence.",
    maxTokens: 16000,
    rules: `SIZE: deep dive. Ripple: three rings, 3-5 effects each. Brief: full. Deep: every module at full depth (8+ timeline entries, 5-7 stakeholders, 5-7 sectors, 3-4 scenarios, 4-5 predictions, 3 analogues, 5+ watch items). readingMinutes: card 1, brief 5, deep 15-25.`,
  },
};
export const isReportSize = (s: unknown): s is ReportSize => typeof s === "string" && s in REPORT_SIZES;
