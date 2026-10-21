import type { Metadata } from "next";
import Link from "next/link";
import { EVENTS, allEdges } from "@/content/events";
import { LineKinds } from "@/components/atlas/MapLegend";
import { reportErrorUrl } from "@/lib/site";
import { ConsentChoice } from "@/components/auth/ConsentBanner";

export const metadata: Metadata = {
  title: "How to use the atlas",
  description: "How to read the map, an event and its report, and how the reports are made and corrected.",
};

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
        <dd className="text-ink-2">A connection between two events. A solid line means one acts on the other; a dotted line means they are related through a driver, without either causing the other. Hover a dot and only its lines stay bright. <a href="#ripples" className="underline">How to read a line</a>.</dd>
        <dt className="font-medium">Frames</dt>
        <dd className="text-ink-2">World, Europe, Americas, Asia-Pacific, Middle East &amp; Africa. A frame changes what is in view, never what exists; a note at the top right counts the events outside it.</dd>
        <dt className="font-medium">Opening an event</dt>
        <dd className="text-ink-2">Click a dot, or a title in any list, and its ripple opens as a postcard: what it touches first, second and third, the latest headline, and the events it ripples on to (click one to follow the chain). &ldquo;Open the full event&rdquo; goes to the full page; Ctrl or Cmd-click a title to go there directly. Keyboard: Tab to a dot, Enter to open, Esc to close.</dd>
      </dl>

      <h2 className="mt-10 text-2xl">Reading an event</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] text-ink-2">
        <li><span className="text-ink">Summary and impact.</span> Two or three sentences with the numbers that matter and a 1-to-5 impact meter.</li>
        <li><span className="text-ink">Where it sits.</span> The map focused on the event, with only its connections lit.</li>
        <li><span className="text-ink">How it ripples outward.</span> Rings of effect around the event. Hover or tab to a dot to read the effect in full.</li>
        <li><span className="text-ink">How it connects to the rest of the world.</span> Every linked event with the one sentence that justifies the link. If a link looks wrong, that sentence is what to argue with. Each is a link to the next event.</li>
        <li><span className="text-ink">On the wire.</span> Recent headlines matched to the event.</li>
        <li><span className="text-ink">Sources.</span> Where the summary comes from.</li>
        <li><span className="text-ink">Full report</span>, where one exists: a 30-second card, a 5-minute brief, deep-dive modules and the evidence layer. Read as far as you need. The card and the evidence are open to everyone; the brief and the deep dive need a free account.</li>
      </ol>

      <h2 id="ripples" className="mt-10 scroll-mt-24 text-2xl">How events ripple</h2>
      <div className="prose-dossier mt-3 space-y-3 text-ink-2">
        <p>
          Every line on the map is a claim about how one event reaches another, and every line says three things: what kind of
          connection it is, the <span className="text-ink">channel</span> the ripple travels through, and the sentence that justifies it.
        </p>
        <p>
          <span className="text-ink">Solid lines are the ripple itself.</span> One event acts on the other, and the arrow shows
          which way: one arrow when one event drives the other, two when each drives the other. Example: the Gulf energy
          shock <em>feeds into</em> France&apos;s unrest, via fuel prices; the unrest <em>affects</em> French bonds, via the risk premium
          investors demand after each violent weekend. Follow solid lines to trace consequences: if one worsens, expect the next to move.
        </p>
        <p>
          <span className="text-ink">Dotted lines are relatives.</span> Neither event caused the other; a third force, the{" "}
          <Link href="/drivers" className="underline">driver</Link>, pushes both. Portugal&apos;s housing marches did not cause France&apos;s
          protests; rents rising faster than wages drive both. A quick test: remove one event, and the other would still happen, but ease
          the driver and both fade. Follow a dotted line to spot a pattern, then watch the driver rather than each event.
        </p>
      </div>
      <div className="mt-4 rounded-lg border border-line bg-paper-2 p-4">
        <LineKinds wide />
      </div>

      <h2 id="method" className="mt-10 scroll-mt-24 text-2xl">How reports are made</h2>
      <div className="prose-dossier mt-3 space-y-3 text-ink-2">
        <p>
          <span className="text-ink">Events and connections are chosen by a person.</span> Each event cites the reporting it rests
          on, and each connection carries the sentence that justifies it.
        </p>
        <p>
          <span className="text-ink">Reports are drafted by an AI model</span> (Claude, by Anthropic) from that event&apos;s cited
          sources, its connections and the headlines matched to it, and nothing else. Every number in a report links to the
          source it came from. Until a person has checked a report, it carries an amber &ldquo;Auto-drafted&rdquo; notice at the
          top saying so, with the date and the number of sources used.
        </p>
        <p>
          <span className="text-ink">Scenario odds and predictions are judgement, not data.</span> They are labelled that way,
          kept on the record, and graded as events resolve.
        </p>
        <p>
          <span className="text-ink">Corrections are public.</span> Every event page has a &ldquo;Report an error&rdquo; link. Fixes
          are listed in the report&apos;s change log, in its evidence section.{" "}
          <a href={reportErrorUrl("general", "/guide/")} target="_blank" rel="noreferrer" className="hover:underline">Flag something now</a>.
        </p>
      </div>

      <h2 id="privacy" className="mt-10 scroll-mt-24 text-2xl">Privacy</h2>
      <div className="prose-dossier mt-3 space-y-3 text-ink-2">
        <p>
          <span className="text-ink">An account</span> stores your name, email, country, what brings you here (if you say), when you
          joined and last visited, and where you first arrived from (for example a link shared on LinkedIn). It is kept in Google
          Firebase, used only to understand who the atlas serves, and never sold or shared.
        </p>
        <p>
          <span className="text-ink">Analytics</span> (Google Analytics) count visits only if you accept in the banner. <ConsentChoice />
        </p>
        <p>
          <span className="text-ink">Deleting your account</span> removes the account and its profile:{" "}
          <Link href="/join#delete" className="hover:underline">sign in, then use &ldquo;Delete my account&rdquo;</Link>.
        </p>
      </div>

      <h2 className="mt-10 text-2xl">Keeping it current</h2>
      <p className="prose-dossier mt-3 text-ink-2">
        The published site rebuilds itself every hour and pulls fresh headlines first. The event graph itself is a file you
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
