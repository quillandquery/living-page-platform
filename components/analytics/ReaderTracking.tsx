"use client";

/**
 * READER ACTIVITY — deliberately its own component, not folded into
 * StoryFrame.tsx.
 *
 * StoryFrame is the scroll-choreography engine (one rAF pass owns veiling
 * every beat) and it's shared by the real reader page, `/looks`,
 * `/dev/preview`, `/wander/s/*` seed stories and the editor's full-screen
 * preview — most of which are internal tools or demo content, not a real
 * reader reading a real published story. Wiring analytics into that shared
 * primitive would mean either polluting demo/dev traffic with fake
 * "story_viewed" events, or threading an opt-out flag through every one of
 * those call sites. Mounting this component only from
 * `app/[handle]/[slug]/page.tsx` (the actual `/@handle/slug` reader route)
 * gets the same signal with zero risk to the primitive that must never
 * throw.
 *
 * Its own scroll listener, not StoryFrame's `--depth` state — this only
 * needs four milestones, not per-frame precision, so a simple
 * rAF-throttled scroll listener is enough and keeps this component fully
 * decoupled from the choreography internals.
 */

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/client";

const MILESTONES = [25, 50, 75, 100] as const;

export function ReaderTracking({
  storyId, authorHandle, slug, format,
}: { storyId: string; authorHandle: string; slug: string; format: string }) {
  const fired = useRef(new Set<number>());

  useEffect(() => {
    fired.current = new Set();
    track("story_viewed", { story_id: storyId, author_handle: authorHandle, slug, format });

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - doc.clientHeight;
        const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 100;
        for (const m of MILESTONES) {
          if (percent >= m && !fired.current.has(m)) {
            fired.current.add(m);
            track("story_scroll_depth", { story_id: storyId, percent: m });
          }
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // a short story may already satisfy every milestone with no scroll at all
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  return null;
}
