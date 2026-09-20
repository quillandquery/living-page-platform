"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { StorySeed } from "@/components/wander/StorySeed";
import type { StorySeed as Seed } from "@/lib/discover";

/**
 * THE DECK — an author's stories as a fanned deck you flip through, one in
 * focus at a time, the rest trailing off to the right.
 *
 * This replaces the earlier scattered "field" composition. The field's
 * problem wasn't the seed shapes, it was showing all of them at once with
 * no body: a wall of bare words read as confetti. A deck fixes that by
 * construction — there is exactly one card in focus, so it can't help but
 * have presence, and the varied seed SHAPES (postcard, torn scrap, giant
 * word, ticket, drifting line) read as delight in sequence rather than mess
 * in a scatter. Two stories that happen to share a shape are separated by a
 * flip, so repetition barely registers.
 *
 * Wander's StorySeed is reused untouched for each card's interior (its own
 * archetype treatment and its own link to the story). Because StorySeed is
 * itself an <a>, we never wrap it in another anchor: instead the card
 * intercepts clicks on NON-focused cards to bring them forward, and lets the
 * focused card's own link do the reading. With JS off, no interception
 * happens and every card is simply its own link to its story — a plain
 * stack of links, which is also exactly what a crawler or link preview sees.
 */

const FOCUS = "focus";
const AHEAD = "ahead";
const PAST = "past";

export function AuthorArchive({ seeds }: { seeds: Seed[] }) {
  const n = seeds.length;
  const [current, setCurrent] = useState(0);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (dir: 1 | -1) => setCurrent((c) => Math.min(Math.max(c + dir, 0), n - 1)),
    [n],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx < -45) go(1);
    else if (dx > 45) go(-1);
    touchX.current = null;
  };

  return (
    <div className="deck" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <ul className="deck-stack" style={{ ["--n" as string]: n } as CSSProperties}>
        {seeds.map((seed, i) => {
          const offset = i - current;
          const state = offset === 0 ? FOCUS : offset < 0 ? PAST : AHEAD;
          const style = {
            ["--offset" as string]: offset,
            ["--abs" as string]: Math.abs(offset),
            zIndex: n - Math.abs(offset),
          } as CSSProperties;
          return (
            <li
              key={seed.key}
              className={`deck-card is-${state}`}
              style={style}
              aria-hidden={offset === 0 ? undefined : true}
              // Bring a trailing card forward on click; the focused card is
              // left alone so its own inner link reads the story. Capture so
              // this runs before StorySeed's <Link> would navigate. With JS
              // off, none of this fires and the inner link just works.
              onClickCapture={(e) => {
                if (offset !== 0) { e.preventDefault(); e.stopPropagation(); setCurrent(i); }
              }}
            >
              <StorySeed seed={seed} index={i} />
            </li>
          );
        })}
      </ul>

      {n > 1 ? (
        <nav className="deck-nav" aria-label="Move through the deck">
          <button className="deck-arrow" onClick={() => go(-1)} disabled={current === 0} aria-label="Previous story">‹</button>
          <span className="deck-ticks" aria-hidden="true">
            {seeds.map((s, i) => (
              <span key={s.key} className={`deck-tick${i === current ? " is-here" : ""}`} />
            ))}
          </span>
          <button className="deck-arrow" onClick={() => go(1)} disabled={current === n - 1} aria-label="Next story">›</button>
        </nav>
      ) : null}
    </div>
  );
}

export default AuthorArchive;
