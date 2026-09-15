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
 *
 * The shell may be the window (a story read on the platform) or a
 * scrolling box that fills the window (the studio's full-screen reveal).
 * We resolve which one actually scrolls and listen to it — and, because a
 * nested element's scroll does not bubble, we also listen in the capture
 * phase so an overlay's scroll still drives the choreography.
 */
export function StoryFrame({
  children, veil = true, accent, arc = true,
}: { children: React.ReactNode; veil?: boolean; accent?: string; arc?: boolean }) {
  const flow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = flow.current;
    if (!root) return;

    // the nearest ancestor that scrolls, if any — otherwise the window.
    const scrollParent = (el: HTMLElement | null): HTMLElement | null => {
      let n = el?.parentElement ?? null;
      while (n) {
        if (n === document.body || n === document.documentElement) break;
        const s = getComputedStyle(n);
        if (/(auto|scroll|overlay)/.test(s.overflowY)) return n;
        n = n.parentElement;
      }
      return null; // the window scrolls
    };
    const box = scrollParent(root); // null => the window scrolls

    if (veil) root.classList.add("veiled");
    let pending = Array.from(root.querySelectorAll<HTMLElement>(".beat"));
    let started = !veil;
    let ticking = false;

    // how deep the reader is, quantised so we are not restyling the
    // document on every frame. Colour thickens with it.
    let lastDepth = -1;
    const setDepth = () => {
      // the archive is not a piece being read, so it holds one settled tint
      if (!arc) {
        if (lastDepth !== 0.5) { lastDepth = 0.5; document.documentElement.style.setProperty("--depth", "0.5"); }
        return;
      }
      const span = box ? box.scrollHeight - box.clientHeight
                       : document.documentElement.scrollHeight - window.innerHeight;
      const pos = box ? box.scrollTop : window.scrollY;
      const raw = span > 0 ? pos / span : 0;
      const d = Math.round(Math.min(1, Math.max(0, raw)) * 20) / 20;
      if (d !== lastDepth) {
        lastDepth = d;
        document.documentElement.style.setProperty("--depth", String(d));
      }
    };

    // viewport height and a beat's position within it — valid whether the
    // scroller is the window or a box that fills it (fixed inset:0).
    const vpH = () => (box ? box.clientHeight : window.innerHeight);
    const topOf = (el: HTMLElement) => {
      const t = el.getBoundingClientRect().top;
      return box ? t - box.getBoundingClientRect().top : t;
    };

    const tick = () => {
      ticking = false;
      setDepth();
      const vh = vpH();
      const readAt = veil ? vh * 0.78 : vh * 0.92;
      const nearAt = vh * 1.25;
      for (let i = pending.length - 1; i >= 0; i--) {
        const el = pending[i];
        const top = topOf(el);
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
        if (topOf(el) < vpH() * 0.94) {
          window.setTimeout(() => el.classList.add("arrived"), 140 + k++ * 130);
        } else keep.push(el);
      });
      pending = keep;
    }

    // capture phase so a nested overlay's (non-bubbling) scroll is heard too
    const target: EventTarget = box ?? window;
    target.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", queue);
    requestAnimationFrame(tick);
    return () => {
      target.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", queue);
      document.documentElement.style.removeProperty("--depth");
    };
  }, [veil, arc]);

  return (
    <div className="flow" ref={flow} style={accent ? ({ ["--accent" as string]: accent } as React.CSSProperties) : undefined}>
      {children}
    </div>
  );
}

export default StoryFrame;
