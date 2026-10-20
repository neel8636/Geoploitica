import type { LinkKind } from "@/content/events";

/*
  What the lines between events mean, in one place: the map's key, the line card that opens when
  a line is clicked, the event page's connections and the guide all read from here.
*/
export const DOTTED: LinkKind[] = ["shares_driver", "competes_with"];

export const isDotted = (k: LinkKind) => DOTTED.includes(k);

export const LINE_KINDS: Record<LinkKind, { line: "solid" | "dotted"; phrase: string; meaning: string }> = {
  causes: {
    line: "solid",
    phrase: "feeds into",
    meaning: "The first event is part of the reason the second is happening.",
  },
  affects: {
    line: "solid",
    phrase: "affects",
    meaning: "The first event changes the second's course or odds, though it did not start it.",
  },
  responds_to: {
    line: "solid",
    phrase: "is a response to",
    meaning: "The first event is happening because of the second: the same cause-and-effect link, seen from the other end.",
  },
  amplifies: {
    line: "solid",
    phrase: "amplifies",
    meaning: "The second event already exists; the first makes it bigger or spreads it further.",
  },
  shares_driver: {
    line: "dotted",
    phrase: "shares a driver with",
    meaning: "Neither caused the other. A third force, the driver, pushes both: something like rents outrunning wages, oil above $100, or US tariff policy.",
  },
  competes_with: {
    line: "dotted",
    phrase: "competes with",
    meaning: "The two pull on the same limited thing: US import share, Washington's attention, investors' money, the same voters.",
  },
};

export const LINE_SUMMARY = {
  solid: {
    title: "Solid line: one event acts on the other",
    body: "There is a direct path from one to the other. Follow a solid line to trace consequences: if the first gets worse, expect the second to move.",
  },
  dotted: {
    title: "Dotted line: related, but neither caused the other",
    body: "The two move together because something underneath pushes both, or because they compete for the same thing. A dotted line shows a pattern: when you see one, look for its siblings, and watch the driver rather than the events.",
  },
  driverTest:
    "A quick test for a shared driver: remove one event. Would the other still happen? If yes, but both would fade if the driver eased (rents fell, oil dropped), they share a driver rather than cause each other.",
};
