import type { FormatKey } from "@/lib/formats";

/**
 * LAYOUT EMBLEM — a dimensional, lit portrait of a format: shaded and
 * layered, not a flat glyph, lit by the format's own accent (the `--ac`
 * custom property the caller scopes around it). Sibling to FormatCover
 * (the flat rail thumbnail); this one is for the turntable, where the art
 * itself is the whole point. Pure SVG, 120×120, no external assets.
 */
const CR = "#F3E9CF", CR2 = "#E4D6B6", CRSH = "#B9AE92", GL = "rgba(255,255,255,.55)";
const LO = "color-mix(in oklab, var(--ac) 60%, #000)";
const HI = "color-mix(in oklab, var(--ac) 45%, #fff)";

const Glow = <ellipse cx={60} cy={62} rx={46} ry={46} fill="var(--ac)" opacity={0.14} />;
const Shadow = <ellipse cx={60} cy={107} rx={30} ry={5.5} fill="#000" opacity={0.3} />;

function Art({ k }: { k: FormatKey }) {
  switch (k) {
    case "standard":
      return (
        <>
          {Glow}
          <path d="M60 36 C46 28 32 30 22 34 L22 92 C33 88 47 87 60 95 Z" fill={CR2} />
          <path d="M60 36 C74 28 88 30 98 34 L98 92 C87 88 73 87 60 95 Z" fill={CR} />
          <path d="M60 36 L60 95" stroke={LO} strokeWidth={2.4} />
          {[46, 54, 62, 70].map((y) => (
            <g key={y}>
              <path d={`M30 ${y} q14 -4 26 1`} stroke={CRSH} strokeWidth={2} fill="none" opacity={0.7} />
              <path d={`M64 ${y + 1} q14 -5 26 -1`} stroke={CRSH} strokeWidth={2} fill="none" opacity={0.7} />
            </g>
          ))}
          <path d="M60 36 C74 28 88 30 98 34 L98 44 C88 41 74 40 60 47 Z" fill={GL} opacity={0.5} />
          {Shadow}
        </>
      );

    case "listicle":
      return (
        <>
          {Glow}
          {Shadow}
          <rect x={34} y={72} width={56} height={17} rx={4} fill={CR2} />
          <rect x={30} y={52} width={56} height={17} rx={4} fill={CR} />
          <rect x={26} y={32} width={56} height={17} rx={4} fill={CR} />
          <circle cx={35} cy={40.5} r={4.5} fill="var(--ac)" />
          <rect x={46} y={38} width={28} height={2.6} rx={1.3} fill={CRSH} />
          <rect x={46} y={43} width={18} height={2.4} rx={1.2} fill={CRSH} />
          <circle cx={39} cy={60.5} r={4.5} fill="var(--ac)" />
          <rect x={50} y={58} width={28} height={2.6} rx={1.3} fill={CRSH} />
          <circle cx={43} cy={80.5} r={4.5} fill={LO} />
          <g transform="translate(90 30)">
            <path d="M0 -13 L3 -3 L13 0 L3 3 L0 13 L-3 3 L-13 0 L-3 -3 Z" fill="var(--ac)" />
            <circle r={3.4} fill="#fff" />
          </g>
        </>
      );

    case "letter":
      return (
        <>
          {Glow}
          <g transform="rotate(-5 60 60)">
            <rect x={30} y={26} width={60} height={72} rx={3} fill={CR} />
            <rect x={30} y={26} width={60} height={72} rx={3} fill="none" stroke={CRSH} strokeWidth={1} opacity={0.5} />
            {[38, 46, 54].map((y) => (
              <rect key={y} x={40} y={y} width={40} height={2.6} rx={1.3} fill={CRSH} opacity={0.8} />
            ))}
            <rect x={40} y={62} width={24} height={2.6} rx={1.3} fill={CRSH} opacity={0.8} />
            <path d="M30 26 L60 52 L90 26" fill="none" stroke={CR2} strokeWidth={2} />
          </g>
          <circle cx={60} cy={86} r={12} fill="var(--ac)" />
          <path d="M52 82 a10 10 0 0 1 16 0" fill="none" stroke={HI} strokeWidth={2} opacity={0.8} />
          <path d="M50 92 l-4 12 8 -5 z" fill={LO} />
          <path d="M70 92 l4 12 -8 -5 z" fill={LO} />
          {Shadow}
        </>
      );

    case "scrapbook":
      return (
        <>
          {Glow}
          {Shadow}
          <g transform="rotate(9 60 60)">
            <rect x={30} y={30} width={52} height={58} rx={2} fill="#fff" />
            <rect x={36} y={36} width={40} height={34} fill={CR2} />
          </g>
          <g transform="rotate(-7 58 62)">
            <rect x={34} y={34} width={52} height={58} rx={2} fill="#fff" />
            <rect x={40} y={40} width={40} height={34} fill={CRSH} />
          </g>
          <g transform="rotate(4 60 60)">
            <rect x={32} y={32} width={52} height={60} rx={2} fill="#fff" />
            <rect x={38} y={38} width={40} height={34} fill="var(--ac)" />
            <rect x={38} y={76} width={24} height={3} rx={1.5} fill={CRSH} />
            <rect x={49} y={28} width={18} height={9} rx={1} fill={HI} opacity={0.85} transform="rotate(-6 58 32)" />
          </g>
        </>
      );

    case "film":
      return (
        <>
          {Glow}
          {Shadow}
          <rect x={26} y={46} width={68} height={46} rx={4} fill="#241f1c" />
          {[34, 50, 66, 82].map((x) => (
            <line key={x} x1={x} y1={46} x2={x - 6} y2={92} stroke="#3a332f" strokeWidth={1.5} />
          ))}
          <line x1={34} y1={66} x2={74} y2={66} stroke={CR} strokeWidth={3.4} strokeLinecap="round" />
          <line x1={40} y1={76} x2={66} y2={76} stroke={CRSH} strokeWidth={2.6} strokeLinecap="round" />
          <g transform="rotate(-16 60 40)">
            <rect x={26} y={30} width={68} height={15} rx={2} fill="#2c2622" />
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M${30 + i * 13} 30 l7 15 6 0 -7 -15 z`} fill={i % 2 ? CR : "#2c2622"} />
            ))}
          </g>
          <circle cx={86} cy={52} r={3.5} fill="var(--ac)" />
        </>
      );

    case "postcard":
      return (
        <>
          {Glow}
          {Shadow}
          <g transform="rotate(-3 60 60)">
            <rect x={24} y={34} width={72} height={52} rx={3} fill={CR} />
            <path d="M96 34 v10 l-10 -10 z" fill={CRSH} opacity={0.6} />
            <line x1={60} y1={40} x2={60} y2={80} stroke={CRSH} strokeWidth={1.4} opacity={0.7} />
            {[46, 53, 60].map((y) => (
              <rect key={y} x={30} y={y} width={24} height={2.4} rx={1.2} fill={CRSH} opacity={0.8} />
            ))}
            <rect x={72} y={40} width={18} height={15} rx={1.5} fill="var(--ac)" />
            <rect x={72} y={40} width={18} height={15} rx={1.5} fill="none" stroke={HI} strokeWidth={1} strokeDasharray="2 1.5" />
            <circle cx={70} cy={72} r={8} fill="none" stroke={LO} strokeWidth={2} />
            <circle cx={70} cy={72} r={4} fill="none" stroke={LO} strokeWidth={1.4} />
          </g>
        </>
      );

    case "poster":
      return (
        <>
          {Glow}
          {Shadow}
          {[-18, -6, 6, 18].map((a) => (
            <path
              key={a}
              d={`M60 46 L${(60 + Math.cos(((a - 90) * Math.PI) / 180) * 70).toFixed(1)} ${(46 + Math.sin(((a - 90) * Math.PI) / 180) * 70).toFixed(1)} L${(60 + Math.cos(((a - 84) * Math.PI) / 180) * 70).toFixed(1)} ${(46 + Math.sin(((a - 84) * Math.PI) / 180) * 70).toFixed(1)} Z`}
              fill="var(--ac)"
              opacity={0.14}
            />
          ))}
          <rect x={32} y={26} width={56} height={72} rx={2} fill={CR} />
          <rect x={32} y={26} width={56} height={72} rx={2} fill="none" stroke={CRSH} strokeWidth={1} opacity={0.5} />
          <text x={60} y={74} fontFamily="var(--f-disp)" fontSize={52} fill="var(--ac)" textAnchor="middle">A</text>
          <rect x={40} y={84} width={40} height={4} rx={2} fill={CRSH} />
          <rect x={32} y={26} width={56} height={14} rx={2} fill={GL} opacity={0.4} />
        </>
      );

    case "gallery":
      return (
        <>
          {Glow}
          {Shadow}
          <path d="M60 20 L34 46 L86 46 Z" fill="#fff" opacity={0.12} />
          <rect x={34} y={40} width={52} height={46} rx={1} fill={CR2} />
          <rect x={34} y={40} width={52} height={46} rx={1} fill="none" stroke={LO} strokeWidth={3} />
          <rect x={41} y={47} width={38} height={32} fill="#20302f" />
          <circle cx={54} cy={66} r={8} fill="var(--ac)" />
          <path d="M41 79 l14 -16 10 9 8 -7 6 5 v9 z" fill={LO} opacity={0.85} />
          <rect x={49} y={90} width={22} height={3} rx={1.5} fill={CRSH} />
        </>
      );

    case "ticket":
      return (
        <>
          {Glow}
          {Shadow}
          <g transform="rotate(-8 60 66)">
            <rect x={20} y={46} width={80} height={36} rx={6} fill={CR2} />
            <line x1={66} y1={46} x2={66} y2={82} stroke={CRSH} strokeWidth={1.4} strokeDasharray="2.4 2.4" opacity={0.8} />
            <circle cx={66} cy={46} r={3.4} fill="#120c07" opacity={0.5} />
            <circle cx={66} cy={82} r={3.4} fill="#120c07" opacity={0.5} />
            {[28, 58, 88].map((x) => (
              <rect key={x} x={x} y={58} width={2.2} height={14} fill={CRSH} />
            ))}
            <rect x={72} y={56} width={20} height={12} rx={1.5} fill="var(--ac)" />
          </g>
          <g transform="rotate(6 60 60)">
            <rect x={24} y={28} width={80} height={36} rx={6} fill={CR} />
            <line x1={70} y1={28} x2={70} y2={64} stroke={CRSH} strokeWidth={1.4} strokeDasharray="2.4 2.4" opacity={0.8} />
            {[32, 38, 44].map((y) => (
              <rect key={y} x={32} y={y} width={30} height={2.4} rx={1.2} fill={CRSH} opacity={0.8} />
            ))}
            <rect x={76} y={36} width={18} height={18} rx={1.5} fill="none" stroke={HI} strokeWidth={1.4} />
            <path d="M76 45 l4.5 4.5 8 -8" fill="none" stroke="var(--ac)" strokeWidth={2} strokeLinecap="round" />
          </g>
        </>
      );

    case "notebook":
      return (
        <>
          {Glow}
          {Shadow}
          <rect x={30} y={26} width={66} height={76} rx={3} fill={CR} />
          <rect x={30} y={26} width={66} height={76} rx={3} fill="none" stroke={CRSH} strokeWidth={1} opacity={0.5} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={"h" + i} x1={38} y1={38 + i * 11} x2={90} y2={38 + i * 11} stroke={CRSH} strokeWidth={1} opacity={0.35} />
          ))}
          {[0, 1, 2].map((i) => (
            <line key={"v" + i} x1={38 + i * 17} y1={30} x2={38 + i * 17} y2={98} stroke={CRSH} strokeWidth={1} opacity={0.25} />
          ))}
          {[34, 49, 64, 79, 94].map((y) => (
            <circle key={y} cx={30} cy={y} r={3.2} fill="none" stroke={LO} strokeWidth={1.6} />
          ))}
          <rect x={42} y={42} width={30} height={2.6} rx={1.3} fill="var(--ac)" />
          <rect x={42} y={50} width={20} height={2.4} rx={1.2} fill={CRSH} />
          <circle cx={86} cy={86} r={9} fill="none" stroke="var(--ac)" strokeWidth={2} />
          <text x={86} y={89} fontFamily="var(--f-mono)" fontSize={8} fill="var(--ac)" textAnchor="middle">3</text>
        </>
      );

    case "ransom":
      return (
        <>
          {Glow}
          {Shadow}
          {[
            { x: 22, y: 34, r: -9, w: 32, h: 16, c: "#20140A", t: "#fff" },
            { x: 56, y: 28, r: 7, w: 26, h: 16, c: "var(--ac)", t: "#20140A" },
            { x: 30, y: 58, r: -5, w: 30, h: 16, c: CR, t: "#20140A" },
            { x: 62, y: 62, r: 9, w: 32, h: 16, c: "#20140A", t: "#fff" },
            { x: 24, y: 86, r: -7, w: 26, h: 16, c: "var(--ac)", t: "#20140A" },
            { x: 58, y: 90, r: 5, w: 30, h: 16, c: CR2, t: "#20140A" },
          ].map((s, i) => (
            <g key={i} transform={`rotate(${s.r} ${s.x + s.w / 2} ${s.y + s.h / 2})`}>
              <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={1} fill={s.c} />
              <rect x={s.x + 3} y={s.y + 3.5} width={s.w - 10} height={2.2} rx={1.1} fill={s.t} opacity={0.55} />
            </g>
          ))}
        </>
      );

    case "marquee":
      return (
        <>
          {Glow}
          <rect x={18} y={66} width={84} height={4} rx={2} fill="#120c07" opacity={0.5} />
          <path d="M26 78 C26 46 94 46 94 78" fill="none" stroke="#1c140b" strokeWidth={12} strokeLinecap="round" />
          <path d="M26 78 C26 46 94 46 94 78" fill="none" stroke="var(--ac)" strokeWidth={3} strokeLinecap="round" opacity={0.9} />
          {Array.from({ length: 9 }).map((_, i) => {
            const t = i / 8;
            const a = Math.PI * (1 - t);
            const cx = 60 + Math.cos(a) * 34;
            const cy = 78 - Math.sin(a) * 32;
            return <circle key={i} cx={cx} cy={cy} r={3.2} fill="var(--ac)" opacity={0.5 + (i % 2) * 0.5} />;
          })}
          <text x={60} y={70} fontFamily="var(--f-disp)" fontSize={20} fill="var(--ac)" textAnchor="middle" opacity={0.92}>OPEN</text>
          {Shadow}
        </>
      );

    default:
      return (
        <>
          {Glow}
          <circle cx={60} cy={60} r={24} fill="none" stroke={CR} strokeWidth={3} />
        </>
      );
  }
}

export function LayoutEmblem({ k }: { k: FormatKey }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <Art k={k} />
    </svg>
  );
}

export default LayoutEmblem;
