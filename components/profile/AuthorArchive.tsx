"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Beat } from "@/components/living/Beat";
import { Doodle } from "@/components/doodles/Doodle";
import { Backdrop } from "@/components/living/Backdrop";
import type { StorySeed as Seed } from "@/lib/discover";

/**
 * THE DECK — an author's stories as a fanned deck of POLAROIDS you flip
 * through, one in focus at a time, the rest trailing off to the right.
 *
 * The card is a polaroid: a consistent white frame (which reads instantly
 * as "a personal photo / a collected moment" — the thing that tells a
 * first-time visitor these are stories to look at, not UI) wrapped around a
 * "photo" that wears the STORY'S OWN WORLD — the tinted paper, accent and
 * ink `buildSeed` derives from its place and mood (lib/backdrops.ts). So
 * flipping the deck is flipping through different places: a coast reads warm
 * and bright, a monsoon dark and teal, a café amber. The handwritten caption
 * is the writing on the polaroid's white lip.
 *
 * Reuses the living primitives (Beat for voice→type, Doodle) rather than
 * Wander's field renderer, so nothing about Wander changes. Each card scopes
 * its world via a tiny inline <style> keyed to its own class. The whole
 * focused card is a real link (and every card is a link with JS off), so a
 * crawler or link preview still sees a plain list of story links.
 */

function captionOf(seed: Seed): string {
  return [seed.place, seed.date].map((s) => (s || "").trim()).filter(Boolean).join(" · ");
}

function Polaroid({ seed, index, scene }: { seed: Seed; index: number; scene: boolean }) {
  const cls = `pol-${seed.key}`;
  const caption = captionOf(seed);
  const hasWorld = !!seed.backdrop;
  return (
    <div className={`polaroid ${cls}`} style={{ ["--accent" as string]: seed.accent } as CSSProperties}>
      {/* the story's world, scoped to this card only */}
      <style>{`.${cls}{${seed.worldCss}}`}</style>
      <div className="polaroid-photo">
        {/* the artwork: the story's actual world scene when it has one
            (rendered only for cards near focus, to keep a big deck light),
            otherwise its own doodle enlarged as the photo's subject. */}
        {hasWorld && scene ? (
          <div className="polaroid-scene" aria-hidden="true">
            <Backdrop name={seed.backdrop ?? undefined} seed={seed.slug} />
          </div>
        ) : (
          <span className="polaroid-art" aria-hidden="true">
            <Doodle name={seed.doodle} seed={index} size={150} ink="var(--accent)" />
          </span>
        )}
        <span className="polaroid-idx">{String(index + 1).padStart(2, "0")}</span>
        {seed.place ? <span className="polaroid-stamp">{seed.place}</span> : null}
        <div className="polaroid-hook">
          <Beat voice={seed.dominantVoice} seed={index} ink="var(--ink)">
            {seed.hook}
          </Beat>
        </div>
        {seed.secondDoodle && !hasWorld ? (
          <span className="polaroid-doodle2" aria-hidden="true">
            <Doodle name={seed.secondDoodle} seed={index + 3} size={38} ink="var(--accent)" />
          </span>
        ) : null}
      </div>
      <div className="polaroid-caption">
        <span className="polaroid-cap">{caption || "a page"}</span>
        <span className="polaroid-read">read →</span>
      </div>
    </div>
  );
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
            >
              <a
                href={seed.href}
                className="deck-card-link"
                tabIndex={focused ? 0 : -1}
                onClick={(e) => { if (!focused) { e.preventDefault(); setCurrent(i); } }}
              >
                <Polaroid seed={seed} index={i} scene={Math.abs(offset) <= 3} />
              </a>
            </li>
          );
        })}
      </ul>

      {n > 1 ? (
        <div className="deck-controls">
          <p className="deck-hint">Tap a card to read the story · swipe or use ‹ › to flip</p>
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
