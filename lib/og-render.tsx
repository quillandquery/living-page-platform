/**
 * THE OG FRAME (Module 4, PART 4 — OG IMAGE).
 *
 *   Living Page → Story Hero → OG renderer → 1200×630 image
 *
 * Reuses the SAME primitives the reader page draws from — a world's real
 * colours (`lib/backdrops.ts`), the story's own signature doodle (the
 * generated-stroke system in `components/doodles/`) — rather than a
 * second, separate visual system built only for sharing. Motion is
 * simplified into a static frame, as the module requires.
 *
 * Deliberately plain CSS-in-JS (Satori/`next/og`'s subset): flexbox only,
 * literal hex colours (no `color-mix`, no CSS custom properties — those
 * only exist in the browser-rendered reader), no external font or image
 * fetches, so this renders the same way every time, for a crawler with no
 * JavaScript, with no network dependency to fail.
 */
import { DOODLES } from "@/components/doodles/registry";
import { strokePaths } from "@/components/doodles/Doodle";
import { getBackdrop, BACKDROPS } from "./backdrops";
import { ENVIRONMENT_FALLBACK_ARTWORK } from "./art-direction/artwork";

export const OG_SIZE = { width: 1200, height: 630 };

export function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function fontSizeFor(headline: string): number {
  if (headline.length > 110) return 38;
  if (headline.length > 80) return 46;
  if (headline.length > 50) return 54;
  return 66;
}

export type StoryOgFrameProps = {
  kicker: string;
  headline: string;
  environmentKey: string;
  /** the story's own signature doodle, when it has Story Visual System 2.0
   *  direction; falls back to the environment's own default object so a
   *  pre-2.0 story still gets something that traces to its world, never a
   *  random pick (mirrors `ENVIRONMENT_FALLBACK_ARTWORK`'s own reasoning). */
  doodleName?: string | null;
  seed?: number;
};

export function StoryOgFrame({ kicker, headline, environmentKey, doodleName, seed = 7 }: StoryOgFrameProps) {
  const backdrop = getBackdrop(environmentKey) ?? BACKDROPS.dawn;
  const dark = backdrop.scheme === "dark";
  const bg = backdrop.paperTint ?? (dark ? "#14161C" : "#F5F0E4");
  const accent = backdrop.accent;
  const ink = dark ? "#F3F1EA" : "#1A1816";
  const mute = dark ? "rgba(243,241,234,0.55)" : "rgba(26,24,22,0.45)";

  const doodleKey = (doodleName && DOODLES[doodleName]) ? doodleName : (ENVIRONMENT_FALLBACK_ARTWORK[environmentKey] ?? "spiral");
  const make = DOODLES[doodleKey] ?? DOODLES.spiral;
  const strokes = make ? strokePaths(make(), seed, 2.4) : [];

  return (
    <div
      style={{
        width: 1200, height: 630, display: "flex", flexDirection: "column",
        justifyContent: "space-between", background: bg, padding: "64px 76px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 12, height: 12, borderRadius: 999, background: accent, display: "flex" }} />
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 5, textTransform: "uppercase", color: accent, fontWeight: 700 }}>
          {kicker || "Living Page"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 48 }}>
        <div style={{ display: "flex", fontSize: fontSizeFor(headline), lineHeight: 1.18, fontWeight: 700, color: ink, maxWidth: 740 }}>
          {headline}
        </div>
        {strokes.length ? (
          <svg width="230" height="230" viewBox="-6 -6 112 112" style={{ flexShrink: 0 }}>
            {strokes.map((p, i) => (
              <path key={i} d={p.d} stroke={accent} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>
        ) : null}
      </div>

      <div style={{ display: "flex", fontSize: 20, letterSpacing: 3, color: mute, textTransform: "uppercase" }}>
        Living Page
      </div>
    </div>
  );
}

/** The one fallback frame — a story that vanished between the crawler's
 *  request and now, or any other lookup miss. Still on-brand, never a
 *  broken image. */
export function FallbackOgFrame() {
  return (
    <div
      style={{
        width: 1200, height: 630, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#F5F0E4", fontFamily: "sans-serif", fontSize: 48, fontWeight: 700, color: "#1A1816",
      }}
    >
      Living Page
    </div>
  );
}
