"use client";

import React, { useEffect, useRef } from "react";

/**
 * SCROLL IS CHOREOGRAPHY.
 *
 * One rAF-throttled pass owns every beat on the page. Two distances, not
 * a boolean: `near` is a shape with weight, `arrived` is resolved. A beat
 * that has arrived never veils again, so the reader can always look back.
 *
 * The veil class is added here, in script — a page with JS disabled
 * renders the whole story legibly, and nothing is ever parked at
 * opacity: 0 waiting on an observer.
 */
export function StoryFrame({
  children, veil = true, accent,
}: { children: React.ReactNode; veil?: boolean; accent?: string }) {
  const flow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = flow.current;
    if (!root) return;

    if (veil) root.classList.add("veiled");
    let pending = Array.from(root.querySelectorAll<HTMLElement>(".beat"));
    let started = !veil;
    let ticking = false;

    const tick = () => {
      ticking = false;
      const vh = window.innerHeight;
      const readAt = veil ? vh * 0.78 : vh * 0.92;
      const nearAt = vh * 1.25;
      for (let i = pending.length - 1; i >= 0; i--) {
        const el = pending[i];
        const top = el.getBoundingClientRect().top;
        if (started && top < readAt) {
          el.classList.add("arrived");
          el.classList.remove("near");
          pending.splice(i, 1);
        } else {
          el.classList.toggle("near", top < nearAt);
        }
      }
    };
    const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } };
    const onScroll = () => { started = true; queue(); };

    // The piece opens on its frontispiece and its first line. Nothing
    // below that resolves until the reader actually moves: the story
    // starts when they start it.
    if (veil) {
      const first = pending.shift();
      if (first) window.setTimeout(() => first.classList.add("arrived"), 340);
    } else {
      let k = 0;
      const keep: HTMLElement[] = [];
      pending.forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.94) {
          window.setTimeout(() => el.classList.add("arrived"), 140 + k++ * 130);
        } else keep.push(el);
      });
      pending = keep;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", queue);
    requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", queue);
    };
  }, [veil]);

  return (
    <div className="flow" ref={flow} style={accent ? ({ ["--accent" as string]: accent } as React.CSSProperties) : undefined}>
      {children}
    </div>
  );
}

export default StoryFrame;
