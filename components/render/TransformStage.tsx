"use client";

import { useEffect, useState } from "react";

/**
 * THE TRANSFORM STAGE — the homepage's trick, on a real story.
 *
 * `app/page.tsx`'s hero does the product's whole argument in one gesture:
 * the SAME lines, in the SAME box, transition from plain to alive
 * (`.hero-line` + a .9s cubic-bezier, `ph-0` muted and small → `ph-2`
 * handwritten/display/coloured). Nobody is told what happened. They watch
 * it happen.
 *
 * This does the same thing to the writer's actual beats — but a share
 * artifact for Instagram isn't a link-preview teaser for a page that
 * lives elsewhere, it IS a piece of visual content on its own, watched
 * for its own duration. So the gesture has to read as two distinct
 * beats, not one glide:
 *
 *   ph-0  AS TYPED — plain monospace, drained of colour. Held long
 *         enough to register as "someone's raw words," not a flash.
 *   ph-1  THE DECISION — the engine's voice/body choice lands on a hard
 *         cut (see the render page's `steps(1,end)` transitions on
 *         font-family/weight/case): a verdict, not a blend. Scale hasn't
 *         moved yet — what grows next is a *consequence* of this,
 *         not the decision itself.
 *   ph-2  THE CONSEQUENCE — poster scale overshoots into place, the
 *         line breaches the frame, the doodle draws itself stroke by
 *         stroke, the world and colour arrive. Held, not rushed off —
 *         this state is what the loop (and the eventual video capture)
 *         actually shows.
 *
 * Phase is driven here so the capture worker can either record the whole
 * gesture (video) or pin a single moment (`?phase=2` for the still).
 */

export type Phase = 0 | 1 | 2;

/** how long the raw, as-typed line holds before the voice decides */
const RAW_MS = 1500;
/** the decision itself — held briefly at un-grown scale so the hard cut
 *  in typeface/weight/case actually registers before anything grows */
const DECIDE_MS = RAW_MS + 380;
/** everything that follows AS a consequence of the decision: scale,
 *  overflow breach, doodle draw-in, world, colour */
const ALIVE_MS = DECIDE_MS + 460;

export function TransformStage({
  children,
  className = "",
  /** pin to a phase and never animate — used for still capture */
  fixed,
  /** restart the loop every N ms so a recording can catch a clean cycle.
   *  Left generous by default so the settled ph-2 state — the doodle
   *  finishing its stroke, the world fully arrived — actually gets seen
   *  before the gesture resets, rather than being a flash before a cut. */
  loopMs,
}: {
  children: React.ReactNode;
  className?: string;
  fixed?: Phase;
  loopMs?: number;
}) {
  const [phase, setPhase] = useState<Phase>(fixed ?? 0);

  useEffect(() => {
    if (fixed !== undefined) return;

    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setPhase(0);
      timers.push(setTimeout(() => setPhase(1), RAW_MS));
      timers.push(setTimeout(() => setPhase(2), DECIDE_MS));
    };
    run();

    let interval: ReturnType<typeof setInterval> | undefined;
    if (loopMs) interval = setInterval(run, loopMs);

    return () => {
      timers.forEach(clearTimeout);
      timers = [];
      if (interval) clearInterval(interval);
    };
  }, [fixed, loopMs]);

  // `data-phase` is what the capture worker polls to know the gesture has
  // landed before it takes the shot. ALIVE_MS is exported implicitly via
  // this value: the shot for a still should be taken at least ALIVE_MS
  // after phase 2 fires, once the consequence has finished settling.
  return (
    <div className={`lp-stage ph-${phase} ${className}`} data-phase={phase} data-settle-ms={ALIVE_MS - DECIDE_MS}>
      {children}
    </div>
  );
}

export default TransformStage;
