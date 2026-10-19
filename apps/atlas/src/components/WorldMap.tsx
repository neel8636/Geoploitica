"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { geoNaturalEarth1, geoPath, geoInterpolate } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { MultiPoint } from "geojson";
import land110 from "world-atlas/land-110m.json";
import { allEdges, EVENTS, TYPE_LABELS, type EventType, type WorldEvent } from "@/content/events";
import MapLegend from "@/components/atlas/MapLegend";

const W = 960;
const H = 500;

export type View = "world" | "europe" | "americas" | "asia" | "mea";

// Framings the reader can jump between. Every event is always drawn; a frame only decides
// what is in view. bbox is [west, south, east, north].
export const VIEWS: Record<View, { label: string; bbox?: [number, number, number, number] }> = {
  world: { label: "World" },
  europe: { label: "Europe", bbox: [-14, 34, 44, 64] },
  americas: { label: "Americas", bbox: [-128, -36, -32, 60] },
  asia: { label: "Asia-Pacific", bbox: [60, -12, 150, 52] },
  mea: { label: "Middle East & Africa", bbox: [-20, -36, 64, 42] },
};

// The frame is fitted to points, not a polygon, so its edges do not bulge along great circles.
function pointsFor(bbox: [number, number, number, number]): MultiPoint {
  const [w, s, e, n] = bbox;
  const cx = (w + e) / 2;
  const cy = (s + n) / 2;
  return { type: "MultiPoint", coordinates: [[w, s], [w, n], [e, n], [e, s], [cx, s], [cx, n], [w, cy], [e, cy], [w, 0], [e, 0]] };
}

function inBox(e: WorldEvent, bbox?: [number, number, number, number]) {
  if (!bbox) return true;
  const [w, s, ee, n] = bbox;
  return e.lon >= w && e.lon <= ee && e.lat >= s && e.lat <= n;
}

export function viewFor(e: WorldEvent | undefined): View {
  if (!e) return "world";
  for (const v of ["europe", "americas", "asia", "mea"] as View[]) {
    if (inBox(e, VIEWS[v].bbox)) return v;
  }
  return "world";
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
  initialView,
  view: controlledView,
  onView,
  hideFrames = false,
}: {
  focusId?: string;
  filter?: EventType | "all";
  compact?: boolean;
  initialView?: View;
  view?: View; // controlled, when a parent owns the frame
  onView?: (v: View) => void;
  hideFrames?: boolean; // when the parent draws its own frame chips
}) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const [ownView, setOwnView] = useState<View>(() => initialView ?? viewFor(EVENTS.find((e) => e.id === focusId)));
  const view = controlledView ?? ownView;
  const setView = (v: View) => {
    setOwnView(v);
    onView?.(v);
  };

  const { landPath, projection, frame } = useMemo(() => {
    const projection = geoNaturalEarth1();
    const bbox = VIEWS[view].bbox;
    if (bbox) projection.fitExtent([[8, 8], [W - 8, H - 8]], pointsFor(bbox));
    else projection.fitExtent([[8, 8], [W - 8, H - 8]], { type: "Sphere" });
    const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
    const land = feature(topo, topo.objects.land);
    const landPath = geoPath(projection)(land) ?? "";
    // the frame's own rectangle on the canvas, so what lies outside it can be dimmed
    let frame: { x: number; y: number; w: number; h: number } | null = null;
    if (bbox) {
      const [w, s, e, n] = bbox;
      const latForWidth = s <= 0 && n >= 0 ? 0 : Math.abs(s) < Math.abs(n) ? s : n;
      const left = projection([w, latForWidth])?.[0] ?? 0;
      const right = projection([e, latForWidth])?.[0] ?? W;
      const top = projection([(w + e) / 2, n])?.[1] ?? 0;
      const bottom = projection([(w + e) / 2, s])?.[1] ?? H;
      frame = { x: left, y: top, w: right - left, h: bottom - top };
    }
    return { landPath, projection, frame };
  }, [view]);

  const visible = EVENTS.filter((e) => !filter || filter === "all" || e.type === filter);
  const visibleIds = new Set(visible.map((e) => e.id));
  const edges = allEdges().filter((ed) => visibleIds.has(ed.a) && visibleIds.has(ed.b));
  const active = hover ?? focusId ?? null;
  const activeNeighbours = new Set(
    edges.filter((ed) => ed.a === active || ed.b === active).flatMap((ed) => [ed.a, ed.b]),
  );

  const radius = (e: WorldEvent) => (view !== "world" ? 5 + e.severity * 2 : 3 + e.severity * 1.4);
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
  const offFrame = visible.filter((e) => !inBox(e, VIEWS[view].bbox));

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
  // a compact map (inside a report) offers only the world and the event's own region
  const frames: View[] = compact
    ? Array.from(new Set<View>(["world", viewFor(EVENTS.find((e) => e.id === focusId))]))
    : (Object.keys(VIEWS) as View[]);
  const toggle = (v: View) =>
    `rounded-full border px-2.5 py-0.5 text-xs ${view === v ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`;

  return (
    <figure className="relative w-full">
      {!hideFrames ? (
        <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1" role="group" aria-label="Map frame">
          {frames.map((v) => (
            <button key={v} type="button" className={toggle(v)} onClick={() => setView(v)}>{VIEWS[v].label}</button>
          ))}
        </div>
      ) : null}
      {view !== "world" && !compact && offFrame.length ? (
        <p className="absolute right-2 top-2 z-10 text-right text-xs text-ink-2">
          {offFrame.length} more outside this frame · <button type="button" className="underline" onClick={() => setView("world")}>show the world</button>
        </p>
      ) : null}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="World map of tracked events and their connections" className="w-full" fontFamily="var(--font-sans)">
        <path d={landPath} fill="var(--paper-2)" stroke="var(--line)" strokeWidth={0.5} />
        {frame ? (
          <g aria-hidden fill="var(--paper)" fillOpacity={0.55}>
            <rect x={0} y={0} width={W} height={Math.max(0, frame.y)} />
            <rect x={0} y={frame.y + frame.h} width={W} height={Math.max(0, H - frame.y - frame.h)} />
            <rect x={0} y={frame.y} width={Math.max(0, frame.x)} height={frame.h} />
            <rect x={frame.x + frame.w} y={frame.y} width={Math.max(0, W - frame.x - frame.w)} height={frame.h} />
            <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} fill="none" stroke="var(--ink-3)" strokeDasharray="4 3" strokeWidth={0.8} />
          </g>
        ) : null}
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
        <figcaption className="mt-2">
          <p className="min-h-[1.5rem] text-[15px]">
            {hovered ? (
              <>
                <span className="font-medium">{hovered.title}</span>
                <span className="text-ink-2"> · {TYPE_LABELS[hovered.type]} · {edges.filter((ed) => ed.a === hovered.id || ed.b === hovered.id).length} connections. Click to open.</span>
              </>
            ) : (
              <span className="text-ink-2">
                {visible.length} events, {edges.length} connections. Hover a dot to light up its connections; click to open the report.
              </span>
            )}
          </p>
          <div className="mt-3 border-t border-line-2 pt-3">
            <MapLegend />
          </div>
        </figcaption>
      ) : (
        <figcaption className="mt-2 border-t border-line-2 pt-2">
          <MapLegend compact />
        </figcaption>
      )}
    </figure>
  );
}
