"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Mail, MessageCircleQuestion } from "lucide-react";

/*
  The introduction a first-time reader sees: what "Geopolitica" means, then three pages on how
  the atlas works, then the map (where the feature spotlight picks up). Dressed in the logo's
  midnight navy and gold, like the atlas itself. Arrow keys move between pages; Skip goes
  straight to the map. Replay it from "What is Geopolitica?" in the footer.
*/
export const INTRO_KEY = "geopolitica.intro.v1";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const C = { navy: "#08101c", navy2: "#0f1a2b", gold: "#c9a45c", gold2: "#ae8248", ivory: "#f4ead6", ivory2: "#b9ad97", money: "#3987e5", goods: "#d95926", people: "#199e70" };

function markDone() {
  try {
    localStorage.setItem(INTRO_KEY, "done");
  } catch {}
}

export default function Welcome() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const finish = useCallback(() => {
    markDone();
    router.push("/");
  }, [router]);
  const next = useCallback(() => (i < PAGES.length - 1 ? setI(i + 1) : finish()), [i, finish]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, finish]);

  const p = PAGES[i];
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto" style={{ background: `radial-gradient(ellipse at 50% 20%, ${C.navy2}, ${C.navy} 70%)`, color: C.ivory }}>
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between text-sm" style={{ color: C.ivory2 }}>
          <span className="font-serif tracking-wide" style={{ color: C.gold }}>{i === 0 ? "" : "Geopolitica"}</span>
          <button type="button" onClick={finish} className="rounded-full px-3 py-1 hover:underline" style={{ color: C.ivory2 }}>
            Skip to the map
          </button>
        </div>

        <div key={i} className="flex flex-1 animate-[fadein_.45s_ease] flex-col justify-center py-6">{p.body}</div>

        <div className="flex items-center justify-between gap-4 pb-2">
          <button
            type="button"
            onClick={back}
            disabled={i === 0}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm disabled:opacity-0"
            style={{ color: C.ivory2 }}
          >
            <ArrowLeft size={16} aria-hidden /> Back
          </button>
          <div className="flex gap-2" aria-label={`Page ${i + 1} of ${PAGES.length}`}>
            {PAGES.map((_, n) => (
              <button
                key={n}
                type="button"
                onClick={() => setI(n)}
                aria-label={`Go to page ${n + 1}`}
                className="h-2 rounded-full transition-all"
                style={{ width: n === i ? 26 : 8, background: n === i ? C.gold : "rgba(244,234,214,.25)" }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[15px] font-medium shadow-lg"
            style={{ background: `linear-gradient(180deg, ${C.gold}, ${C.gold2})`, color: C.navy }}
          >
            {p.cta} <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function Page({ step, title, lead, art, points }: { step?: string; title: string; lead: string; art: ReactNode; points: { icon?: ReactNode; text: ReactNode }[] }) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
      <div className="order-2 lg:order-1">
        {step ? <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: C.gold }}>{step}</p> : null}
        <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl" style={{ color: C.ivory }}>{title}</h1>
        <p className="mt-4 font-serif text-lg leading-relaxed" style={{ color: C.ivory2 }}>{lead}</p>
        <ul className="mt-6 space-y-3.5">
          {points.map((pt, n) => (
            <li key={n} className="flex gap-3 text-[15px] leading-relaxed" style={{ color: C.ivory }}>
              <span className="mt-0.5 shrink-0">{pt.icon ?? <span className="mt-2 block h-1.5 w-1.5 rounded-full" style={{ background: C.gold }} />}</span>
              <span>{pt.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="order-1 lg:order-2">{art}</div>
    </div>
  );
}

/* --- the illustrations: the atlas's own marks, drawn in gold on navy ----------------------- */

const glow = (
  <defs>
    <radialGradient id="g-dot">
      <stop offset="0%" stopColor="#fff7e3" />
      <stop offset="45%" stopColor={C.gold} />
      <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
    </radialGradient>
    <marker id="g-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill={C.gold} />
    </marker>
  </defs>
);

function DotsArt() {
  return (
    <svg viewBox="0 0 420 300" className="mx-auto w-full max-w-md" role="img" aria-label="Event dots on a map; one pulses and opens its story">
      {glow}
      <ellipse cx="210" cy="150" rx="200" ry="130" fill="none" stroke={C.gold} strokeOpacity=".25" />
      <ellipse cx="210" cy="150" rx="120" ry="130" fill="none" stroke={C.gold} strokeOpacity=".15" />
      <line x1="10" y1="150" x2="410" y2="150" stroke={C.gold} strokeOpacity=".15" />
      {[[110, 110, 7], [300, 90, 6], [330, 190, 5], [90, 200, 5], [220, 205, 6]].map(([x, y, r], n) => (
        <g key={n}>
          <circle cx={x} cy={y} r={r * 2.4} fill="url(#g-dot)" opacity=".5" />
          <circle cx={x} cy={y} r={r} fill={C.gold} />
        </g>
      ))}
      <circle cx="200" cy="120" r="10" fill={C.gold} />
      <circle cx="200" cy="120" r="18" fill="none" stroke={C.goods} strokeWidth="2" className="map-pulse" style={{ transformOrigin: "200px 120px" }} />
      <g transform="translate(232 30)">
        <rect width="170" height="104" rx="10" fill={C.ivory} />
        <rect x="10" y="12" width="70" height="7" rx="3" fill={C.gold2} opacity=".7" />
        <rect x="10" y="28" width="140" height="11" rx="3" fill={C.navy} />
        <rect x="10" y="46" width="120" height="6" rx="3" fill={C.ivory2} />
        <rect x="10" y="58" width="110" height="6" rx="3" fill={C.ivory2} />
        <circle cx="132" cy="84" r="14" fill="none" stroke={C.gold2} strokeOpacity=".6" />
        <circle cx="132" cy="84" r="6" fill={C.gold2} />
        <rect x="10" y="76" width="60" height="16" rx="8" fill={C.navy} opacity=".85" />
      </g>
      <path d="M212 112 C 225 80, 235 70, 238 62" fill="none" stroke={C.gold} strokeDasharray="3 4" />
    </svg>
  );
}

function LinesArt() {
  const sat = [
    { x: 290, y: 175, c: C.money },
    { x: 360, y: 205, c: C.goods },
    { x: 300, y: 255, c: C.people },
  ];
  return (
    <svg viewBox="0 0 420 300" className="mx-auto w-full max-w-md" role="img" aria-label="One-way and two-way ripples, a dotted shared-driver line, and coloured fueling dots">
      {glow}
      <circle cx="60" cy="60" r="10" fill={C.gold} />
      <circle cx="200" cy="40" r="10" fill={C.gold} />
      <path d="M72 57 Q 130 30 186 40" fill="none" stroke={C.gold} strokeWidth="2" markerEnd="url(#g-arrow)" />
      <text x="100" y="22" fill={C.ivory2} fontSize="12">one way</text>
      <circle cx="80" cy="170" r="10" fill={C.gold} />
      <circle cx="200" cy="130" r="10" fill={C.gold} />
      <path d="M93 165 Q 140 135 186 133" fill="none" stroke={C.gold} strokeWidth="2" markerStart="url(#g-arrow)" markerEnd="url(#g-arrow)" />
      <text x="108" y="125" fill={C.ivory2} fontSize="12">both ways</text>
      <circle cx="60" cy="260" r="10" fill={C.gold} />
      <circle cx="190" cy="250" r="10" fill={C.gold} />
      <path d="M72 258 L 178 251" fill="none" stroke={C.gold} strokeWidth="2" strokeDasharray="4 5" />
      <text x="80" y="285" fill={C.ivory2} fontSize="12">same driver</text>
      <circle cx="330" cy="215" r="16" fill={C.gold} />
      {sat.map((d, n) => (
        <g key={n}>
          <line x1={d.x} y1={d.y} x2={330 + (d.x - 330) * 0.45} y2={215 + (d.y - 215) * 0.45} stroke={d.c} strokeWidth="2" markerEnd="url(#g-arrow)" />
          <circle cx={d.x} cy={d.y} r="11" fill={d.c} stroke={C.ivory} strokeOpacity=".5" />
        </g>
      ))}
      <text x="282" y="150" fill={C.ivory2} fontSize="12">what&apos;s fueling it</text>
    </svg>
  );
}

function YoursArt() {
  const card = (y: number, Icon: typeof Bookmark, w: number) => (
    <g transform={`translate(70 ${y})`}>
      <rect width="280" height="62" rx="12" fill={C.navy2} stroke={C.gold} strokeOpacity=".35" />
      <circle cx="34" cy="31" r="18" fill={C.gold} />
      <foreignObject x="22" y="19" width="24" height="24">
        <Icon size={24} color={C.navy} strokeWidth={2.2} />
      </foreignObject>
      <rect x="66" y="20" width={w} height="9" rx="4" fill={C.ivory} />
      <rect x="66" y="36" width={w - 40} height="7" rx="3" fill={C.ivory2} opacity=".6" />
    </g>
  );
  return (
    <svg viewBox="0 0 420 300" className="mx-auto w-full max-w-md" role="img" aria-label="Follow, ask and digest">
      {card(20, Bookmark, 170)}
      {card(115, MessageCircleQuestion, 190)}
      {card(210, Mail, 150)}
    </svg>
  );
}

const gold = (t: ReactNode) => <span style={{ color: C.gold }}>{t}</span>;
const chip = (bg: string, label: string) => (
  <span className="mx-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px]" style={{ background: bg, color: "#fff" }}>{label}</span>
);

const PAGES: { cta: string; body: ReactNode }[] = [
  {
    cta: "How it works",
    body: (
      <div className="mx-auto max-w-3xl text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/brand/logo.jpg`} alt="Geopolitica" className="mx-auto w-full max-w-md rounded-xl" />
        <h1 className="mt-6 font-serif text-3xl sm:text-4xl" style={{ color: C.ivory }}>What does Geopolitica mean?</h1>
        <p className="mx-auto mt-4 max-w-2xl font-serif text-lg leading-relaxed" style={{ color: C.ivory2 }}>
          {gold("Geo")} is the Earth: its places, borders, sea lanes and resources. {gold("Politica")} is the affairs of states and the
          people in them. Together they ask one question: <span style={{ color: C.ivory }}>how does where things are shape who has power, and what they do with it?</span>
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed" style={{ color: C.ivory2 }}>
          Geopolitica follows that one event at a time. A strike in one country, a war at sea or a vote in a capital ripples into prices,
          jobs and lives far away. Here you can see how, and why, in a few minutes. Free, for anyone, anywhere.
        </p>
      </div>
    ),
  },
  {
    cta: "Next",
    body: (
      <Page
        step="How it works · 1 of 3"
        title="Every dot is an event"
        lead="The map shows the world events that matter now. Each one is checked against its sources and refreshed through the day."
        art={<DotsArt />}
        points={[
          { text: <>Click any dot and the map {gold("flies to it")}; the panel beside it tells its story: what changed, what is fueling it, where it ripples next.</> },
          { text: <>A {gold("pulsing dot")} means its news is rising today. &ldquo;What changed&rdquo; tells you what moved, in two lines.</> },
          { text: <>Today&apos;s ripples, in the panel, are the events the news is moving on right now.</> },
        ]}
      />
    ),
  },
  {
    cta: "Next",
    body: (
      <Page
        step="How it works · 2 of 3"
        title="Every line is a ripple"
        lead="Events are connected. The lines show how one reaches another, and the small dots show what feeds each one."
        art={<LinesArt />}
        points={[
          { text: <>An {gold("arrow")} shows which way an effect travels: one way, or both ways when each drives the other.</> },
          { text: <>A {gold("dotted line")} means neither caused the other: a shared driver, like energy prices, pushes both.</> },
          { text: <>Small coloured dots are {gold("what's fueling it")}: {chip(C.money, "money")}{chip(C.goods, "goods")}{chip(C.people, "people")} moving into the event. Click one for its local news.</> },
        ]}
      />
    ),
  },
  {
    cta: "Open the map",
    body: (
      <Page
        step="How it works · 3 of 3"
        title="Make it yours"
        lead="Keep the events you care about close, and ask about anything you read."
        art={<YoursArt />}
        points={[
          { icon: <Bookmark size={18} color={C.gold} aria-hidden />, text: <>{gold("Follow")} any event or driver. Your tracker shows what changed since you last looked, and which connected events are heading its way.</> },
          { icon: <MessageCircleQuestion size={18} color={C.gold} aria-hidden />, text: <>{gold("Ask")} a question while you read, and get an answer drawn from the event&apos;s report, connections and headlines.</> },
          { icon: <Mail size={18} color={C.gold} aria-hidden />, text: <>Get a {gold("daily or weekly email")} of what moved on what you follow. A free account keeps it all in sync.</> },
        ]}
      />
    ),
  },
];
