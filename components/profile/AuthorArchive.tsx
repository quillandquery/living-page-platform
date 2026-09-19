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
 * Renders through the exact same Story Seed unit Wander uses
 * (lib/discover.ts's buildSeed + components/wander/StorySeed.tsx), so a
 * story is never given a second renderer — only the composition around it
 * is new. Wander is many worlds colliding in one wide field; this is one
 * person's things, collected: narrower, quieter at the edges, denser as it
 * grows, closer to a shelf than a gallery. It never sorts stories into a
 * grid of identical rectangles.
 *
 * Layout is CSS multi-column (same mechanism Wander's field already uses)
 * so it reflows for free at any width with no measuring, no JS, and no
 * layout thrash — only the per-item vertical rhythm below is bespoke to
 * the archive, seeded off the story's own id so it's stable across
 * requests, not re-rolled per render.
 */
export function AuthorArchive({ seeds }: { seeds: Seed[] }) {
  const density = seeds.length <= 4 ? "sparse" : seeds.length <= 12 ? "grown" : "full";

  return (
    <ul className={`author-archive density-${density}`}>
      {seeds.map((seed, i) => {
        const h = hash(seed.key);
        const lift = ((h >> 3) % 100) / 100; // 0..1 — a little vertical rhythm per piece
        const nudge = (h >> 11) % 5 === 0 ? (h % 2 ? 1 : -1) : 0; // rare, small horizontal offset
        const style = {
          ["--lift" as string]: `${(lift * 2.4).toFixed(2)}rem`,
          ["--nudge" as string]: nudge,
        } as CSSProperties;
        return (
          <li key={seed.key} className="scrap" style={style}>
            <StorySeed seed={seed} index={i} />
          </li>
        );
      })}
    </ul>
  );
}

export default AuthorArchive;
