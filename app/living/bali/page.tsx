import { notFound } from "next/navigation";
import { CoastStorm, type CoastStormBeat } from "@/components/living/scenes/CoastStorm";

/** DEV ONLY — the Bali story as the coast-storm world, the first realised
 *  living world at the approved quality bar. */
const BEATS: CoastStormBeat[] = [
  { kind: "lead", text: `When I first got to Bali, I felt like a square peg in a round hole. Unseen, out of place, faintly <span class="em">wrong</span>.` },
  { text: `I know this nerve. I've met it before. And I know its only balm is time — which is annoying, because time is the one thing I can't optimize.` },
  { doodle: true, text: `So I did what I do with everything: I built a routine and clung to it like a life raft. Beach walk, 6&nbsp;p.m., every day. An anchor.` },
  { kind: "echo", text: `Very healthy. Very stable.` },
  { kind: "swell", text: `Until the anchor tried to kill me.` },
  { text: `The plan was the usual walk. Headphones on, I tried to lose myself in the music. I succeeded — completely, literally. I stopped tracking the direction, because <span class="abba">ABBA</span> was on and priorities are priorities.` },
  { storm: true, text: `6&nbsp;p.m. became 7. The moody sky became a <span class="em">raging storm</span>.` },
  { text: `Fine — not a storm. A torrential downpour. But you know how Mumbai girls are. Rain? Meh. Drizzle. We don't run.` },
  { text: `Only it wasn't drizzle. Five minutes in, soaked to the bone. Every shop shuttered. No clubs, no hotels, no people — just me, in the aftermath of a minor flood, dressed for a rooftop bar.` },
  { kind: "close", text: `Breathe in. Breathe&nbsp;<span class="hb">♥</span>&nbsp;out. <span class="abba">ABBA</span> is still here. That's something.` },
];

export default function BaliLiving() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <CoastStorm
      eyebrow="Bali · a field note"
      title="Beach walk, 6&nbsp;p.m."
      dek="An anchor. Until it tried to kill me."
      beats={BEATS}
    />
  );
}
