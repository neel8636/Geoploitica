import type { Metadata } from "next";
import Link from "next/link";
import { EVENTS, allEdges } from "@/content/events";
import MapGuide from "@/components/guide/MapGuide";
import { ConsentChoice } from "@/components/auth/ConsentBanner";

export const metadata: Metadata = {
  title: "How to use Geopolitica",
  description: "How to read and move around the map on a computer or a phone, open an event, build a report, and use the company tools.",
};

export default function GuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl">How to use Geopolitica</h1>
      <p className="prose-dossier mt-3 text-ink-2">
        The front page is a map of {EVENTS.length} world events and the {allEdges().length} connections between them. Everything opens
        from it: an event&apos;s story, what is fueling it, its report, and the tools for your company.{" "}
        <Link href="/welcome" className="underline">Replay the introduction</Link>.
      </p>

      <MapGuide edition="enterprise" />

      <h2 id="company" className="mt-10 scroll-mt-24 text-2xl">For your company</h2>
      <p className="prose-dossier mt-3 text-ink-2">The Tools tab in the map&apos;s panel holds these; the header links to them too.</p>
      <ul className="mt-3 space-y-2 text-[15px] text-ink-2">
        <li><Link href="/get-started" className="font-medium text-ink hover:underline">Get started</Link>: six steps, about half an hour, ending with your own supplier list.</li>
        <li><Link href="/dossiers" className="font-medium text-ink hover:underline">Dossiers</Link>: every event&apos;s report in one list (sign in to read them).</li>
        <li><Link href="/changes" className="font-medium text-ink hover:underline">Change radar</Link>: dated regulations, tariffs and strikes, sorted by when they bite.</li>
        <li><Link href="/enterprise" className="font-medium text-ink hover:underline">Company impact report</Link>: your suppliers, parts, lanes and sites, with a brief for every department.</li>
        <li><Link href="/method" className="font-medium text-ink hover:underline">How we work</Link>: sources, judgement, graded forecasts.</li>
      </ul>

      <h2 id="privacy" className="mt-10 scroll-mt-24 text-2xl">Privacy</h2>
      <div className="prose-dossier mt-3 space-y-3 text-ink-2">
        <p>
          <span className="text-ink">An account</span> (shared with the Atlas, the personal edition) stores your name, email, country, what
          brings you here (if you say), when you joined and last visited, and where you first arrived from. It is kept in Google Firebase,
          used only to understand who Geopolitica serves, and never sold or shared.
        </p>
        <p>
          <span className="text-ink">Analytics</span> (Google Analytics) count visits only if you accept in the banner. <ConsentChoice />
        </p>
        <p>
          <span className="text-ink">Deleting your account</span> removes the account and its profile:{" "}
          <Link href="/join#delete" className="hover:underline">sign in, then use &ldquo;Delete my account&rdquo;</Link>.
        </p>
      </div>

      <p className="mt-10">
        <Link href="/" className="hover:underline">Back to the map</Link>
      </p>
    </article>
  );
}
