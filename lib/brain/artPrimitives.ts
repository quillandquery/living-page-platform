import "server-only";

/**
 * DETERMINISTIC ART PRIMITIVES (fffuel-inspired).
 *
 * Atmosphere and texture — rain, grain, mesh-gradient skies, waves, fog, stars,
 * blobs — do NOT need an LLM: they're algorithmic and look flawless every time,
 * for free and instantly. The decomposed shell casts into these by name
 * (<div class="art" data-gen="rain" ...>) and we fill them here, reserving the
 * LLM only for the story's bespoke focal subjects. This is the "curated library
 * the brain casts into" (D6), built with our own techniques (no third-party
 * code): CSS/SVG patterns, feTurbulence, layered gradients.
 *
 * Every generator returns ONE self-contained <svg> that fills its slot. Colours
 * come from the slot's data-colors (comma-separated) or a sensible default.
 */

type Opts = { colors: string[]; seed: number; raw: Record<string, string> };

const DEFAULT_COLORS = ["#20304a", "#4d5a6e", "#8a8f98", "#e0b27a"];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const esc = (s: string) => s.replace(/[<>"']/g, "");
const num = (o: Opts, k: string, d: number) => { const v = parseFloat(o.raw[k]); return Number.isFinite(v) ? v : d; };

/** Diagonal, animated rain. */
function rain(o: Opts): string {
  const c = esc(o.colors[0] || "#cfd8e6");
  const angle = num(o, "angle", 12), speed = num(o, "speed", 0.7), op = num(o, "opacity", 0.35);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none"><defs><pattern id="rn" width="60" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><path d="M10 0V46M35 60V116M52 24V72M22 90V128M46 4V34" stroke="${c}" stroke-width="1.2" stroke-opacity="${op}"/><animateTransform attributeName="patternTransform" type="translate" additive="sum" from="0 0" to="-25 120" dur="${speed}s" repeatCount="indefinite"/></pattern></defs><rect width="1000" height="1000" fill="url(#rn)"/></svg>`;
}

/** Fine film grain. */
function grain(o: Opts): string {
  const op = num(o, "opacity", 0.09), freq = num(o, "freq", 0.9);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" stitchTiles="stitch"/></filter><rect width="220" height="220" filter="url(#g)" opacity="${op}"/></svg>`;
}

/** A soft mesh-gradient sky from the palette — several blurred colour pools. */
function mesh(o: Opts): string {
  const cs = o.colors.length >= 2 ? o.colors : DEFAULT_COLORS;
  const r = rng(o.seed);
  const base = esc(cs[0]);
  let blobs = "";
  for (let i = 0; i < Math.min(6, cs.length + 2); i++) {
    const col = esc(cs[i % cs.length]);
    const cx = (10 + r() * 80).toFixed(1), cy = (10 + r() * 80).toFixed(1), rad = (35 + r() * 35).toFixed(1);
    blobs += `<radialGradient id="m${i}" cx="${cx}%" cy="${cy}%" r="${rad}%"><stop offset="0" stop-color="${col}" stop-opacity="0.9"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient><rect width="1000" height="1000" fill="url(#m${i})"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none"><rect width="1000" height="1000" fill="${base}"/><g filter="url(#bl)">${blobs}</g><filter id="bl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="40"/></filter></svg>`;
}

/** Layered, gently drifting sine waves — a sea or hills. */
function waves(o: Opts): string {
  const cs = o.colors.length ? o.colors : DEFAULT_COLORS;
  const layers = Math.max(2, Math.min(6, Math.round(num(o, "layers", 4))));
  const r = rng(o.seed);
  let out = "";
  for (let i = 0; i < layers; i++) {
    const col = esc(cs[i % cs.length]);
    const y = 300 + i * 90, amp = 40 + r() * 50, dur = (6 + r() * 6).toFixed(1);
    const d = `M0 ${y} C 250 ${y - amp}, 450 ${y + amp}, 700 ${y} S 1200 ${y - amp}, 1400 ${y} V 1000 H0 Z`;
    out += `<path d="${d}" fill="${col}" opacity="${(0.55 + i * 0.1).toFixed(2)}"><animateTransform attributeName="transform" type="translate" values="0 0;-40 ${(i % 2 ? 6 : -6)};0 0" dur="${dur}s" repeatCount="indefinite"/></path>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 1000" preserveAspectRatio="none">${out}</svg>`;
}

/** Drifting fog bands. */
function fog(o: Opts): string {
  const c = esc(o.colors[0] || "#aab4c8");
  const r = rng(o.seed);
  let out = "";
  for (let i = 0; i < 4; i++) {
    const y = 150 + i * 220, h = 120 + r() * 100, dur = (18 + r() * 14).toFixed(1), op = (0.05 + r() * 0.1).toFixed(2);
    out += `<ellipse cx="500" cy="${y}" rx="900" ry="${h}" fill="${c}" opacity="${op}"><animateTransform attributeName="transform" type="translate" values="-120 0;120 0;-120 0" dur="${dur}s" repeatCount="indefinite"/></ellipse>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none"><g filter="url(#fb)">${out}</g><filter id="fb"><feGaussianBlur stdDeviation="30"/></filter></svg>`;
}

/** A field of twinkling stars. */
function stars(o: Opts): string {
  const c = esc(o.colors[0] || "#ffffff");
  const n = Math.round(num(o, "count", 90));
  const r = rng(o.seed);
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = (r() * 1000).toFixed(1), y = (r() * 650).toFixed(1), rad = (0.5 + r() * 1.6).toFixed(2), dur = (2 + r() * 4).toFixed(1);
    out += `<circle cx="${x}" cy="${y}" r="${rad}" fill="${c}"><animate attributeName="opacity" values="${(0.2 + r() * 0.3).toFixed(2)};1;${(0.2 + r() * 0.3).toFixed(2)}" dur="${dur}s" repeatCount="indefinite"/></circle>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMin slice">${out}</svg>`;
}

/** A soft organic blob (accent shape). */
function blob(o: Opts): string {
  const c = esc(o.colors[0] || "#e0b27a");
  const r = rng(o.seed);
  const pts: string[] = [];
  const N = 8;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, rad = 180 + r() * 90;
    pts.push(`${(500 + Math.cos(a) * rad).toFixed(0)} ${(500 + Math.sin(a) * rad).toFixed(0)}`);
  }
  const d = `M${pts[0]} ` + pts.slice(1).map((p) => `L${p}`).join(" ") + " Z";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><radialGradient id="bg"><stop offset="0" stop-color="${c}" stop-opacity="0.9"/><stop offset="1" stop-color="${c}" stop-opacity="0.2"/></radialGradient><filter id="bb"><feGaussianBlur stdDeviation="30"/></filter></defs><path d="${d}" fill="url(#bg)" filter="url(#bb)"/></svg>`;
}

const GENERATORS: Record<string, (o: Opts) => string> = { rain, grain, mesh, meshgradient: mesh, gradient: mesh, waves, sea: waves, hills: waves, fog, mist: fog, stars, blob };

export const ART_PRIMITIVES = Object.keys(GENERATORS);

/** Render a named primitive, or "" if unknown. `attrs` are the slot's raw
 *  data-* attributes (data-colors comma-separated, plus generator-specific keys). */
export function renderPrimitive(name: string, attrs: Record<string, string>): string {
  const gen = GENERATORS[(name || "").toLowerCase().trim()];
  if (!gen) return "";
  const colors = (attrs["colors"] ?? "").split(",").map((s) => s.trim()).filter((s) => /^#?[0-9a-z(),.%\s-]+$/i.test(s) && s.length < 40).slice(0, 8);
  const seed = Math.abs([...(attrs["colors"] ?? name)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)) || 1;
  return gen({ colors: colors.length ? colors : DEFAULT_COLORS, seed, raw: attrs });
}
