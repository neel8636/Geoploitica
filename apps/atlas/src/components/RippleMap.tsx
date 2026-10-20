"use client";

import { useId, useState } from "react";
import type { RippleRing } from "@/content/types";

interface Props {
  centre: string; // the event, short
  rings: RippleRing[]; // inner to outer
  compact?: boolean;
}

/*
  The ripple map: the event sits at the centre; each ring is an order of effect.
  Effects are dots on their ring with a short sector label, so a scanner gets the shape
  without hovering; hover, tap or tab to a dot reads the full effect.
  Drawn from dossier data, so it is never decorative.
*/
export default function RippleMap({ centre, rings, compact = false }: Props) {
  const id = useId();
  const size = 600;
  const cx = size / 2;
  const cy = size / 2;
  const innerR = 72;
  const outerPad = 70;
  const step = (size / 2 - innerR - outerPad) / rings.length;
  const [active, setActive] = useState<{ ring: number; i: number }>({ ring: 0, i: 0 });

  const dots = rings.flatMap((ring, ri) => {
    const r = innerR + step * (ri + 1);
    const n = ring.effects.length;
    return ring.effects.map((e, i) => {
      // spread dots around the ring; offset each ring so dots do not line up radially
      const deg = -54 + (360 / n) * i + ri * 27;
      const angle = deg * (Math.PI / 180);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      const cos = Math.cos(angle);
      const anchor: "start" | "end" | "middle" = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
      const lx = x + (anchor === "start" ? 11 : anchor === "end" ? -11 : 0);
      const ly = y + (anchor === "middle" ? (Math.sin(angle) < 0 ? -12 : 20) : 4);
      return { ring: ri, i, x, y, lx, ly, anchor, text: e.text, sector: e.sector ?? "" };
    });
  });

  const current = dots.find((d) => d.ring === active.ring && d.i === active.i);

  return (
    <figure className="w-full">
      <svg
        viewBox={`-80 0 ${size + 160} ${size}`} // side margin so long labels on the outer ring are not clipped
        role="img"
        aria-labelledby={`${id}-title`}
        className="mx-auto block w-full max-w-[680px]"
        fontFamily="var(--font-sans)"
      >
        {/* one string: React renders a <title> with several children as empty on the server */}
        <title id={`${id}-title`}>{`Ripple map: ${centre}, with ${rings.length} rings of effects`}</title>
        {rings.map((ring, ri) => {
          const r = innerR + step * (ri + 1);
          // ring labels sit at the top of each ring; dots start at -54 degrees so none lands there
          return (
            <g key={ring.label}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="var(--line)"
                strokeWidth={1}
                strokeDasharray={ri === 0 ? undefined : "3 5"}
              />
              <text x={cx} y={cy - r + 14} fontSize={11} fill="var(--ink-3)" textAnchor="middle">
                {ring.label}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={innerR} fill="var(--teal)" fillOpacity={0.12} stroke="var(--teal)" strokeWidth={1.5} />
        <foreignObject x={cx - innerR + 8} y={cy - innerR + 8} width={innerR * 2 - 16} height={innerR * 2 - 16}>
          <div className="flex h-full items-center justify-center text-center font-serif text-[15px] leading-tight text-ink">
            {centre}
          </div>
        </foreignObject>
        {dots.map((d) => {
          const isActive = active.ring === d.ring && active.i === d.i;
          return (
            <g key={`${d.ring}-${d.i}`}>
              <text
                x={d.lx}
                y={d.ly}
                fontSize={11.5}
                textAnchor={d.anchor}
                fill={isActive ? "var(--ink)" : "var(--ink-2)"}
                fontWeight={isActive ? 600 : 400}
                pointerEvents="none"
              >
                {d.sector}
              </text>
              <circle
                cx={d.x}
                cy={d.y}
                r={isActive ? 9 : 6.5}
                fill={isActive ? "var(--teal)" : "var(--paper)"}
                stroke="var(--teal)"
                strokeWidth={1.5}
                tabIndex={0}
                role="button"
                aria-label={d.text}
                className="cursor-pointer outline-none focus-visible:stroke-[3]"
                onMouseEnter={() => setActive({ ring: d.ring, i: d.i })}
                onFocus={() => setActive({ ring: d.ring, i: d.i })}
                onClick={() => setActive({ ring: d.ring, i: d.i })}
              />
            </g>
          );
        })}
      </svg>
      <figcaption
        className={`mx-auto mt-3 max-w-[600px] border-l-2 border-teal pl-3 text-[15px] ${compact ? "min-h-[3.5rem]" : "min-h-[4.5rem]"}`}
        aria-live="polite"
      >
        {current ? (
          <>
            <span className="text-ink-2">
              {rings[current.ring].label}
              {current.sector ? ` · ${current.sector}` : ""}:{" "}
            </span>
            {current.text}
            <span className="block text-sm text-ink-3">Hover, tap or tab to the other dots.</span>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
