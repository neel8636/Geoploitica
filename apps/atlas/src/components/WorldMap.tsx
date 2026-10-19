"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { geoNaturalEarth1, geoPath, geoInterpolate } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Polygon } from "geojson";
import land110 from "world-atlas/land-110m.json";
import { allEdges, EVENTS, LINK_WORDS, TYPE_LABELS, type EventType, type WorldEvent } from "@/content/events";

const W = 960;
const H = 500;

type View = "world" | "europe";

// Europe holds most of the tracked events, so it gets its own framing.
const EUROPE: Polygon = {
  type: "Polygon",
  // clockwise, as d3-geo requires for a polygon that means "this area" and not "everything but"
  coordinates: [[[-14, 34], [-14, 64], [44, 64], [44, 34], [-14, 34]]],
};

function viewFor(e: WorldEvent | undefined): View {
  if (!e) return "world";
  return e.lon >= -14 && e.lon <= 44 && e.lat >= 34 && e.lat <= 64 ? "europe" : "world";
}

// Push apart dots that would sit on top of each other (three Paris events, two Brussels ones).
function spread(points: { id: string; x: number; y: number; r: number }[]) {
  for (let iter = 0; iter < 40; iter++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i], b = points[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const min = a.r + b.r + 2;
        if (dist < min) {
          const push = (min - dist) / 2;
          const ux = dx / dist, uy = dy / dist;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return points;
}

/*
  The atlas: every tracked event as a dot sized by severity, arcs between connected events,
  and a focus event whose neighbourhood lights up. Click a dot to open its report.
  Land is drawn once from the 110m world atlas; everything else comes from events.ts.
*/
export default function WorldMap({
  focusId,
  filter,
  compact = false,
}: {
  focusId?: string;
  filter?: EventType | "all";
  compact?: boolean;
}) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<View>(() => viewFor(EVENTS.find((e) => e.id === focusId)));

  const { landPath, projection } = useMemo(() => {
    const projection = geoNaturalEarth1();
    if (view === "europe") projection.fitExtent([[8, 8], [W - 8, H - 8]], EUROPE);
    else projection.fitExtent([[8, 8], [W - 8, H - 8]], { type: "Sphere" });
    const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
    const land = feature(topo, topo.objects.land);
    const landPath = geoPath(projection)(land) ?? "";
    return { landPath, projection };
  }, [view]);

  const visible = EVENTS.filter((e) => !filter || filter === "all" || e.type === filter);
  const visibleIds = new Set(visible.map((e) => e.id));
  const edges = allEdges().filter((ed) => visibleIds.has(ed.a) && visibleIds.has(ed.b));
  const active = hover ?? focusId ?? null;
  const activeNeighbours = new Set(
    edges.filter((ed) => ed.a === active || ed.b === active).flatMap((ed) => [ed.a, ed.b]),
  );

  const radius = (e: WorldEvent) => (view === "europe" ? 5 + e.severity * 2 : 3 + e.severity * 1.4);
  const placed = new Map(
    spread(
      visible.map((e) => {
        const p = projection([e.lon, e.lat]) ?? [0, 0];
        return { id: e.id, x: p[0], y: p[1], r: radius(e) };
      }),
    ).map((p) => [p.id, p]),
  );
  const pos = (e: WorldEvent): [number, number] => {
    const p = placed.get(e.id);
    return p ? [p.x, p.y] : [0, 0];
  };
  const inFrame = (e: WorldEvent) => view === "world" || (e.lon >= -14 && e.lon <= 44 && e.lat >= 34 && e.lat <= 64);
  const offFrame = visible.filter((e) => !inFrame(e));

  const arc = (a: WorldEvent, b: WorldEvent) => {
    // a great-circle arc sampled through the projection, so it curves with the map;
    // the ends snap to the spread dot positions so lines meet their dots
    const interp = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
    const [ax, ay] = pos(a);
    const [bx, by] = pos(b);
    const pts: string[] = [`M${ax.toFixed(1)} ${ay.toFixed(1)}`];
    for (let i = 1; i < 24; i++) {
      const p = projection(interp(i / 24));
      if (p) pts.push(`L${p[0].toFixed(1)} ${p[1].toFixed(1)}`);
    }
    pts.push(`L${bx.toFixed(1)} ${by.toFixed(1)}`);
    return pts.join("");
  };

  const hovered = hover ? EVENTS.find((e) => e.id === hover) : null;
  const toggle = (v: View) =>
    `rounded-full border px-2.5 py-0.5 text-xs ${view === v ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`;

  return (
    <figure className="relative w-full">
      <div className="absolute left-2 top-2 z-10 flex gap-1" role="group" aria-label="Map view">
        <button type="button" className={toggle("world")} onClick={() => setView("world")}>World</button>
        <button type="button" className={toggle("europe")} onClick={() => setView("europe")}>Europe</button>
      </div>
      {view === "europe" && offFrame.length ? (
        <p className="absolute right-2 top-2 z-10 max-w-[18rem] text-right text-xs text-ink-2">
          Off the frame: {offFrame.map((e) => e.title.split(" ").slice(0, 3).join(" ")).join(" · ")}
        </p>
      ) : null}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="World map of tracked events and their connections" className="w-full" fontFamily="var(--font-sans)">
        <path d={landPath} fill="var(--paper-2)" stroke="var(--line)" strokeWidth={0.5} />
        <g aria-hidden>
          {edges.map((ed) => {
            const a = EVENTS.find((e) => e.id === ed.a)!;
            const b = EVENTS.find((e) => e.id === ed.b)!;
            const lit = active ? ed.a === active || ed.b === active : false;
            const dim = active ? !lit : false;
            return (
              <path
                key={`${ed.a}|${ed.b}`}
                d={arc(a, b)}
                fill="none"
                stroke={lit ? "var(--teal)" : "var(--ink-3)"}
                strokeOpacity={dim ? 0.15 : lit ? 0.9 : 0.45}
                strokeWidth={lit ? 1.6 : 0.9}
                strokeDasharray={ed.kind === "shares_driver" || ed.kind === "competes_with" ? "3 3" : undefined}
              />
            );
          })}
        </g>
        {visible.map((e) => {
          const [x, y] = pos(e);
          const r = radius(e);
          const isActive = active === e.id;
          const related = activeNeighbours.has(e.id);
          const dim = active ? !isActive && !related : false;
          const fill = e.status === "scheduled" ? "var(--paper)" : isActive ? "var(--teal)" : e.severity >= 4 ? "var(--amber)" : "var(--teal)";
          return (
            <g key={e.id} opacity={dim ? 0.35 : 1} style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(e.id)} onMouseLeave={() => setHover(null)}
              onClick={() => router.push(`/events/${e.id}`)}>
              {isActive ? <circle cx={x} cy={y} r={r + 7} fill="none" stroke="var(--teal)" strokeWidth={1} strokeOpacity={0.6} /> : null}
              <circle cx={x} cy={y} r={r} fill={fill} stroke={isActive || related ? "var(--teal)" : "var(--ink)"} strokeWidth={isActive ? 2 : 1} tabIndex={0} role="link" aria-label={e.title}
                onFocus={() => setHover(e.id)} onBlur={() => setHover(null)}
                onKeyDown={(k) => { if (k.key === "Enter") router.push(`/events/${e.id}`); }}>
                <title>{e.title}</title>
              </circle>
              {isActive || related ? (
                <text x={x + r + 4} y={y + 4} fontSize={11} fill="var(--ink)" stroke="var(--paper)" strokeWidth={3} paintOrder="stroke">
                  {e.title.length > 34 ? e.title.slice(0, 32) + "…" : e.title}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {!compact ? (
        <figcaption className="mt-2 flex min-h-[3.25rem] flex-wrap items-start justify-between gap-3 text-[15px]">
          <div className="max-w-prose">
            {hovered ? (
              <>
                <span className="font-medium">{hovered.title}</span>
                <span className="text-ink-2"> · {TYPE_LABELS[hovered.type]} · {edges.filter((ed) => ed.a === hovered.id || ed.b === hovered.id).length} connections. Click to open.</span>
              </>
            ) : (
              <span className="text-ink-2">
                {visible.length} events, {edges.length} connections. Dot size is severity; amber is severe; hollow dots are scheduled. Hover to light up a neighbourhood, click to open the report.
              </span>
            )}
          </div>
          <div className="text-sm text-ink-2">
            Solid line: one {LINK_WORDS.causes} or {LINK_WORDS.affects} the other · dashed: {LINK_WORDS.shares_driver}
          </div>
        </figcaption>
      ) : null}
    </figure>
  );
}
