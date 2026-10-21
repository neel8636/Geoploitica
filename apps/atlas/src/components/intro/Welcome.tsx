"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Building2, CalendarClock, FileText, Lock, MessageCircleQuestion } from "lucide-react";

/*
  The introduction a first-time reader sees: what "Geopolitica" means, then three pages on how
  the map works, then the map itself (where the feature spotlight picks up). Dressed in the
  logo's navy and gold. Arrow keys move between pages; Skip goes straight to the map. Replay it
  from "What is Geopolitica?" in the footer.

  SHARED FILE: both editions run it (npm run sync:shared in apps/atlas). The last page differs:
  the Atlas makes it yours (follow, ask, build a report); the enterprise edition points at the
  company tools.
*/
export const INTRO_KEY = "geopolitica.intro.v2";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const C = { navy: "#08101c", navy2: "#0f1a2b", gold: "#d9ad5f", gold2: "#ae8248", ivory: "#f4e9d4", ivory2: "#b9b3a6", other: "#e8dcc2", money: "#4b8efe", goods: "#c952a8", people: "#438f31" };
type Edition = "atlas" | "enterprise";

function markDone() {
  try {
    localStorage.setItem(INTRO_KEY, "done");
  } catch {}
}

export default function Welcome({ edition = "atlas" }: { edition?: Edition }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const pages = edition === "enterprise" ? [...COMMON, ENTERPRISE_LAST] : [...COMMON, ATLAS_LAST];
  const finish = useCallback(() => {
    markDone();
    router.push("/");
  }, [router]);
  const next = useCallback(() => (i < pages.length - 1 ? setI(i + 1) : finish()), [i, finish, pages.length]);
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

  // a swipe moves between pages on a phone
  const [touchX, setTouchX] = useState<number | null>(null);

  const p = pages[i];
  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto"
      style={{ background: `radial-gradient(ellipse at 50% 20%, ${C.navy2}, ${C.navy} 70%)`, color: C.ivory }}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (dx < -60) next();
        if (dx > 60) back();
        setTouchX(null);
      }}
    >
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex items-center justify-between text-sm" style={{ color: C.ivory2 }}>
          <span className="font-serif tracking-wide" style={{ color: C.gold }}>{i === 0 ? "" : "Geopolitica"}</span>
          <button type="button" onClick={finish} className="rounded-full px-3 py-1 hover:underline" style={{ color: C.ivory2 }}>
            Skip to the map
          </button>
        </div>

        <div key={i} className="flex flex-1 animate-[fadein_.45s_ease] flex-col justify-center py-5">{p.body}</div>

        <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 px-5 pb-3 pt-3 sm:static sm:mx-0 sm:px-0 sm:pb-2" style={{ background: `linear-gradient(transparent, ${C.navy} 35%)` }}>
          <button type="button" onClick={back} disabled={i === 0} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm disabled:opacity-0" style={{ color: C.ivory2 }}>
            <ArrowLeft size={16} aria-hidden /> Back
          </button>
          <div className="flex gap-2" aria-label={`Page ${i + 1} of ${pages.length}`}>
            {pages.map((_, n) => (
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
    <div className="grid items-center gap-6 sm:gap-8 lg:grid-cols-[1.05fr_1fr]">
      <div className="order-2 lg:order-1">
        {step ? <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: C.gold }}>{step}</p> : null}
        <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-5xl" style={{ color: C.ivory }}>{title}</h1>
        <p className="mt-3 font-serif text-[17px] leading-relaxed sm:mt-4 sm:text-lg" style={{ color: C.ivory2 }}>{lead}</p>
        <ul className="mt-5 space-y-3">
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

/* --- the illustrations: the map's own marks ---------------------------------------------- */

const ICON: Record<"money" | "goods" | "people", ReactNode> = {
  money: <path d="M12 3v18M16.5 7.5c-.8-1.3-2.4-2-4.5-2-2.6 0-4.3 1.3-4.3 3.1 0 4.3 9 2.3 9 6.8 0 1.9-1.9 3.1-4.7 3.1-2.3 0-4-.8-4.8-2.3" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />,
  goods: <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z M3.5 7.5 12 12l8.5-4.5 M12 12v9" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />,
  people: (
    <>
      <circle cx="12" cy="7.5" r="3.6" fill="none" stroke="#fff" strokeWidth="2.4" />
      <path d="M4.5 20.5c.4-4.2 3.3-6.6 7.5-6.6s7.1 2.4 7.5 6.6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
};
function Fam({ f, x, y, r = 12 }: { f: "money" | "goods" | "people"; x: number; y: number; r?: number }) {
  const s = r * 1.15;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={C[f]} stroke={C.navy} strokeWidth="2" />
      <svg x={x - s / 2} y={y - s / 2} width={s} height={s} viewBox="0 0 24 24">{ICON[f]}</svg>
    </g>
  );
}
function Ring({ x, y, r, parts }: { x: number; y: number; r: number; parts: ("money" | "goods" | "people")[] }) {
  const n = parts.length;
  return (
    <g>
      {parts.map((f, k) => {
        const a0 = -Math.PI / 2 + (2 * Math.PI * k) / n + 0.12, a1 = -Math.PI / 2 + (2 * Math.PI * (k + 1)) / n - 0.12;
        return <path key={k} d={`M${x + r * Math.cos(a0)},${y + r * Math.sin(a0)} A${r},${r} 0 0 1 ${x + r * Math.cos(a1)},${y + r * Math.sin(a1)}`} fill="none" stroke={C[f]} strokeWidth="3" />;
      })}
    </g>
  );
}

function MapArt() {
  return (
    <svg viewBox="0 0 420 300" className="mx-auto w-full max-w-[22rem] sm:max-w-md" role="img" aria-label="The map: event dots ringed by colour; one is selected, its fuel dots around it and its story in a panel">
      <ellipse cx="160" cy="150" rx="150" ry="120" fill="none" stroke={C.gold} strokeOpacity=".25" />
      <line x1="10" y1="150" x2="310" y2="150" stroke={C.gold} strokeOpacity=".12" />
      <ellipse cx="160" cy="150" rx="80" ry="120" fill="none" stroke={C.gold} strokeOpacity=".12" />
      <path d="M60 90 Q 120 60 150 130" fill="none" stroke={C.gold} strokeOpacity=".35" />
      <path d="M90 220 Q 130 200 150 140" fill="none" stroke={C.goods} strokeWidth="2.4" />
      <circle cx="60" cy="90" r="6" fill={C.other} /><Ring x={60} y={90} r={10} parts={["people", "money"]} />
      <circle cx="90" cy="220" r="8" fill={C.gold} /><Ring x={90} y={220} r={12} parts={["goods", "people"]} />
      <circle cx="250" cy="200" r="5" fill="none" stroke={C.gold} strokeWidth="2" />
      <circle cx="150" cy="140" r="9" fill={C.gold} />
      <circle cx="150" cy="140" r="16" fill="none" stroke={C.ivory} strokeDasharray="2 2" />
      <circle cx="150" cy="140" r="20" fill="none" stroke={C.gold} className="map-pulse" style={{ transformOrigin: "150px 140px" }} />
      {([["money", 150, 96], ["goods", 192, 152], ["people", 112, 168]] as const).map(([f, x, y]) => (
        <g key={f}>
          <line x1="150" y1="140" x2={x} y2={y} stroke={C[f]} strokeDasharray="2 3" />
          <Fam f={f} x={x} y={y} r={11} />
        </g>
      ))}
      <g transform="translate(300 30)">
        <rect width="112" height="240" rx="12" fill={C.navy2} stroke={C.gold} strokeOpacity=".4" />
        <rect x="10" y="14" width="56" height="6" rx="3" fill={C.ivory2} opacity=".6" />
        <rect x="10" y="28" width="90" height="10" rx="3" fill={C.ivory} />
        <rect x="10" y="44" width="70" height="10" rx="3" fill={C.ivory} />
        <rect x="10" y="64" width="54" height="16" rx="4" fill={C.gold} />
        <Fam f="money" x={20} y={104} r={8} /><rect x="34" y="100" width="66" height="7" rx="3" fill={C.ivory2} opacity=".7" />
        <Fam f="goods" x={20} y={128} r={8} /><rect x="34" y="124" width="58" height="7" rx="3" fill={C.ivory2} opacity=".7" />
        <Fam f="people" x={20} y={152} r={8} /><rect x="34" y="148" width="62" height="7" rx="3" fill={C.ivory2} opacity=".7" />
        <rect x="10" y="176" width="92" height="6" rx="3" fill={C.ivory2} opacity=".35" />
        <rect x="10" y="190" width="80" height="6" rx="3" fill={C.ivory2} opacity=".35" />
        <rect x="10" y="204" width="86" height="6" rx="3" fill={C.ivory2} opacity=".35" />
      </g>
    </svg>
  );
}

function MovesArt() {
  return (
    <svg viewBox="0 0 420 300" className="mx-auto w-full max-w-[22rem] sm:max-w-md" role="img" aria-label="Money, goods and people, each a colour and an icon; lines in the colour of what they carry">
      {([["money", 70, "Money"], ["goods", 210, "Goods"], ["people", 350, "People"]] as const).map(([f, x, label]) => (
        <g key={f}>
          <Fam f={f} x={x} y={62} r={30} />
          <text x={x} y={118} textAnchor="middle" fill={C.ivory} fontSize="17" fontWeight="600">{label}</text>
        </g>
      ))}
      <circle cx="320" cy="215" r="13" fill={C.gold} />
      <circle cx="80" cy="190" r="9" fill={C.other} />
      <path d="M90 192 Q 200 160 305 211" fill="none" stroke={C.goods} strokeWidth="3" />
      <path d="M295 210 l10 2 -7 7z" fill={C.goods} />
      <Fam f="goods" x={196} y={176} r={10} />
      <text x="150" y="150" fill={C.ivory2} fontSize="12">feeds in through goods</text>
      <circle cx="120" cy="270" r="9" fill={C.other} />
      <path d="M308 222 Q 220 270 132 270" fill="none" stroke={C.gold} strokeWidth="2.4" />
      <path d="M140 266 l-9 4 9 4z" fill={C.gold} />
      <text x="170" y="292" fill={C.ivory2} fontSize="12">ripples on, in gold</text>
    </svg>
  );
}

function YoursArt({ enterprise }: { enterprise?: boolean }) {
  const rows = enterprise
    ? ([[FileText, 170, "Build a report"], [CalendarClock, 190, "Change radar"], [Building2, 150, "Your company"]] as const)
    : ([[FileText, 170, "Build a report"], [Bookmark, 190, "Follow"], [MessageCircleQuestion, 150, "Ask"]] as const);
  return (
    <svg viewBox="0 0 420 300" className="mx-auto w-full max-w-[22rem] sm:max-w-md" role="img" aria-label={rows.map((r) => r[2]).join(", ")}>
      {rows.map(([Icon, w, label], n) => (
        <g key={label} transform={`translate(70 ${20 + n * 95})`}>
          <rect width="280" height="62" rx="12" fill={C.navy2} stroke={C.gold} strokeOpacity=".35" />
          <circle cx="34" cy="31" r="18" fill={C.gold} />
          <foreignObject x="22" y="19" width="24" height="24">
            <Icon size={24} color={C.navy} strokeWidth={2.2} />
          </foreignObject>
          <text x="66" y="28" fill={C.ivory} fontSize="15" fontWeight="600">{label}</text>
          <rect x="66" y="38" width={w - 40} height="7" rx="3" fill={C.ivory2} opacity=".5" />
          {n === 0 ? (
            <g transform="translate(244 18)">
              <circle cx="12" cy="13" r="12" fill={C.gold} opacity=".18" />
              <foreignObject x="4" y="5" width="16" height="16"><Lock size={16} color={C.gold} /></foreignObject>
            </g>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

const gold = (t: ReactNode) => <span style={{ color: C.gold }}>{t}</span>;
const fam = (f: "money" | "goods" | "people", label: string) => (
  <span className="mx-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium" style={{ background: C[f], color: "#fff" }}>{label}</span>
);

const COMMON: { cta: string; body: ReactNode }[] = [
  {
    cta: "How it works",
    body: (
      <div className="mx-auto max-w-3xl text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/brand/logo.jpg`} alt="Geopolitica" className="mx-auto w-full max-w-[16rem] rounded-xl sm:max-w-md" />
        <h1 className="mt-5 font-serif text-3xl sm:text-4xl" style={{ color: C.ivory }}>What does Geopolitica mean?</h1>
        <p className="mx-auto mt-4 max-w-2xl font-serif text-[17px] leading-relaxed sm:text-lg" style={{ color: C.ivory2 }}>
          {gold("Geo")} is the Earth: its places, borders, sea lanes and resources. {gold("Politica")} is the affairs of states and the
          people in them. Together they ask one question: <span style={{ color: C.ivory }}>how does geography shape who holds power, and how they use it?</span>
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed" style={{ color: C.ivory2 }}>
          Geopolitica follows that one event at a time. A strike in one country, a war at sea or a vote in a capital ripples into prices,
          jobs and lives far away. The map shows how, and why, in a few minutes.
        </p>
      </div>
    ),
  },
  {
    cta: "Next",
    body: (
      <Page
        step="How it works · 1 of 3"
        title="The map is the front page"
        lead="Every dot is a world event that matters now, checked against its sources and refreshed through the day. Everything else opens from the map."
        art={<MapArt />}
        points={[
          { text: <>{gold("Glowing gold")} dots are severe, pale ones are developing, a {gold("gold ring")} marks one coming up: a vote, a summit, a deadline. A pulsing ring means its news is rising today.</> },
          { text: <>Click or tap a dot and the map {gold("flies to it")}. The panel tells its story: what changed, what is fueling it, and where it ripples next.</> },
          { text: <>Drag to move. Scroll, pinch or double-tap to zoom in on the spot you point at. ⟲ shows the whole world again.</> },
        ]}
      />
    ),
  },
  {
    cta: "Next",
    body: (
      <Page
        step="How it works · 2 of 3"
        title="Money, goods, people"
        lead="Something moves from one event into the next. Every colour on the map is one part of the economy, and each always comes with its icon and its name."
        art={<MovesArt />}
        points={[
          { text: <>{fam("money", "Money")} markets, rates, budgets. {fam("goods", "Goods")} energy, trade, food. {fam("people", "People")} jobs, prices at home, politics, security.</> },
          { text: <>The {gold("ring around a dot")} is what is fueling it. Open the event and the small local developments behind it fan out, each with its own news.</> },
          { text: <>Events {gold("feeding in")} arrive along a line in the colour of what they carry; {gold("gold lines")} show where it ripples next; dotted lines join events that share a driver.</> },
          { text: <>The {gold("key stays on screen")}. Point at a colour to light it up. After a few looks and one quick check, the words step back.</> },
        ]}
      />
    ),
  },
];

const ATLAS_LAST = {
  cta: "Open the map",
  body: (
    <Page
      step="How it works · 3 of 3"
      title="Make it yours"
      lead="A free account opens the reports and keeps what you follow in step on every device."
      art={<YoursArt />}
      points={[
        { icon: <FileText size={18} color={C.gold} aria-hidden />, text: <>{gold("Build a report")} on any event, at the size you need: a 3-minute snapshot, a standard brief or a deep dive, built around what is fueling it. Reports need a free account.</> },
        { icon: <Bookmark size={18} color={C.gold} aria-hidden />, text: <>{gold("Follow")} any event. Your tracker and a daily or weekly email show what changed since you last looked.</> },
        { icon: <MessageCircleQuestion size={18} color={C.gold} aria-hidden />, text: <>{gold("Ask")} a question while you read, answered from the event&apos;s report, connections and headlines.</> },
      ]}
    />
  ),
};

const ENTERPRISE_LAST = {
  cta: "Open the map",
  body: (
    <Page
      step="How it works · 3 of 3"
      title="Take it to your company"
      lead="The same map, with tools for the people who have to act on it. Reports need a free account."
      art={<YoursArt enterprise />}
      points={[
        { icon: <FileText size={18} color={C.gold} aria-hidden />, text: <>{gold("Build a report")} on any event, at the size you need, built around what is fueling it. Sign in first; each account gets a few a day.</> },
        { icon: <CalendarClock size={18} color={C.gold} aria-hidden />, text: <>The {gold("change radar")} lists dated rules, tariffs and strikes by when they bite.</> },
        { icon: <Building2 size={18} color={C.gold} aria-hidden />, text: <>The {gold("company impact report")} takes your suppliers, parts, lanes and sites and gives each department its brief. Find all of it in the map panel&apos;s Tools tab.</> },
      ]}
    />
  ),
};
