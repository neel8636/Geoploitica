"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useRipple } from "@/components/ripple/RippleProvider";
import { geoNaturalEarth1, geoPath, geoInterpolate } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { MultiPoint } from "geojson";
import land110 from "world-atlas/land-110m.json";
import { allEdges, EVENTS, TYPE_LABELS, type EventType, type WorldEvent } from "@/content/events";
import MapLegend from "@/components/atlas/MapLegend";
import MapPanel, { dotFill } from "@/components/atlas/MapPanel";

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
  const pts: [number, number][] = [[w, s], [w, n], [e, n], [e, s], [cx, s], [cx, n], [w, cy], [e, cy]];
  // where the frame straddles the equator, its widest row is there, so include it
  if (s <= 0 && n >= 0) pts.push([w, 0], [e, 0]);
  return { type: "MultiPoint", coordinates: pts };
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
  pulse,
}: {
  focusId?: string;
  filter?: EventType | "all";
  compact?: boolean;
  initialView?: View;
  view?: View; // controlled, when a parent owns the frame
  onView?: (v: View) => void;
  hideFrames?: boolean; // when the parent draws its own frame chips
  pulse?: Record<string, "rising" | "steady" | "cooling" | "quiet">; // how fast each event's news is moving
}) {
  const router = useRouter();
  const ripple = useRipple();
  const [hover, setHover] = useState<string | null>(null); // pointer on a dot
  const [peek, setPeek] = useState<string | null>(null); // pointer on a row in the side panel
  const [selected, setSelected] = useState<string | null>(null); // clicked dot, kept until cleared
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
  // what the map lights up, and what the side panel describes
  const active = peek ?? hover ?? selected ?? focusId ?? null;
  const detailId = hover ?? selected;
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

  const arcPoints = (a: WorldEvent, b: WorldEvent): [number, number][] => {
    // a great-circle arc sampled through the projection, so it curves with the map;
    // the ends snap to the spread dot positions so lines meet their dots
    const interp = geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
    const pts: [number, number][] = [pos(a)];
    for (let i = 1; i < 24; i++) {
      const p = projection(interp(i / 24));
      if (p) pts.push([p[0], p[1]]);
    }
    pts.push(pos(b));
    return pts;
  };
  const toPath = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  // a small arrowhead at fraction t along the line, pointing from the first point to the last
  const arrowAt = (pts: [number, number][], t: number, reverse: boolean) => {
    const i = Math.max(1, Math.min(pts.length - 2, Math.round((pts.length - 1) * t)));
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i + 1];
    let ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
    if (reverse) ang += 180;
    const [x, y] = pts[i];
    return `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(0)})`;
  };
  const calm = useReducedMotion(); // no travelling dots for readers who ask for less motion

  const hovered = hover ? EVENTS.find((e) => e.id === hover) : null;
  const detail = detailId ? EVENTS.find((e) => e.id === detailId) ?? null : null;
  const inFrame = visible
    .filter((e) => inBox(e, VIEWS[view].bbox))
    .sort((a, b) => b.severity - a.severity || (a.date < b.date ? 1 : -1));
  // clicking an event opens its ripple postcard; on the full map the dot also stays selected
  // so its connections stay lit behind the card
  const choose = (id: string) => {
    if (compact) {
      if (ripple) ripple.open(id);
      else router.push(`/events/${id}`);
      return;
    }
    const next = selected === id ? null : id;
    setSelected(next);
    if (next) ripple?.open(next);
  };
  // a compact map (inside a report) offers only the world and the event's own region
  const frames: View[] = compact
    ? Array.from(new Set<View>(["world", viewFor(EVENTS.find((e) => e.id === focusId))]))
    : (Object.keys(VIEWS) as View[]);
  const toggle = (v: View) =>
    `rounded-full border px-2.5 py-0.5 text-xs ${view === v ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`;

  return (
    <figure className="w-full" onKeyDown={(k) => { if (k.key === "Escape") setSelected(null); }}>
      <div className={compact ? "" : "grid gap-3 lg:grid-cols-[minmax(0,1fr)_19rem]"}>
      <div className={compact ? "relative" : "relative self-start rounded-lg border border-line bg-paper p-1"}>
      {!hideFrames ? (
        <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1" role="group" aria-label="Map frame">
          {frames.map((v) => (
            <button key={v} type="button" className={toggle(v)} onClick={() => setView(v)}>{VIEWS[v].label}</button>
          ))}
        </div>
      ) : null}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="World map of tracked events and their connections" className="w-full" fontFamily="var(--font-sans)">
        <rect x={0} y={0} width={W} height={H} fill="transparent" onClick={() => setSelected(null)} />
        <path d={landPath} fill="var(--paper-2)" stroke="var(--line)" strokeWidth={0.5} onClick={() => setSelected(null)} />
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
            const pts = arcPoints(a, b);
            const d = toPath(pts);
            const dashed = ed.kind === "shares_driver" || ed.kind === "competes_with";
            const color = lit ? "var(--teal)" : "var(--ink-3)";
            const op = dim ? 0.15 : lit ? 0.9 : 0.45;
            // where the effect travels from: a ripple is "live" when its source's news is rising
            const source = ed.flow === "out" ? ed.a : ed.flow === "in" ? ed.b : null;
            const live = !dashed && !calm && source && pulse?.[source] === "rising" && !dim;
            const head = (t: number, reverse: boolean) => (
              <path d="M-3.5 -3 L3 0 L-3.5 3 Z" transform={arrowAt(pts, t, reverse)} fill={color} fillOpacity={op} />
            );
            return (
              <g key={`${ed.a}|${ed.b}`}>
                <path d={d} fill="none" stroke={color} strokeOpacity={op} strokeWidth={lit ? 1.6 : 0.9} strokeDasharray={dashed ? "3 3" : undefined} />
                {ed.flow === "out" ? head(0.55, false) : null}
                {ed.flow === "in" ? head(0.45, true) : null}
                {ed.flow === "both" ? <>{head(0.4, true)}{head(0.6, false)}</> : null}
                {live ? (
                  <circle r={2.6} fill="var(--amber)">
                    <animateMotion dur="3.2s" repeatCount="indefinite" path={source === ed.a ? d : toPath([...pts].reverse())} />
                  </circle>
                ) : null}
              </g>
            );
          })}
        </g>
        {visible.map((e) => {
          const [x, y] = pos(e);
          const r = radius(e);
          const isActive = active === e.id;
          const related = activeNeighbours.has(e.id);
          const dim = active ? !isActive && !related : false;
          const df = dotFill(e);
          const fill = df.hollow ? "var(--paper)" : df.fill;
          const isSelected = selected === e.id;
          return (
            <g key={e.id} opacity={dim ? 0.35 : 1} style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(e.id)} onMouseLeave={() => setHover(null)}
              onClick={(ev) => { ev.stopPropagation(); choose(e.id); }}>
              {pulse?.[e.id] === "rising" && !dim ? (
                <circle cx={x} cy={y} r={r + 3} fill="none" stroke="var(--amber)" strokeWidth={1.5} className={calm ? "" : "map-pulse"} style={{ transformOrigin: `${x}px ${y}px` }} />
              ) : null}
              {isActive || isSelected ? <circle cx={x} cy={y} r={r + 6} fill="none" stroke="var(--teal)" strokeWidth={isSelected ? 2 : 1} strokeOpacity={isSelected ? 0.9 : 0.6} /> : null}
              <circle cx={x} cy={y} r={r} fill={fill} stroke={isActive || related ? "var(--teal)" : "var(--ink)"} strokeWidth={isActive ? 2 : 1} tabIndex={0} role="button" aria-label={e.title} aria-pressed={compact ? undefined : isSelected} style={{ outline: "none" }}
                onFocus={() => setHover(e.id)} onBlur={() => setHover(null)}
                onKeyDown={(k) => { if (k.key === "Enter") choose(e.id); }}>
                <title>{e.title}</title>
              </circle>
              {/* the full map keeps names in the side panel; a small map labels only the event in focus */}
              {compact && isActive ? (
                <text x={x + r + 4} y={y + 4} fontSize={13} fill="var(--ink)" stroke="var(--paper)" strokeWidth={3} paintOrder="stroke">
                  {e.title.length > 34 ? e.title.slice(0, 32) + "…" : e.title}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      </div>
      {!compact ? (
        <div className="relative h-80 lg:h-auto">
          <div className="absolute inset-0">
            <MapPanel
              inFrame={inFrame}
              offFrameCount={view !== "world" ? offFrame.length : 0}
              detail={detail}
              selected={selected}
              visibleIds={visibleIds}
              onPeek={setPeek}
              onSelect={(id) => { setSelected(id); setPeek(null); if (id) ripple?.open(id); }}
              onShowWorld={() => setView("world")}
            />
          </div>
        </div>
      ) : null}
      </div>
      {!compact ? (
        <figcaption className="mt-2 text-sm text-ink-2">
          {hovered ? (
            <>
              <span className="font-medium text-ink">{hovered.title}</span> · {TYPE_LABELS[hovered.type]} ·{" "}
              {edges.filter((ed) => ed.a === hovered.id || ed.b === hovered.id).length} connections. Click to keep it in the panel.
            </>
          ) : (
            <>{visible.length} events, {edges.length} connections. Arrows show which way a ripple travels; a pulsing dot means its news is rising today. Click a dot to see its ripple.</>
          )}
        </figcaption>
      ) : (
        <figcaption className="mt-2 border-t border-line-2 pt-2">
          <MapLegend layout="compact" />
        </figcaption>
      )}
    </figure>
  );
}

const RM = "(prefers-reduced-motion: reduce)";
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia?.(RM);
      m?.addEventListener("change", cb);
      return () => m?.removeEventListener("change", cb);
    },
    () => window.matchMedia?.(RM).matches ?? false,
    () => false,
  );
}
