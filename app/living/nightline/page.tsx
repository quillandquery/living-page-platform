import { notFound } from "next/navigation";
import { NoirRoom, type NoirBeat } from "@/components/living/scenes/NoirRoom";

/** DEV ONLY — "Nightline" as the noir-room world: the thriller quality bar.
 *  The phone stacks missed calls as you read; the shout (BEHIND) runs a
 *  tremor+swell; the escape line streaks. */
const BEATS: NoirBeat[] = [
  { kind: "lead", call: { who: "Unknown", sub: "Missed call" }, text: `The first missed call she ignored.` },
  { call: { who: "Unknown", sub: "Missed call" }, text: `The second she silenced.` },
  { call: { who: "Unknown", sub: "Calling…", danger: true }, text: `The third was ringing before the second had stopped — the same number, the one with too many digits, the one she didn't know.` },
  { kind: "lead", text: `She noticed the front door. <span class="nr-cold">Open.</span> A hand's width. The cold coming in. She hadn't opened it.` },
  { text: `Somewhere in the flat, a floorboard remembered someone's weight.` },
  { text: `She counted the doors between herself and the street — three — and the seconds between herself and whatever stood in the hall — fewer.` },
  { text: `The phone lit again. No number this time. A single word.` },
  { kind: "behind", tremor: true, text: `<span class="nr-behind">BEHIND.</span>` },
  { kind: "run", text: `<span class="nr-ran">She ran.</span>` },
];

export default function NightlineLiving() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <NoirRoom
      eyebrow="Thriller"
      title="Nightline"
      beats={BEATS}
    />
  );
}
