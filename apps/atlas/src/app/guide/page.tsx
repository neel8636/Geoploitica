import type { Metadata } from "next";
import Link from "next/link";
import { EVENTS, LINK_WORDS, allEdges } from "@/content/events";

export const metadata: Metadata = { title: "How to use the atlas" };

export default function GuidePage() {
  const edges = allEdges();
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl">How to use the atlas</h1>
      <p className="prose-dossier mt-3 text-ink-2">
        The atlas is a map of {EVENTS.length} world events and the {edges.length} connections between them. There is no
        front story and no fixed order: you start from whatever you care about and follow the lines.
      </p>

      <h2 className="mt-10 text-2xl">Reading the map</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-[11rem_1fr]">
        <dt className="font-medium">Dots</dt>
        <dd className="text-ink-2">One per event, where it is happening. Bigger means more severe. Amber dots are severe (4 or 5 of 5). Hollow dots are scheduled: an election, a deadline, a decision with a date.</dd>
        <dt className="font-medium">Lines</dt>
        <dd className="text-ink-2">A connection between two events. Solid means one {LINK_WORDS.causes}, {LINK_WORDS.affects} or {LINK_WORDS.responds_to} the other; dashed means they {LINK_WORDS.shares_driver}. Hover a dot and only its lines stay bright.</dd>
        <dt className="font-medium">Frames</dt>
        <dd className="text-ink-2">World, Europe, Americas, Asia-Pacific, Middle East &amp; Africa. A frame changes what is in view, never what exists; a note at the top right counts the events outside it.</dd>
        <dt className="font-medium">Opening an event</dt>
        <dd className="text-ink-2">Click a dot, or a title in any list. Keyboard: Tab to a dot, Enter to open.</dd>
      </dl>

      <h2 className="mt-10 text-2xl">Reading an event</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] text-ink-2">
        <li><span className="text-ink">Summary and impact.</span> Two or three sentences with the numbers that matter and a 1-to-5 impact meter.</li>
        <li><span className="text-ink">Where it sits.</span> The map focused on the event, with only its connections lit.</li>
        <li><span className="text-ink">How it ripples outward.</span> Rings of effect around the event. Hover or tab to a dot to read the effect in full.</li>
        <li><span className="text-ink">How it connects to the rest of the world.</span> Every linked event with the one sentence that justifies the link. If a link looks wrong, that sentence is what to argue with. Each is a link to the next event.</li>
        <li><span className="text-ink">On the wire.</span> Recent headlines matched to the event.</li>
        <li><span className="text-ink">Sources.</span> Where the summary comes from.</li>
        <li><span className="text-ink">Full report</span>, where one exists: a 30-second card, a 5-minute brief, deep-dive modules and the evidence layer. Read as far as you need.</li>
      </ol>

      <h2 className="mt-10 text-2xl">Keeping it current</h2>
      <p className="prose-dossier mt-3 text-ink-2">
        The published site rebuilds itself once a day and pulls fresh headlines first. The event graph itself is a file you
        edit: <code className="rounded-sm bg-paper-2 px-1">src/content/events.ts</code>, one entry per event with its
        coordinates, keywords, links and sources. Two scripts help:
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-ink-2">
        <li><code className="rounded-sm bg-paper-2 px-1">npm run wire</code> fetches the feeds and matches headlines to events; the unmatched ones on the <Link href="/wire" className="hover:underline">wire page</Link> are candidates for new events.</li>
        <li><code className="rounded-sm bg-paper-2 px-1">npm run draft -- &lt;event-id&gt;</code> drafts a full report from the event, its connections and its headlines, for you to check before it is published.</li>
      </ul>

      <h2 className="mt-10 text-2xl">Light and dark</h2>
      <p className="prose-dossier mt-3 text-ink-2">
        The switch in the header sets Light, Dark or Auto (follow the device). The choice is remembered in this browser.
      </p>

      <p className="mt-10">
        <Link href="/" className="hover:underline">Back to the map</Link>
      </p>
    </article>
  );
}
