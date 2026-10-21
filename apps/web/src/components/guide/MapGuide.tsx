import type { CSSProperties, ReactNode } from "react";

/*
  How to use the map, for the "How to use" page of both editions: reading it, moving around on
  a computer and on a phone, the key, an event's panel, building a report, and the themes.
  SHARED FILE: both editions run it (npm run sync:shared in apps/atlas). No hooks, so it renders
  on the server.
*/

const dot = (style: CSSProperties) => <i className="mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full" style={style} aria-hidden />;
const fam = (f: "money" | "goods" | "people", label: string) => (
  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[13px] font-medium text-white" style={{ background: `var(--${f})` }}>{label}</span>
);

function Rows({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="mt-3 grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-[11rem_1fr]">
      {rows.map(([t, d], n) => (
        <div key={n} className="contents">
          <dt className="font-medium">{t}</dt>
          <dd className="text-ink-2">{d}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function MapGuide({ edition = "atlas" }: { edition?: "atlas" | "enterprise" }) {
  return (
    <>
      <h2 id="map" className="mt-10 scroll-mt-24 text-2xl">Reading the map</h2>
      <Rows
        rows={[
          [
            "Dots",
            <span key="d" className="flex flex-col gap-1.5">
              <span className="flex gap-2">{dot({ background: "var(--gold)", boxShadow: "0 0 6px var(--gold)" })}<span>Glowing gold: a severe event (4 or 5 of 5). Bigger means more severe.</span></span>
              <span className="flex gap-2">{dot({ background: "var(--other)" })}<span>Pale: developing.</span></span>
              <span className="flex gap-2">{dot({ border: "2px solid var(--gold)" })}<span>A gold ring: coming up, with a date (a vote, a summit, a central-bank decision).</span></span>
              <span>A pulsing ring marks one of today&apos;s ripples: its news is moving most right now.</span>
            </span>,
          ],
          [
            "The coloured ring",
            <>What is fueling the event, split by the part of the economy it comes through: {fam("money", "Money")} markets, rates and budgets; {fam("goods", "Goods")} energy, trade and food; {fam("people", "People")} jobs, living costs, politics, security and people on the move.</>,
          ],
          [
            "Lines",
            <>With nothing selected, thin gold lines show every connection, with an arrow for the direction. Select an event and its own lines light up: events <span className="text-ink">feeding into it</span> arrive in the colour of what they carry, with its icon halfway along; <span className="text-ink">gold</span> lines show where it ripples next; <span className="text-ink">dotted</span> lines join events pushed by the same driver, where neither caused the other.</>,
          ],
          [
            "How two connect",
            <>Point at any line for its one-line story; click or tap it (or a row in an event&apos;s panel) to open how the two connect: what moves between them, and the first step of the chain. The whole chain, step by step, with what to watch next, is in the report&apos;s &ldquo;How it connects&rdquo; section. Where lines cross, the map asks which one you meant.</>,
          ],
          ["Layers", "Ripples, Fuel and Pulse at the top of the map switch the lines, the coloured rings and the pulsing rings on and off."],
        ]}
      />

      <h2 id="moving" className="mt-10 scroll-mt-24 text-2xl">Moving around</h2>
      <Rows
        rows={[
          ["On a computer", "Drag to move. Scroll to zoom in or out on the spot under the pointer; double-click zooms in there too. The + and − buttons zoom on the selected event, or on the middle of the map you can see. ⟲ shows the whole world."],
          ["On a phone", "Drag with one finger to move; pinch, or double-tap, to zoom in on that spot. ⟲ (top right) shows the whole world. The panel is a sheet at the bottom: tap its handle to raise it a step at a time, or drag it to the height you want."],
          ["Search", "The search box finds an event by name, place or kind; Enter flies to the first match."],
          ["Names", "Event names appear as you zoom in, and so does each event's ring of small fuel dots."],
        ]}
      />

      <h2 id="key" className="mt-10 scroll-mt-24 text-2xl">The key</h2>
      <p className="prose-dossier mt-3 text-ink-2">
        The key never leaves the screen (bottom left on a computer, a strip above the sheet on a phone). Point at Money, Goods or People to
        light that colour up on the map; click it to keep only that colour, and click again to bring the rest back. While you are learning,
        the names sit on the map beside each coloured dot, and three small marks on each key row fill up as you see that colour. Once all
        three are full, the key asks one quick question; answer it and the names step back and the key shrinks to a strip. &ldquo;Learn
        again&rdquo; brings them back.
      </p>

      <h2 id="event" className="mt-10 scroll-mt-24 text-2xl">Opening an event</h2>
      <Rows
        rows={[
          ["Pick one", "Click or tap a dot, a name in the panel, or a search result. The map flies to it and the panel shows its story. Esc, or a tap on empty map, lets it go."],
          ["What changed", "A two-line AI summary of the newest headlines, with the outlets it drew on."],
          ["What's fueling it", "The small local developments feeding it, each with its colour, what it moves in and its place. Click one, or its dot on the map, for its share of the local news."],
          ["Feeding in, rippling out", <>The events that drive it, in the colour of what they carry, and the events it reaches next. <span className="text-ink">fly ↗</span> follows the line to the next event.</>],
          [edition === "atlas" ? "Follow and Ask" : "Open the event", edition === "atlas" ? "Follow adds it to your tracker and digest; Ask answers a question from its report, connections and headlines." : "Open the event goes to its full page: the live layer, every connection with its reason, the sources and the report."],
        ]}
      />

      <h2 id="reports" className="mt-10 scroll-mt-24 text-2xl">Reports</h2>
      <div className="prose-dossier mt-3 space-y-3 text-ink-2">
        <p>
          <span className="text-ink">Reports need a free account.</span> Each one is written by AI for the event, so reading a report and
          building one are kept for signed-in readers. The map, the events, what is fueling them and how they connect stay open to everyone.
        </p>
        <p>
          <span className="text-ink">Build report</span>, in an event&apos;s panel, shows the parts of the economy the report will be built
          around (what is fueling the event, and what the events feeding it carry), and three sizes. Every size keeps the same layers: the
          30-second card, the brief, the deep dive and the evidence.
        </p>
        <ul className="list-disc space-y-1 pl-5 font-sans text-[15px]">
          <li><span className="text-ink">Snapshot</span>, about 3 minutes: the card and a short brief, the deep dive kept to essentials.</li>
          <li><span className="text-ink">Standard</span>, about 10 minutes: the card, the full brief and a focused deep dive.</li>
          <li><span className="text-ink">Deep dive</span>, about 25 minutes: every layer at full depth.</li>
        </ul>
        <p>
          Each account can build three reports a day. A report you build becomes the event&apos;s shared report only when there is none yet
          or yours is at least as full as the one there; otherwise it is yours alone, shown where you built it. Reports a person has checked
          are never replaced.
        </p>
      </div>

      <h2 id="themes" className="mt-10 scroll-mt-24 text-2xl">Night and Ivory</h2>
      <p className="prose-dossier mt-3 text-ink-2">
        The switch in the header picks Night (navy and gold, like the logo), Ivory (the lighter version) or Auto (follow the device). The
        choice is remembered in this browser.
      </p>
    </>
  );
}
