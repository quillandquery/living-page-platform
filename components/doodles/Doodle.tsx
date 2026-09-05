import { DOODLES, type Stroke } from "./registry";

/** Deterministic per-instance wobble — same seed, same hand. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Catmull-Rom through the points, so a handful of coordinates reads as a line. */
function smooth(pts: Stroke): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function len(pts: Stroke): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L * 1.12 + 6;
}

export function strokePaths(strokes: Stroke[], seed: number, wobble = 2.6) {
  const r = rng(seed * 2654435761);
  return strokes.map((pts) => {
    const j: Stroke = pts.map(([x, y]) => [x + (r() - 0.5) * wobble, y + (r() - 0.5) * wobble]);
    return { d: smooth(j), len: Math.round(len(j)) };
  });
}

type Props = {
  name: string;
  seed?: number;
  /** GESTURE `become`: the drawing this one turns into */
  becomes?: string;
  size?: number;
  ink?: string;
  width?: number;
  wobble?: number;
  className?: string;
};

export function Doodle({ name, seed = 7, becomes, size = 112, ink = "currentColor", width = 1.6, wobble = 2.6, className }: Props) {
  const make = DOODLES[name];
  if (!make) return null;
  const paths = strokePaths(make(), seed, wobble);
  const after = becomes && DOODLES[becomes] ? strokePaths(DOODLES[becomes](), seed + 31, wobble) : null;

  return (
    <span className={`doodle${className ? ` ${className}` : ""}`} style={{ width: size, display: "block" }}>
      <svg viewBox="-6 -6 112 112" aria-hidden="true" stroke={ink} strokeWidth={width}>
        <g className={after ? "becoming-from" : undefined}>
          {paths.map((p, i) => (
            <path key={i} className="stk" d={p.d} style={{ ["--len" as string]: p.len, ["--s" as string]: i }} />
          ))}
        </g>
        {after ? (
          <g className="becoming-to">
            {after.map((p, i) => (
              <path key={i} className="stk" d={p.d} style={{ ["--len" as string]: p.len, ["--s" as string]: i }} />
            ))}
          </g>
        ) : null}
      </svg>
    </span>
  );
}

export default Doodle;
