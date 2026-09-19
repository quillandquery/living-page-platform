import type { CSSProperties } from "react";
import { StorySeed } from "@/components/wander/StorySeed";
import type { StorySeed as Seed } from "@/lib/discover";

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * THE ARCHIVE — a person's own corner, not Wander's field.
 *
 * Renders through the same Story Seed unit Wander uses (lib/discover.ts's
 * buildSeed + components/wander/StorySeed.tsx) for a seed's own content —
 * a story never gets a second renderer for its hook/doodle/voice. But the
 * composition around it is deliberately not Wander's: capped at two
 * columns always (Wander grows to three or four as it fills), and density
 * is felt through tighter whitespace as the archive grows rather than more
 * columns or a counter. Every piece wears a small strip of tape in its own
 * accent colour — the one mark Wander's field never has, which alone does
 * most of the work of reading as things pinned to a board rather than
 * objects scattered in open space.
 *
 * Every per-item value below is seeded off the story's own id, so the wall
 * is stable across requests rather than reshuffled per render.
 */
export function AuthorArchive({ seeds }: { seeds: Seed[] }) {
  const density = seeds.length <= 3 ? "sparse" : seeds.length <= 14 ? "grown" : "full";

  return (
    <ul className={`author-archive density-${density}`}>
      {seeds.map((seed, i) => {
        const h = hash(seed.key);
        const lift = ((h >> 3) % 100) / 100; // 0..1 — vertical rhythm per piece
        const nudge = (h >> 11) % 5 === 0 ? (h % 2 ? 1 : -1) : 0; // rare horizontal offset (whitespace only)
        const tapeRot = ((h >> 6) % 17) - 8; // -8..8deg
        const tapeX = 10 + ((h >> 15) % 55); // 10%..65% across the piece
        const tapeSide = h % 2 === 0 ? "top" : "corner";
        const style = {
          ["--lift" as string]: `${(lift * 2.4).toFixed(2)}rem`,
          ["--nudge" as string]: nudge,
          ["--tape-rot" as string]: `${tapeRot}deg`,
          ["--tape-x" as string]: `${tapeX}%`,
          ["--accent" as string]: seed.accent,
        } as CSSProperties;
        return (
          <li key={seed.key} className={`scrap scrap-tape-${tapeSide}`} style={style}>
            <span className="scrap-tape" aria-hidden="true" />
            <StorySeed seed={seed} index={i} />
          </li>
        );
      })}
    </ul>
  );
}

export default AuthorArchive;
