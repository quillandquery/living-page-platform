/**
 * THE SHARE SCENE — an illustrated world, drawn for a still frame.
 *
 * v1 of this file drew flat, safe SVG primitives — correct, but thin
 * next to the concept prototype's hand-illustrated worlds (layered
 * building silhouettes with real window-grid texture, saturated
 * multi-stop sky gradients, an always-on paper grain). This version
 * mines that prototype's actual technique — depth through TWO layers
 * per silhouette (a hazier back row, a near-ink front row), a grain
 * pass, and richer, more saturated colour stepping — but generalises it
 * across the real ~18-layer `Backdrop.layers` vocabulary instead of
 * three hardcoded moods, so it's still data-driven (Decision D6).
 *
 * Still SVG primitives only (circle/path/line/rect/polygon) — no
 * filters, no radial-gradient, no gradients-on-gradients — because
 * that's the actual boundary of what Satori reliably renders, proven
 * the hard way earlier in this file's life.
 */
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import type { Backdrop, Layer } from "./backdrops";

export type SceneProps = {
  backdrop: Backdrop;
  w: number;
  h: number;
  seed: number;
  /** loop phase 0..1 — offsets the animated layers (rain, stars) so a
   *  pre-generated frame sequence reads as motion. Omitted = still. */
  t?: number;
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

/** A saturated, multi-stop sky, tuned the way the prototype's hand-authored
 *  gradients were (`#f7cf8f → #ec9a48 → #cf7130 → #a9531d` for a warm
 *  coast, `#33475e → #26364a → #16212c` for a blue dusk) rather than one
 *  flat two-stop wash. Still entirely data-driven off the world's own
 *  accent/secondaryAccent/scheme — no per-mood special-casing. */
export function skyGradient(backdrop: Backdrop): string {
  const dark = backdrop.scheme === "dark";
  const a = backdrop.accent;
  const a2 = backdrop.secondaryAccent ?? a;
  const ground = sceneGround(backdrop);
  if (dark) {
    const top = mix(a2, "#FFFFFF", 0.12);
    const mid = mix(a, "#000000", 0.4);
    const low = mix(ground, "#000000", 0.35);
    return `linear-gradient(180deg, ${top} 0%, ${mid} 55%, ${low} 100%)`;
  }
  const top = mix(a2, "#FFFFFF", 0.28);
  const mid = mix(a2, a, 0.55);
  const low = mix(a, ground, 0.55);
  return `linear-gradient(180deg, ${top} 0%, ${mid} 46%, ${low} 76%, ${ground} 100%)`;
}

export function ShareScene({ backdrop, w, h, seed, t }: SceneProps) {
  const phase = t ?? 0;
  const rnd = mulberry32(seed);
  const dark = backdrop.scheme === "dark";
  const ground = sceneGround(backdrop);
  const accent = backdrop.accent;
  const accent2 = backdrop.secondaryAccent ?? accent;
  const horizonY = Math.round(h * 0.8);
  const ink = dark ? "#EDEAE0" : "#221D18";

  const has = (l: Layer) => backdrop.layers.includes(l);
  const nodes: ReactNode[] = [];
  let key = 0;
  const push = (n: ReactNode) => {
    // Satori walks the element tree looking for string tag names; a
    // <Fragment> has `type === Symbol(react.fragment)`, which it tries
    // to stringify and throws on ("Cannot convert a Symbol value to a
    // string"). Clone the key straight onto the real SVG element instead
    // of wrapping it.
    nodes.push(isValidElement(n) ? cloneElement(n as ReactElement, { key: key++ }) : n);
  };

  /** A jagged horizon band: `depth` 0 = furthest back (lighter, flatter),
   *  1 = nearest (darkest, most jagged) — the two-pass technique that
   *  gave the prototype's rooflines and ridgelines real depth instead of
   *  one flat silhouette. */
  const band = (points: number, ampBase: number, depth: number, colorHex: string) => {
    const baseY = horizonY - depth * (h * 0.02);
    let d = `M0,${h}`;
    d += ` L0,${baseY}`;
    for (let i = 0; i <= points; i++) {
      const x = (w / points) * i;
      const amp = ampBase * (0.5 + rnd());
      const y = baseY - amp * (0.3 + depth * 0.7);
      d += ` L${x},${y}`;
    }
    d += ` L${w},${baseY} L${w},${h} Z`;
    push(<path d={d} fill={colorHex} opacity={depth < 1 ? 0.75 : 0.95} />);
  };

  // ── sky bodies ──────────────────────────────────────────────────
  if (has("sun")) {
    const cx = w * 0.76, cy = h * 0.24, r = h * 0.1;
    push(<circle cx={cx} cy={cy} r={r * 2.4} fill={accent2} opacity={0.14} />);
    push(<circle cx={cx} cy={cy} r={r * 1.6} fill={accent2} opacity={0.22} />);
    push(<circle cx={cx} cy={cy} r={r} fill={mix(accent2, "#FFFFFF", 0.25)} opacity={0.95} />);
    // the sunset/sunrise reflection hugging the horizon — the prototype's
    // `.haze` glow band, not just a glowing disc floating in empty sky.
    push(<rect x={0} y={horizonY - h * 0.16} width={w} height={h * 0.18} fill={accent2} opacity={dark ? 0.1 : 0.16} />);
  }
  if (has("moon")) {
    const cx = w * 0.24, cy = h * 0.18, r = h * 0.052;
    push(<circle cx={cx} cy={cy} r={r * 2.2} fill={mix(accent2, "#FFFFFF", 0.6)} opacity={0.14} />);
    push(<circle cx={cx} cy={cy} r={r} fill={mix(accent2, "#FFFFFF", 0.7)} opacity={0.92} />);
    push(<circle cx={cx - r * 0.32} cy={cy - r * 0.22} r={r * 0.82} fill={mix(ground, "#000000", 0.3)} opacity={0.5} />);
  }
  if (has("stars")) {
    const n = Math.round(w / 34);
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * (h * 0.52), r = 1.2 + rnd() * 2;
      const base = 0.4 + rnd() * 0.5, ph = rnd();
      const op = Math.max(0.08, base * (0.55 + 0.45 * Math.sin((ph + phase) * Math.PI * 2)));
      push(<circle cx={x} cy={y} r={r} fill="#FFFFFF" opacity={op} />);
    }
  }
  if (has("raylight")) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x0 = (w / (n + 1)) * (i + 1) + (rnd() - 0.5) * 60;
      push(<polygon points={`${x0 - 30},0 ${x0 + 30},0 ${x0 + 90},${h} ${x0 - 90},${h}`} fill={accent2} opacity={0.06} />);
    }
  }

  // ── horizon glow — a light source at the horizon so the world reads
  //    with depth, not one flat wash (concentric faint discs; Satori has
  //    no radial-gradient). ─────────────────────────────────────────
  {
    const gy = horizonY - h * 0.02;
    push(<circle cx={w * 0.5} cy={gy} r={w * 0.62} fill={accent2} opacity={dark ? 0.05 : 0.06} />);
    push(<circle cx={w * 0.5} cy={gy} r={w * 0.40} fill={accent2} opacity={dark ? 0.06 : 0.07} />);
    push(<circle cx={w * 0.5} cy={gy} r={w * 0.22} fill={mix(accent2, "#FFFFFF", dark ? 0.2 : 0.35)} opacity={dark ? 0.07 : 0.08} />);
  }

  // ── horizon silhouettes — two-depth bands, not one flat shape ────
  if (has("ridge")) {
    band(4, h * 0.22, 0, mix(ground, accent, dark ? 0.32 : 0.16));
    band(5, h * 0.16, 1, mix(ink, accent, dark ? 0.3 : 0.22));
  }
  if (has("trees")) {
    const jagged = (points: number, ampBase: number, colorHex: string, opacity: number) => {
      let d = `M0,${horizonY + 14}`;
      for (let i = 0; i <= points; i++) {
        const x = (w / points) * i;
        const peak = horizonY + 14 - ampBase * (0.35 + rnd() * 0.9);
        d += ` L${x},${peak}`;
      }
      d += ` L${w},${horizonY + 14} L${w},${h} L0,${h} Z`;
      push(<path d={d} fill={colorHex} opacity={opacity} />);
    };
    jagged(16, h * 0.14, mix(ground, accent, dark ? 0.35 : 0.2), 0.7);
    jagged(24, h * 0.2, mix(ink, backdrop.accent, dark ? 0.35 : 0.3), 0.92);
  }
  if (has("city")) {
    const winGrid = (x: number, bw: number, topY: number, bottomY: number, colorHex: string) => {
      const cols = Math.max(1, Math.round(bw / 11));
      const rows = Math.max(1, Math.round((bottomY - topY) / 13));
      for (let cx = 0; cx < cols; cx++) {
        for (let ry = 0; ry < rows; ry++) {
          const lit = (Math.floor((x + cx * 11) * 7 + ry * 13) % 10) < 6;
          if (!lit) continue;
          const bright = rnd() < 0.35;
          push(<rect
            x={x + 4 + cx * 11} y={topY + 6 + ry * 13}
            width={4} height={6}
            fill={colorHex}
            opacity={bright ? 0.85 : 0.22}
          />);
        }
      }
    };
    const blocksBack = 7, blocksFront = 9;
    // back row — shorter, hazy, tinted toward the sky (atmospheric
    // perspective: distance reads as closeness-to-background-colour).
    for (let i = 0; i < blocksBack; i++) {
      const bw = w / blocksBack;
      const bh = 30 + rnd() * (h * 0.16);
      const x = i * bw + bw * 0.1;
      push(<rect x={x} y={horizonY - bh} width={bw * 0.72} height={bh + 40} fill={mix(ground, accent, dark ? 0.4 : 0.22)} opacity={0.65} />);
    }
    // front row — taller, near-ink, with real window-grid texture.
    for (let i = 0; i < blocksFront; i++) {
      const bw = w / blocksFront;
      const bh = 50 + rnd() * (h * 0.24);
      const x = i * bw;
      const topY = horizonY - bh;
      const fill = mix(ink, backdrop.accent, dark ? 0.25 : 0.35);
      push(<rect x={x} y={topY} width={bw - 5} height={bh + 40} fill={fill} opacity={0.95} />);
      winGrid(x, bw - 5, topY, horizonY + 30, accent2);
    }
  }
  if (has("rain") && !has("city") && !has("sea") && !has("trees") && !has("ridge")) {
    // A tall, dense, warmly-lit cityscape receding into the wet dark —
    // the prototype's rain scene. Two depth rows; warm windows are the
    // pop that makes a rainy city read as a place, not a band.
    const warm = "#F0C070";
    const cityscape = (count: number, minT: number, maxT: number, fill: string, op: number, litP: number, winOp: number) => {
      const bw = w / count;
      for (let i = 0; i < count; i++) {
        const x = i * bw + rnd() * bw * 0.14;
        const topY = minT + rnd() * (maxT - minT);
        const ww = bw * (0.7 + rnd() * 0.22);
        push(<rect x={x} y={topY} width={ww} height={h - topY} fill={fill} opacity={op} />);
        const cols = Math.min(3, Math.max(1, Math.round(ww / 20)));
        for (let cx = 0; cx < cols; cx++) {
          for (let wy = topY + 16; wy < h - 26; wy += 26) {
            if (rnd() < litP) push(<rect x={x + 7 + cx * (ww / cols)} y={wy} width={6} height={9} fill={warm} opacity={winOp + rnd() * 0.35} />);
          }
        }
      }
    };
    // Silhouette colours are keyed to the GROUND (dark in a dark world),
    // never `ink` — in a dark world ink is the light text colour, which
    // would wash the buildings out. Front is near-black; back a hazier
    // dark, tinted toward the world so it recedes.
    const silFront = dark ? mix(ground, "#000000", 0.45) : mix("#241B12", accent, 0.28);
    const silBack = dark ? mix(ground, accent, 0.32) : mix("#3A2C20", accent, 0.3);
    // back row — hazier, shorter (atmospheric depth)
    cityscape(9, h * 0.60, h * 0.72, silBack, 0.7, 0.16, 0.32);
    // front row — near-black silhouettes, taller, warm windows popping
    cityscape(12, h * 0.46, h * 0.66, silFront, 0.98, 0.44, 0.6);
    // rain haze glow low over the city, and a shallow wet-ground sheen
    push(<rect x={0} y={h * 0.62} width={w} height={h * 0.22} fill={accent2} opacity={0.05} />);
    push(<rect x={0} y={h * 0.9} width={w} height={h * 0.1} fill={warm} opacity={0.04} />);
  }
  if (has("sea")) {
    // distant headlands on either side — depth behind the water
    push(<path d={`M0,${horizonY} L${w * 0.16},${horizonY - h * 0.055} L${w * 0.33},${horizonY - h * 0.02} L${w * 0.33},${horizonY} Z`} fill={mix(ink, accent, dark ? 0.5 : 0.4)} opacity={0.55} />);
    push(<path d={`M${w * 0.72},${horizonY} L${w * 0.88},${horizonY - h * 0.06} L${w},${horizonY - h * 0.03} L${w},${horizonY} Z`} fill={mix(ink, accent, dark ? 0.5 : 0.4)} opacity={0.55} />);
    // the water
    push(<path d={`M0,${horizonY} Q${w * 0.5},${horizonY - 14} ${w},${horizonY} L${w},${h} L0,${h} Z`} fill={mix(ground, accent, dark ? 0.42 : 0.32)} opacity={0.92} />);
    if (has("sun")) {
      // the sun's reflection, a warm column down the water
      push(<rect x={w * 0.6} y={horizonY} width={w * 0.14} height={h - horizonY} fill={accent2} opacity={0.2} />);
      push(<rect x={w * 0.64} y={horizonY} width={w * 0.06} height={h - horizonY} fill={mix(accent2, "#FFFFFF", 0.4)} opacity={0.18} />);
    }
    // dense wave lines, brighter and closer-spaced near the foreground
    for (let i = 0; i < 8; i++) {
      const y = horizonY + 16 + i * (h - horizonY) / 10;
      const amp = 6 + i * 2;
      push(<path d={`M0,${y} Q${w * 0.28},${y - amp} ${w * 0.5},${y} T${w},${y}`} stroke={mix(ground, "#FFFFFF", 0.6)} strokeWidth={1 + i * 0.35} opacity={0.16 + i * 0.03} fill="none" />);
    }
  }
  if (has("field")) {
    push(<rect x={0} y={horizonY} width={w} height={h - horizonY} fill={mix(ground, accent2, 0.2)} opacity={0.75} />);
    const flowers = Math.round(w / 70);
    for (let i = 0; i < flowers; i++) {
      const x = rnd() * w, y = horizonY + 16 + rnd() * (h - horizonY - 24);
      push(<circle cx={x} cy={y} r={2.5 + rnd() * 2} fill={rnd() < 0.5 ? accent : accent2} opacity={0.6} />);
    }
  }
  if (has("road")) {
    const vx = w * 0.5, vy = horizonY - 20;
    push(<path d={`M${w * -0.1},${h} L${vx},${vy} L${w * 1.1},${h} Z`} fill={mix(ground, ink, 0.32)} opacity={0.55} />);
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const y = vy + (h - vy) * (0.3 + t * 0.7);
      const half = 2 + t * 10;
      push(<rect x={vx - half / 2} y={y} width={half} height={half * 1.6} fill={mix(ground, "#FFFFFF", 0.6)} opacity={0.55} />);
    }
  }

  // ── weather & atmosphere ─────────────────────────────────────────
  if (has("rain")) {
    const n = Math.round(w / 13);            // denser, so it reads at poster scale
    const travel = h + 140;
    for (let i = 0; i < n; i++) {
      const near = rnd();                    // depth: near drops bigger/faster/brighter
      const x = rnd() * w, y0 = rnd() * travel, len = 30 + rnd() * (36 + near * 64);
      const y = ((y0 + phase * travel * (0.7 + near * 0.7)) % travel) - 70;
      push(<line x1={x} y1={y} x2={x - len * 0.26} y2={y + len}
        stroke={mix(accent, "#FFFFFF", 0.45)} strokeWidth={1 + near * 2.2}
        opacity={0.22 + near * 0.4} strokeLinecap="round" />);
    }
  }
  if (has("shimmer")) {
    for (let i = 0; i < 5; i++) {
      const y = horizonY - 10 - i * 14;
      push(<path d={`M0,${y} Q${w * 0.5},${y - 8} ${w},${y}`} stroke={accent2} strokeWidth={1} opacity={0.16} fill="none" />);
    }
  }
  if (has("haze")) {
    push(<rect x={0} y={horizonY - h * 0.18} width={w} height={h * 0.24} fill={mix(ground, "#FFFFFF", dark ? 0.15 : 0.6)} opacity={0.24} />);
  }
  if (has("bubbles")) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = h * 0.3 + rnd() * (h * 0.6), r = 3 + rnd() * 7;
      push(<circle cx={x} cy={y} r={r} fill="none" stroke={mix(accent2, "#FFFFFF", 0.5)} strokeWidth={1.3} opacity={0.45} />);
    }
  }
  if (has("glow")) {
    push(<rect x={w * 0.52} y={h * 0.45} width={w * 0.55} height={h * 0.55} fill={accent2} opacity={0.14} />);
  }
  if (has("drape")) {
    for (const x of [w * 0.08, w * 0.92]) {
      push(<rect x={x - 24} y={0} width={48} height={h} fill={mix(ground, backdrop.accent, 0.22)} opacity={0.32} />);
    }
  }
  if (has("window")) {
    push(<line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke={mix(ground, ink, 0.42)} strokeWidth={3} opacity={0.55} />);
    push(<line x1={0} y1={h * 0.42} x2={w} y2={h * 0.42} stroke={mix(ground, ink, 0.42)} strokeWidth={3} opacity={0.55} />);
  }

  // ── grain — always on, low opacity; the "this was designed, not
  //    generated" texture the prototype's `.grain` overlay gave every
  //    surface (design tokens: `--grain` .035–.055). ──────────────────
  const grainCount = Math.round((w * h) / 9000);
  for (let i = 0; i < grainCount; i++) {
    const x = rnd() * w, y = rnd() * h;
    push(<circle cx={x} cy={y} r={0.6 + rnd() * 0.5} fill={dark ? "#FFFFFF" : ink} opacity={0.05 + rnd() * 0.06} />);
  }

  // ── vignette — a soft edge darkening so the type reads as the
  //    subject, the world as the frame around it. ────────────────────
  push(<rect x={0} y={0} width={w} height={h * 0.16} fill={ink} opacity={dark ? 0.22 : 0.06} />);
  push(<rect x={0} y={h * 0.84} width={w} height={h * 0.16} fill={ink} opacity={dark ? 0.3 : 0.1} />);
  push(<rect x={0} y={0} width={w * 0.06} height={h} fill={ink} opacity={dark ? 0.16 : 0.04} />);
  push(<rect x={w * 0.94} y={0} width={w * 0.06} height={h} fill={ink} opacity={dark ? 0.16 : 0.04} />);

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", background: skyGradient(backdrop) }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", top: 0, left: 0 }}>
        {nodes}
      </svg>
    </div>
  );
}
