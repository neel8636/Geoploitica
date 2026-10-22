import type { AutoAdded } from "@/content/events";
import { formatDate } from "@/content/format";

/*
  For an event the pipeline added from the news: one line saying so, and, opened, why it
  passed the ripple test. SHARED FILE (npm run sync:shared in apps/atlas).
*/
const names = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();
const country = (c: string) => {
  try {
    return names?.of(c) ?? c;
  } catch {
    return c;
  }
};

export default function AutoNote({ a }: { a: AutoAdded }) {
  return (
    <details className="mb-4 rounded-lg border border-amber/60 bg-amber-2 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium">Added from the news on {formatDate(a.addedAt.slice(0, 10))} · why it is on the map</summary>
      <div className="mt-1.5 space-y-1 text-ink-2">
        <p>{a.reason}</p>
        <p>
          Its ripple abroad: <span className="text-ink">{a.channel}</span>
          {a.reaches.length ? <>, reaching {a.reaches.map(country).join(", ")}</> : null}.
        </p>
        <p className="text-ink-3">
          Backed by {a.headlines} headlines from {a.publishers} outlets. Added by the pipeline after a ripple test, not yet checked by a person.
        </p>
      </div>
    </details>
  );
}
