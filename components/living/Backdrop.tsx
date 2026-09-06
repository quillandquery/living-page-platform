import { getBackdrop, type Layer } from "@/lib/backdrops";

/* Deterministic from the slug, so a star field is the same star field on
   every build and every reader sees the same sky. */
function rng(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  let s = h >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const v = (n: number) => n.toFixed(2);

function Sky({ dawn }: { dawn?: boolean }) {
  return (
    <>
      <div className="bd-sky bd-sky-night" />
      {dawn ? <div className="bd-sky bd-sky-dawn" /> : null}
    </>
  );
}

/* Denser overhead, thinning toward the horizon, because that is what a sky
   does when you are lying back on a bus seat looking up. */
function Stars({ seed }: { seed: string }) {
  const r = rng(seed + "stars");
  const stars = Array.from({ length: 150 }, (_, i) => {
    const x = r() * 100;
    const bias = r();
    const y = bias * bias * 78;
    return { x, y, r: 0.05 + r() * 0.13, o: 0.3 + r() * 0.7, d: (r() * 7).toFixed(1), i };
  });
  return (
    <svg className="bd-stars" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {stars.map((s) => (
        <circle key={s.i} cx={v(s.x)} cy={v(s.y)} r={v(s.r)}
                style={{ ["--o" as string]: s.o, animationDelay: `${s.d}s` }} />
      ))}
    </svg>
  );
}

function Moon() {
  return (
    <svg className="bd-moon" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M62 10a42 42 0 1 0 0 80 48 48 0 0 1 0-80z" />
    </svg>
  );
}

function Sun() {
  return (
    <svg className="bd-sun" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="34" />
    </svg>
  );
}

/* Two ridgelines at different parallax, so the far hills barely move and
   the near ones slide past. */
function Ridge() {
  return (
    <svg className="bd-ridge" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path className="bd-ridge-far"
        d="M0,30 L9,26 L16,29 L24,22 L33,27 L41,24 L50,29 L58,23 L67,28 L76,21 L85,27 L92,24 L100,29 L100,40 L0,40 Z" />
      <path className="bd-ridge-near"
        d="M0,35 L11,32 L19,34 L28,30 L37,34 L46,31 L55,35 L64,31 L75,34 L85,30 L94,34 L100,32 L100,40 L0,40 Z" />
    </svg>
  );
}

/* The road runs away to a vanishing point on the horizon and the dashes
   keep coming toward the reader. It is the only layer that admits the
   narrator is moving. */
function Road() {
  return (
    <svg className="bd-road" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path className="bd-road-surface" d="M50,0 L-6,40 L106,40 Z" />
      <path className="bd-road-edge" d="M50,0 L-6,40" />
      <path className="bd-road-edge" d="M50,0 L106,40" />
      <path className="bd-road-verge" d="M50,0 L16,40" />
      <path className="bd-road-verge" d="M50,0 L84,40" />
      <path className="bd-road-dash" d="M50,0 L50,40" />
    </svg>
  );
}

function Sea() {
  const r = rng("sea");
  const lines = Array.from({ length: 7 }, (_, i) => {
    const y = 6 + i * 6.2;
    const w = 0.3 + i * 0.22;
    const pts = Array.from({ length: 9 }, (_, k) => {
      const x = (k / 8) * 100;
      const amp = (0.5 + i * 0.35) * (0.6 + r() * 0.8);
      return `${v(x)},${v(y + (k % 2 ? amp : -amp))}`;
    }).join(" L");
    return { d: `M${pts}`, w, i };
  });
  return (
    <svg className="bd-sea" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
      {lines.map((l) => <path key={l.i} d={l.d} style={{ strokeWidth: l.w }} />)}
    </svg>
  );
}

function Rain() {
  const r = rng("rain");
  const drops = Array.from({ length: 70 }, (_, i) => ({
    x: r() * 110 - 5, y: r() * 100, len: 2 + r() * 5,
    d: (r() * 1.4).toFixed(2), o: 0.15 + r() * 0.45, i,
  }));
  return (
    <svg className="bd-rain" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {drops.map((d) => (
        <path key={d.i} d={`M${v(d.x)},${v(d.y)} L${v(d.x - 1.6)},${v(d.y + d.len)}`}
              style={{ ["--o" as string]: d.o, animationDelay: `${d.d}s` }} />
      ))}
    </svg>
  );
}

const RENDER: Record<Layer, (p: { seed: string; dawn?: boolean }) => React.ReactNode> = {
  sky:   ({ dawn }) => <Sky dawn={dawn} />,
  stars: ({ seed }) => <Stars seed={seed} />,
  moon:  () => <Moon />,
  sun:   () => <Sun />,
  ridge: () => <Ridge />,
  road:  () => <Road />,
  sea:   () => <Sea />,
  rain:  () => <Rain />,
  haze:  () => <div className="bd-haze" />,
};

/**
 * Fixed behind everything, inert to the pointer, invisible to screen
 * readers. The writing is the page; this is the weather it happens in.
 */
export function Backdrop({ name, seed }: { name?: string; seed: string }) {
  const b = getBackdrop(name);
  if (!b) return null;
  return (
    <div className={`backdrop bd-${name}`} aria-hidden="true">
      {b.layers.map((l) => <span className={`bd-layer bd-l-${l}`} key={l}>{RENDER[l]({ seed, dawn: b.dawn })}</span>)}
      <div className="bd-scrim" />
    </div>
  );
}

export default Backdrop;
