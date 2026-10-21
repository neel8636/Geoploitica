import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/*
  The share card shown when an atlas link is posted on LinkedIn, Reddit, X, WhatsApp or Slack:
  1200×630, built at export time. Left: what the event is and the first ring of its ripple.
  Right: the rings themselves, drawn as concentric circles.
*/
export const shareSize = { width: 1200, height: 630 };

const C = { paper: "#0a1220", paper2: "#121e31", ink: "#f4e9d4", ink2: "#b9b3a6", line: "#26364f", teal: "#d9ad5f", amber: "#e39a55" }; // Night: navy and gold, like the logo

async function fonts() {
  const dir = join(process.cwd(), "node_modules/@fontsource/ibm-plex-sans/files");
  const [regular, semi] = await Promise.all([
    readFile(join(dir, "ibm-plex-sans-latin-400-normal.woff")),
    readFile(join(dir, "ibm-plex-sans-latin-600-normal.woff")),
  ]);
  return [
    { name: "Plex", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Plex", data: semi, weight: 600 as const, style: "normal" as const },
  ];
}

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export async function shareCard({ kicker, title, lines, footer, rings = 3 }: { kicker: string; title: string; lines: string[]; footer: string; rings?: number }) {
  const ringCount = Math.max(2, Math.min(rings, 4));
  const R = 228;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: C.paper, fontFamily: "Plex", color: C.ink }}>
        <div style={{ display: "flex", flexDirection: "column", width: 700, padding: "56px 0 48px 64px" }}>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: 2, color: C.teal }}>GEOPOLITICA ATLAS</div>
          <div style={{ display: "flex", fontSize: 18, color: C.ink2, marginTop: 6 }}>{clip(kicker, 70)}</div>
          <div style={{ display: "flex", fontSize: title.length > 60 ? 46 : 54, fontWeight: 600, lineHeight: 1.08, marginTop: 22 }}>{clip(title, 90)}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 26, gap: 12 }}>
            {lines.slice(0, 3).map((l) => (
              <div key={l} style={{ display: "flex", fontSize: 22, lineHeight: 1.3, color: C.ink2 }}>
                <div style={{ display: "flex", width: 12, height: 12, borderRadius: 6, background: C.amber, marginTop: 9, marginRight: 14, flexShrink: 0 }} />
                <div style={{ display: "flex" }}>{clip(l, 82)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 21, color: C.teal, fontWeight: 600 }}>{footer}</div>
        </div>
        <div style={{ display: "flex", position: "relative", width: 500, height: 630, alignItems: "center", justifyContent: "center" }}>
          {Array.from({ length: ringCount }, (_, i) => {
            const r = R - i * (R - 60) / ringCount;
            return (
              <div
                key={i}
                style={{ position: "absolute", left: 250 - r, top: 315 - r, width: r * 2, height: r * 2, borderRadius: r, border: `2px ${i === 0 ? "dashed" : "solid"} ${C.line}`, display: "flex" }}
              />
            );
          })}
          {Array.from({ length: 9 }, (_, i) => {
            const ring = i % ringCount;
            const r = R - ring * (R - 60) / ringCount;
            const ang = (i * 137.5 * Math.PI) / 180;
            const x = 250 + r * Math.cos(ang), y = 315 + r * Math.sin(ang);
            return <div key={`d${i}`} style={{ position: "absolute", left: x - 9, top: y - 9, width: 18, height: 18, borderRadius: 9, background: ring === ringCount - 1 ? C.amber : C.teal, display: "flex" }} />;
          })}
          <div style={{ position: "absolute", left: 250 - 42, top: 315 - 42, width: 84, height: 84, borderRadius: 42, background: C.ink, display: "flex" }} />
        </div>
      </div>
    ),
    { ...shareSize, fonts: await fonts() },
  );
}
