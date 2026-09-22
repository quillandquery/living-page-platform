/**
 * THE SHARE SCENE — an illustrated world, drawn for a still frame.
 *
 * The reader's `Backdrop` is a living, animated SVG world tied to scroll
 * depth (`components/living/Backdrop.tsx`) — built from DOM/CSS that
 * Satori can't render (no external stylesheet, no `color-mix()`, no
 * `var()`). A share frame needs the SAME identity — the story really did
 * happen somewhere, and typography alone made the old frame (`og-render`
 * v4) read as a quote card, not a living page — but drawn as one still
 * SVG, from the same data (`lib/backdrops.ts` `BACKDROPS`), so a coast
 * story and a monsoon story are recognisably different WORLDS on a share
 * card, not the same gradient recoloured.
 *
 * Data-driven per Decision D6: this switches on `Backdrop.layers`, the
 * same curated ~18-layer vocabulary the reader uses. A new world added to
 * BACKDROPS with an existing layer name draws correctly here with no new
 * code path; only a genuinely new layer kind needs a new case.
 *
 * Kept deliberately simple (SVG primitives only — circle/path/line/rect,
 * no filters, no gradients-on-gradients) because this is the one part of
 * the render tree Satori will actually refuse to draw if it reaches for
 * something outside its supported subset, and a share route that throws
 * is worse than a share route that's merely modest.
 */
import { Fragment, type ReactNode } from "react";
import type { Backdrop, Layer } from "./backdrops";

export type SceneProps = {
  backdrop: Backdrop;
  w: number;
  h: number;
  seed: number;
};

function mulberry32(seed: number) {
  let a = seed || 1;
  return function rnd() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(hexA: string, hexB: string, t: number): string {
  const p = (h: string) => {
    const m = /^#([0-9a-f]{6})$/i.exec(h.trim());
    const n = m ? parseInt(m[1], 16) : 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [ar, ag, ab] = p(hexA);
  const [br, bg, bb] = p(hexB);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${b})`;
}

export function alphaHex(hex: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(0,0,0,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** The base wash behind the illustrated layers — literal colours only
 *  (no `color-mix`/`var()`; Satori resolves neither). */
export function sceneGround(backdrop: Backdrop): string {
  return backdrop.paperTint ?? (backdrop.scheme === "dark" ? "#12141B" : "#F3EEE0");
}

export function ShareScene({ backdrop, w, h, seed }: SceneProps) {
  const rnd = mulberry32(seed);
  const dark = backdrop.scheme === "dark";
  const ground = sceneGround(backdrop);
  const accent = backdrop.accent;
  const accent2 = backdrop.secondaryAccent ?? accent;
  const horizonY = Math.round(h * 0.8);
  const ink = dark ? "#F3F1EA" : "#2A2620";

  const has = (l: Layer) => backdrop.layers.includes(l);
  const nodes: ReactNode[] = [];
  let key = 0;
  const push = (n: ReactNode) => nodes.push(<Fragment key={key++}>{n}</Fragment>);

  // ── sky bodies ──────────────────────────────────────────────────
  if (has("sun")) {
    const cx = w * 0.76, cy = h * 0.24, r = h * 0.1;
    push(<circle cx={cx} cy={cy} r={r * 2.1} fill={accent2} opacity={0.1} />);
    push(<circle cx={cx} cy={cy} r={r * 1.5} fill={accent2} opacity={0.16} />);
    push(<circle cx={cx} cy={cy} r={r} fill={accent2} opacity={0.92} />);
  }
  if (has("moon")) {
    const cx = w * 0.24, cy = h * 0.18, r = h * 0.05;
    push(<circle cx={cx} cy={cy} r={r * 1.8} fill={mix(accent2, "#FFFFFF", 0.6)} opacity={0.12} />);
    push(<circle cx={cx} cy={cy} r={r} fill={mix(accent2, "#FFFFFF", 0.55)} opacity={0.88} />);
  }
  if (has("stars")) {
    const n = Math.round(w / 42);
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * (h * 0.5), r = 1.1 + rnd() * 1.8;
      push(<circle cx={x} cy={y} r={r} fill="#FFFFFF" opacity={0.35 + rnd() * 0.45} />);
    }
  }
  if (has("raylight")) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x0 = (w / (n + 1)) * (i + 1) + (rnd() - 0.5) * 60;
      push(
        <polygon
          points={`${x0 - 30},0 ${x0 + 30},0 ${x0 + 90},${h} ${x0 - 90},${h}`}
          fill={accent2}
          opacity={0.05}
        />,
      );
    }
  }

  // ── horizon silhouettes (sea / trees / ridge / city / field) ────
  if (has("ridge")) {
    push(
      <path
        d={`M0,${horizonY + 18} Q${w * 0.22},${horizonY - 60} ${w * 0.4},${horizonY - 8} Q${w * 0.62},${horizonY - 70} ${w * 0.8},${horizonY - 12} Q${w * 0.92},${horizonY - 34} ${w},${horizonY} L${w},${h} L0,${h} Z`}
        fill={mix(ground, ink, dark ? 0.35 : 0.1)}
        opacity={0.9}
      />,
    );
  }
  if (has("trees")) {
    let d = `M0,${horizonY + 14}`;
    const teeth = 22;
    for (let i = 0; i <= teeth; i++) {
      const x = (w / teeth) * i;
      const peak = horizonY + 14 - (8 + rnd() * 26);
      d += ` L${x},${peak}`;
    }
    d += ` L${w},${horizonY + 14} L${w},${h} L0,${h} Z`;
    push(<path d={d} fill={mix(ground, backdrop.accent, dark ? 0.4 : 0.28)} opacity={0.85} />);
  }
  if (has("city")) {
    const blocks = 9;
    for (let i = 0; i < blocks; i++) {
      const bw = w / blocks;
      const bh = 40 + rnd() * (h * 0.22);
      const x = i * bw;
      push(<rect x={x} y={horizonY - bh} width={bw - 4} height={bh + 40} fill={mix(ground, ink, dark ? 0.55 : 0.3)} opacity={0.92} />);
      if (dark) {
        const lights = Math.round(bh / 26);
        for (let l = 0; l < lights; l++) {
          push(<rect x={x + bw * 0.28} y={horizonY - bh + 12 + l * 24} width={5} height={8} fill={accent2} opacity={0.5 + rnd() * 0.3} />);
          push(<rect x={x + bw * 0.6} y={horizonY - bh + 20 + l * 24} width={5} height={8} fill={accent2} opacity={0.4 + rnd() * 0.3} />);
        }
      }
    }
  }
  if (has("sea")) {
    push(
      <path
        d={`M0,${horizonY} Q${w * 0.5},${horizonY - 14} ${w},${horizonY} L${w},${h} L0,${h} Z`}
        fill={mix(ground, accent, dark ? 0.4 : 0.22)}
        opacity={0.85}
      />,
    );
    for (let i = 0; i < 3; i++) {
      const y = horizonY + 22 + i * 26;
      push(<path d={`M0,${y} Q${w * 0.5},${y - 9} ${w},${y}`} stroke={mix(ground, "#FFFFFF", 0.5)} strokeWidth={1.5} opacity={0.25} fill="none" />);
    }
  }
  if (has("field")) {
    push(<rect x={0} y={horizonY} width={w} height={h - horizonY} fill={mix(ground, accent2, 0.16)} opacity={0.7} />);
    const flowers = Math.round(w / 90);
    for (let i = 0; i < flowers; i++) {
      const x = rnd() * w, y = horizonY + 16 + rnd() * (h - horizonY - 24);
      push(<circle cx={x} cy={y} r={3} fill={accent} opacity={0.5} />);
    }
  }
  if (has("road")) {
    const vx = w * 0.5, vy = horizonY - 20;
    push(<path d={`M${w * -0.1},${h} L${vx},${vy} L${w * 1.1},${h} Z`} fill={mix(ground, ink, 0.3)} opacity={0.5} />);
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const y = vy + (h - vy) * (0.3 + t * 0.7);
      const half = 2 + t * 10;
      push(<rect x={vx - half / 2} y={y} width={half} height={half * 1.6} fill={mix(ground, "#FFFFFF", 0.6)} opacity={0.5} />);
    }
  }

  // ── weather & atmosphere ─────────────────────────────────────────
  if (has("rain")) {
    const n = Math.round(w / 28);
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * h, len = 22 + rnd() * 26;
      push(<line x1={x} y1={y} x2={x - len * 0.28} y2={y + len} stroke={mix(accent, "#FFFFFF", 0.3)} strokeWidth={1.4} opacity={0.3} strokeLinecap="round" />);
    }
  }
  if (has("shimmer")) {
    for (let i = 0; i < 5; i++) {
      const y = horizonY - 10 - i * 14;
      push(<path d={`M0,${y} Q${w * 0.5},${y - 8} ${w},${y}`} stroke={accent2} strokeWidth={1} opacity={0.14} fill="none" />);
    }
  }
  if (has("haze")) {
    push(<rect x={0} y={horizonY - h * 0.16} width={w} height={h * 0.22} fill={mix(ground, "#FFFFFF", dark ? 0.15 : 0.6)} opacity={0.22} />);
  }
  if (has("bubbles")) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = h * 0.3 + rnd() * (h * 0.6), r = 3 + rnd() * 7;
      push(<circle cx={x} cy={y} r={r} fill="none" stroke={mix(accent2, "#FFFFFF", 0.5)} strokeWidth={1.2} opacity={0.4} />);
    }
  }
  if (has("glow")) {
    push(<rect x={w * 0.55} y={h * 0.5} width={w * 0.5} height={h * 0.5} fill={accent2} opacity={0.1} />);
  }
  if (has("drape")) {
    for (const x of [w * 0.08, w * 0.92]) {
      push(<rect x={x - 22} y={0} width={44} height={h} fill={mix(ground, backdrop.accent, 0.2)} opacity={0.28} />);
    }
  }
  if (has("window")) {
    push(<line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke={mix(ground, ink, 0.4)} strokeWidth={3} opacity={0.5} />);
    push(<line x1={0} y1={h * 0.42} x2={w} y2={h * 0.42} stroke={mix(ground, ink, 0.4)} strokeWidth={3} opacity={0.5} />);
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", top: 0, left: 0 }}>
      {nodes}
    </svg>
  );
}
