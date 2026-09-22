import Link from "next/link";
import { paletteStyle } from "@/lib/palette-style";

/**
 * READ NEXT EXPERIMENT 1 — three doors ("Keep going.")
 *
 * Not a card grid. Three physical objects — a postcard, a torn scrap, a
 * hole in the page — placed asymmetrically. Each destination story picks
 * its own treatment deterministically from its slug; the treatments carry
 * the destination's own accent so they read as objects from other
 * worlds sitting on the tail of this one.
 *
 * The wander door is always the "?" — a small round mouth.
 *
 * Isolated on purpose: nothing else in the reader depends on this.
 * Reverting the JSX block in StoryView.tsx removes it entirely.
 */

type Pick = {
  handle: string;
  slug: string;
  place: string;
  href?: string;
  theme?: string | null;
  fragment?: string | null;
  accent?: string | null;
  backdrop?: string | null;
} | null;

type Props = {
  same: Pick;
  surprise: Pick;
};

// Deterministic string hash → small integer. Same slug always maps to the
// same treatment, so the three portals on any given reader page keep the
// look stable across reloads.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const TREATMENTS = ["postcard", "torn", "type", "hole", "scene"] as const;
type Treatment = (typeof TREATMENTS)[number];

function treatmentFor(pick: NonNullable<Pick>): Treatment {
  return TREATMENTS[hash(pick.slug) % TREATMENTS.length];
}

// A tiny inline SVG that sits inside the "scene" treatment. Not from the
// doodle registry — a very small, cheap horizon so this component stays
// self-contained and easy to delete.
function TinyHorizon({ seed }: { seed: number }) {
  const jitter = ((seed % 7) - 3) * 0.6; // -1.8 … +1.8
  return (
    <svg className="door-scene-svg" viewBox="0 0 120 60" aria-hidden="true" focusable="false">
      <circle cx={82 + jitter} cy="22" r="7" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <path
        d={`M 4 ${44 + jitter} L 34 30 L 58 42 L 88 26 L 116 40`}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="4" y1="52" x2="116" y2="52" stroke="currentColor" strokeWidth="0.7" opacity="0.55" />
    </svg>
  );
}

function Door({ pick, index }: { pick: NonNullable<Pick>; index: 0 | 1 }) {
  const href = pick.href ?? `/@${pick.handle}/${pick.slug}`;
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(pick.accent ?? "") ? pick.accent! : null;
  const title = (pick.fragment?.trim() || pick.place).trim();
  const treatment = treatmentFor(pick);
  const label = `Read next: ${title} — from ${pick.place}${pick.theme ? ` (${pick.theme})` : ""}`;

  return (
    <Link
      href={href}
      aria-label={label}
      className={`door door--${treatment} door--slot-${index}`}
      style={accent ? paletteStyle(`--accent:${accent}`) : undefined}
    >
      {/* Inner render varies by treatment. The outer <Link> is one tap
          target either way. */}
      {treatment === "postcard" && (
        <>
          <span className="door-postcard-stamp" aria-hidden="true" />
          <span className="door-place">{pick.place}</span>
          <span className="door-title door-title--postcard">{title}</span>
          <span className="door-rule" aria-hidden="true" />
        </>
      )}
      {treatment === "torn" && (
        <>
          <span className="door-place">{pick.place}</span>
          <span className="door-title door-title--torn">{title}</span>
        </>
      )}
      {treatment === "type" && (
        <>
          <span className="door-place">{pick.place}</span>
          <span className="door-title door-title--type">{title}</span>
        </>
      )}
      {treatment === "hole" && (
        <>
          <span className="door-hole-ring" aria-hidden="true" />
          <span className="door-title door-title--hole">{title}</span>
          <span className="door-place door-place--hole">{pick.place}</span>
        </>
      )}
      {treatment === "scene" && (
        <>
          <TinyHorizon seed={hash(pick.slug)} />
          <span className="door-title door-title--scene">{title}</span>
          <span className="door-place">{pick.place}</span>
        </>
      )}
    </Link>
  );
}

export function RemindedOf({ same, surprise }: Props) {
  const doors: Array<{ node: React.ReactNode; key: string }> = [];
  if (same) doors.push({ key: "same", node: <Door pick={same} index={0} /> });
  if (surprise) doors.push({ key: "surprise", node: <Door pick={surprise} index={(doors.length as 0 | 1)} /> });

  // The wander door is always present — the small "?" mouth. If there
  // are no story picks at all, it stands alone as the graceful fallback.
  const wander = (
    <Link
      href="/wander"
      aria-label="Wander — a story chosen at random"
      className="door door--wander"
      key="wander"
    >
      <span className="door-wander-ring" aria-hidden="true" />
      <span className="door-wander-mark" aria-hidden="true">?</span>
      <span className="door-wander-label">wander</span>
    </Link>
  );

  return (
    <section className="next-doors" aria-label="Keep going — three ways in">
      <p className="next-doors-h">Keep going.</p>
      <span className="next-doors-drop" aria-hidden="true" />

      <div className="next-doors-stage" role="list">
        {doors.map((d) => (
          <div className="next-doors-slot" role="listitem" key={d.key}>{d.node}</div>
        ))}
        <div className="next-doors-slot next-doors-slot--wander" role="listitem">
          {wander}
        </div>
      </div>
    </section>
  );
}

export default RemindedOf;
