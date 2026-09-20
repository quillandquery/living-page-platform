"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { StorySeed } from "@/components/wander/StorySeed";
import type { StorySeed as Seed } from "@/lib/discover";

/**
 * THE DECK — an author's stories as a fanned deck you flip through, one in
 * focus at a time, the rest trailing off to the right.
 *
 * Each card carries a little consistent "furniture" around the Story Seed
 * interior — an index + place/date up top, a "read" cue at the foot — so
 * that even a one-word story reads as a full, finished card rather than a
 * word stranded in an empty field, and so a first-time visitor can see at a
 * glance that a card is a thing to read and the fan is a thing to flip.
 *
 * Wander's StorySeed is reused untouched for the interior (its own archetype
 * shape + its own link to the story). Because StorySeed is itself an <a> we
 * never nest anchors: non-focused cards intercept clicks to come forward,
 * and the focused card's own link (plus the "read" link at its foot) does
 * the reading. With JS off nothing intercepts and every card is simply its
 * own link — which is also what a crawler or link preview sees.
 */

function metaLine(seed: Seed): string {
  return [seed.place, seed.date].map((s) => (s || "").trim()).filter(Boolean).join(" · ");
}

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
          const state = offset === 0 ? "focus" : offset < 0 ? "past" : "ahead";
          const focused = offset === 0;
          const meta = metaLine(seed);
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
              aria-hidden={focused ? undefined : true}
              onClickCapture={(e) => {
                if (!focused) { e.preventDefault(); e.stopPropagation(); setCurrent(i); }
              }}
            >
              <div className="deck-card-inner">
                <div className="deck-card-top">
                  <span className="deck-card-idx">{String(i + 1).padStart(2, "0")}</span>
                  {meta ? <span className="deck-card-meta">{meta}</span> : null}
                </div>
                <div className="deck-card-body">
                  <StorySeed seed={seed} index={i} />
                </div>
                <a href={seed.href} className="deck-card-foot" tabIndex={focused ? 0 : -1}>
                  read <span aria-hidden="true">→</span>
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      {n > 1 ? (
        <div className="deck-controls">
          <p className="deck-hint">Tap a card to read · swipe or use ‹ › to flip through</p>
          <nav className="deck-nav" aria-label="Move through the deck">
            <button className="deck-arrow" onClick={() => go(-1)} disabled={current === 0} aria-label="Previous story">‹</button>
            <span className="deck-ticks" aria-hidden="true">
              {seeds.map((s, i) => (
                <span key={s.key} className={`deck-tick${i === current ? " is-here" : ""}`} />
              ))}
            </span>
            <button className="deck-arrow" onClick={() => go(1)} disabled={current === n - 1} aria-label="Next story">›</button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

export default AuthorArchive;
