/**
 * ONE SENTENCE. MANY PERSONALITIES — the shared rendering engine behind the
 * homepage's interactive "try it" demo (see TryIt.tsx).
 *
 * Deliberately restyled to match the live homepage's existing visual
 * language rather than inventing a new one: one consistent card
 * (`.hero-page`, same box as the transform demo), and each personality is a
 * pure typography/colour change on a single line — exactly how the live
 * page's five-personality demo worked (`p-whisper` / `p-shout` / `p-hand` /
 * `p-drift` / `p-type`) — not a different background, border or icon per
 * world. No SVG doodles here; the live page's only "artwork" is the plain
 * radial-gradient hero-doodle, kept as-is in AutoStage.
 */

export type WorldKey = "auto" | "postcard" | "diary" | "comic" | "collage" | "cinematic" | "minimal";

export const TAB_ORDER: WorldKey[] = ["auto", "postcard", "diary", "comic", "collage", "cinematic", "minimal"];

export const WORLD_META: Record<WorldKey, { tag: string; swatch: string }> = {
  auto: { tag: "Auto", swatch: "var(--tomato)" },
  postcard: { tag: "Postcard", swatch: "var(--tomato)" },
  diary: { tag: "Diary", swatch: "var(--electric)" },
  comic: { tag: "Comic", swatch: "var(--coral)" },
  collage: { tag: "Collage", swatch: "var(--grass)" },
  cinematic: { tag: "Cinematic", swatch: "var(--lilac)" },
  minimal: { tag: "Minimal", swatch: "var(--mute)" },
};

/** A tiny, deliberately dumb sentence-splitter for the Auto demo only — not
 *  the real engine, just enough to give arbitrary typed text the same
 *  three-line shape as the default paragraph. */
export function splitBeats(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts.slice(0, 3) : [text.trim() || "…"];
}

/** Which line-personality (hl-0/1/2, same as the live hero) a beat gets: a
 *  lone line earns the big display treatment, two lines go quiet→loud,
 *  three get the full arc. */
function voiceIndex(i: number, total: number): 0 | 1 | 2 {
  if (total <= 1) return 2;
  if (total === 2) return i === 0 ? 0 : 2;
  return i as 0 | 1 | 2;
}

const WORD_RE = /\s+/;

/** The live hero-transform, unchanged in spirit: ordinary → transforming →
 *  alive, using the existing hero-page/hero-line/hero-doodle mechanism. */
export function AutoStage({ beats, phase }: { beats: string[]; phase: 0 | 1 | 2 }) {
  return (
    <div className={`hero-page ph-${phase}`} aria-hidden="true">
      <span className="hero-doodle" />
      {beats.map((line, i) => (
        <p key={i} className={`hero-line hl-${voiceIndex(i, beats.length)}`}>
          {line}
          {i === beats.length - 1 ? <span className="hero-caret" /> : null}
        </p>
      ))}
    </div>
  );
}

/** The other six personalities: same box, same anchor sentence, just a
 *  different voice — the live page's actual trick. */
export function WorldStage({ world, sentence }: { world: Exclude<WorldKey, "auto">; sentence: string }) {
  const text = sentence.trim() || "…the page is waiting for your words.";

  if (world === "collage") {
    return (
      <p className="per-line p-collage">
        {text.split(WORD_RE).map((word, wi) => (
          <span key={wi} className="wc-word" style={{ ["--r" as string]: `${(wi % 2 === 0 ? -1 : 1) * (3 + (wi % 3))}deg` }}>
            {word}{" "}
          </span>
        ))}
      </p>
    );
  }

  return <p className={`per-line p-${world}`}>{text}</p>;
}
