import React from "react";
import { Beat, type BeatProps } from "./Beat";

type V = Omit<BeatProps, "voice">;

/** Normal narration. The most common mode by a long way — see README. */
export const Speak = (p: V) => <Beat voice="speak" {...p} />;

/** Intimate, vulnerable, internal. Small type, a lot of air. */
export const Whisper = (p: V) => <Beat voice="whisper" {...p} />;

/** Emotional turn, revelation, joke. Use sparingly or it stops working. */
export const Shout = (p: V) => <Beat voice="shout" {...p} />;

/** What the narrator did not say out loud. */
export const Thought = (p: V) => <Beat voice="thought" {...p} />;

/** Dreams, water, disorientation, time behaving strangely. */
export const Drift = (p: V) => <Beat voice="drift" {...p} />;

/** The final line, or the one before the silence. Nearly empty screen. */
export const Listen = (p: V) => <Beat voice="listen" {...p} />;

/**
 * A phrase that will not leave. Repeats while shrinking and fading until
 * it is gone. Very rare — once a story, at most.
 */
export function Echo({ children, times = 3, ...rest }: V & { times?: number }) {
  const reps = Array.from({ length: times }, (_, i) => i);
  return (
    <Beat voice="echo" {...rest}>
      {reps.map((i) => (
        <span
          className="repeat"
          key={i}
          style={{
            opacity: 1 - i / times,
            transform: `scale(${1 - i * (0.22 / Math.max(times - 1, 1))}) translateX(${i * 1.1}rem)`,
            marginTop: i === 0 ? 0 : "0.15em",
          }}
        >
          {children}
        </span>
      ))}
    </Beat>
  );
}
