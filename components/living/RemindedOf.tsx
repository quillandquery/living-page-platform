import Link from "next/link";
import { Backdrop } from "./Backdrop";
import { getBackdrop, worldVars } from "@/lib/backdrops";
import { paletteStyle } from "@/lib/palette-style";

/**
 * READ NEXT EXPERIMENT 1 — "this reminded me of…"
 *
 * Not a recommendation strip. One associative link out of the story,
 * rendered as the destination's OWN page in miniature — its real world
 * (the actual <Backdrop>, scoped to this card via worldVars()/
 * paletteStyle() rather than invented motifs), its own hook, alive on
 * hover — reached by a single drawn thread. A quiet secondary line
 * offers a surprise + Wander below it: always present, never a peer —
 * "this reminded me of…" is a singular gesture; many equal choices would
 * turn it back into a feed. See the prototype's director's notes for the
 * full one-vs-many rationale.
 *
 * The pick itself is unchanged — `same`/`surprise` still come from the
 * reader's existing thematic logic in app/[handle]/[slug]/page.tsx
 * (themesOf() keyword overlap → same-accent fallback → a real surprise).
 * This component only changes how that pick is presented.
 *
 * Isolated on purpose: nothing else in the reader depends on this.
 * Revert the JSX block in StoryView.tsx (and this file + its CSS block
 * in globals.css, "READ NEXT EXPERIMENT 1") to remove it entirely.
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

const safeAccent = (a?: string | null) => (/^#[0-9a-fA-F]{3,8}$/.test(a ?? "") ? (a as string) : "#2B3ED0");

/** Words with a stable `--i` index, so the CSS-only reveal can stagger
 *  them — the same trick Beat.tsx's wordify() uses, kept as plain markup
 *  here because this reveals on hover/focus, not on scroll arrival. */
function staggeredWords(s: string) {
  return s.split(/(\s+)/).map((part, i) =>
    /^\s*$/.test(part) ? part : (
      <span className="remind-w" style={{ ["--i" as string]: i } as React.CSSProperties} key={i}>{part}</span>
    )
  );
}

function Door({ pick }: { pick: NonNullable<Pick> }) {
  const world = getBackdrop(pick.backdrop ?? undefined);
  const vars = worldVars(world, safeAccent(pick.accent));
  const href = pick.href ?? `/@${pick.handle}/${pick.slug}`;
  const title = (pick.fragment?.trim() || pick.place).trim();
  const cue = pick.theme ? `you both wrote about ${pick.theme}` : null;
  const label = `Read next: ${title} — from ${pick.place}${pick.theme ? `, because you both wrote about ${pick.theme}` : ""}`;

  return (
    <Link href={href} aria-label={label} className="remind-door" style={paletteStyle(vars)}>
      <span className="remind-scene" aria-hidden="true">
        <Backdrop name={pick.backdrop ?? undefined} seed={pick.slug} scheme={world?.scheme} />
      </span>
      <span className="remind-pg">
        <span className="remind-place">{pick.place}</span>
        <span className="remind-rule" aria-hidden="true" />
        <span className="remind-hook">{title}</span>
        {cue ? <span className="remind-why">{staggeredWords(cue)}</span> : null}
        <span className="remind-foot">
          <span className="remind-by">from @{pick.handle}</span>
          <span className="remind-read">read <span className="remind-arw" aria-hidden="true">→</span></span>
        </span>
      </span>
      <span className="remind-stamp" aria-hidden="true">this one.</span>
    </Link>
  );
}

function WanderLink({ solo }: { solo?: boolean }) {
  return (
    <Link
      href="/wander"
      aria-label="Wander — a story chosen at random"
      className={solo ? "remind-door remind-door--wander" : "remind-alt remind-alt--wander"}
    >
      <span className="remind-wander-ring" aria-hidden="true" />
      <span className="remind-wander-mark" aria-hidden="true">?</span>
      <span className="remind-wander-label">wander</span>
    </Link>
  );
}

export function RemindedOf({ same, surprise }: Props) {
  const primary = same ?? surprise;
  // Only offer the surprise a second time when it's genuinely different
  // from whatever is already carrying the primary thread.
  const secondary = same && surprise && surprise.slug !== same.slug ? surprise : null;

  if (!primary) {
    return (
      <section className="remind remind--empty" aria-label="Nothing rhymed — wander instead">
        <span className="remind-cue remind-cue--empty">nothing rhymed with this one, yet —</span>
        <WanderLink solo />
      </section>
    );
  }

  return (
    <section className="remind" aria-label="This reminded me of">
      <div className="remind-stage">
        <p className="remind-cue">this reminded me of…</p>

        <svg className="remind-thread remind-thread--desk" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
          <path className="remind-thread-base" d="M120 92 C 300 150 250 300 470 300 S 470 258 560 262" />
          <path className="remind-thread-glow" d="M120 92 C 300 150 250 300 470 300 S 470 258 560 262" />
          <circle className="remind-thread-node" cx="470" cy="300" r="5.5" />
          <circle className="remind-thread-ring" cx="470" cy="300" r="5.5" />
        </svg>
        <svg className="remind-thread remind-thread--phone" viewBox="0 0 200 96" preserveAspectRatio="none" aria-hidden="true">
          <path className="remind-thread-base" d="M100 4 C 60 34 140 60 100 92" />
          <path className="remind-thread-glow" d="M100 4 C 60 34 140 60 100 92" />
          <circle className="remind-thread-node" cx="118" cy="49" r="4.5" />
          <circle className="remind-thread-ring" cx="118" cy="49" r="4.5" />
        </svg>

        <Door pick={primary} />
      </div>

      <div className="remind-onward">
        <span className="remind-onward-h">or, somewhere else —</span>
        <span className="remind-onward-row">
          {secondary ? (
            <Link
              href={secondary.href ?? `/@${secondary.handle}/${secondary.slug}`}
              className="remind-alt"
              aria-label={`A surprise: ${(secondary.fragment?.trim() || secondary.place).trim()} — from ${secondary.place}`}
            >
              <span className="remind-alt-tag">a surprise · {secondary.place}</span>
              <span className="remind-alt-title">{(secondary.fragment?.trim() || secondary.place).trim()}</span>
            </Link>
          ) : null}
          <WanderLink />
        </span>
      </div>
    </section>
  );
}

export default RemindedOf;
