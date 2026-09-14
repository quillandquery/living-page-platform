import type { CSSProperties } from "react";
import Link from "next/link";
import { Beat } from "@/components/living/Beat";
import { Doodle } from "@/components/doodles/Doodle";
import type { StorySeed as Seed } from "@/lib/discover";

/**
 * A STORY SEED — the fundamental unit of Wander. Not a card: which of the
 * seven forms below a story gets, how big it sits, and what it shows is a
 * consequence of what's actually in that story (its dominant voice, its
 * world's energy, the doodle it actually uses), not a fixed template.
 *
 * Every form still renders through <Beat> for its hook text, so the same
 * voice → typography treatment and word-arrival animation the real reader
 * uses is what's driving Wander too — this is meant to already feel like a
 * Living Page, not a preview of one.
 */

const SPAN: Record<Seed["form"], { col: number; row: number }> = {
  "floating-thought": { col: 3, row: 1 },
  "giant-word": { col: 4, row: 1 },
  "paper-scrap": { col: 3, row: 1 },
  "postcard": { col: 4, row: 2 },
  "micro-scene": { col: 4, row: 2 },
  "typographic": { col: 5, row: 2 },
  "collage": { col: 5, row: 3 },
};

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Split a hook into two fragments for the typographic-collage form —
 * at the first sentence break if there is one, else roughly in half. */
function splitHook(hook: string): [string, string] {
  const m = /^(.*?[.!?…])\s+(.*)$/.exec(hook.trim());
  if (m && m[2]) return [m[1], m[2]];
  const words = hook.trim().split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export function StorySeed({ seed, index, hidden, spotlit }: { seed: Seed; index: number; hidden?: boolean; spotlit?: boolean }) {
  const span = SPAN[seed.form];
  const h = hash(seed.id);
  const rot = ((h % 700) / 100 - 3.5) * (seed.form === "floating-thought" || seed.form === "giant-word" ? 0.4 : 1);
  const drift = (h >> 8) % 100;

  const style: CSSProperties & Record<string, string | number> = {
    gridColumn: `span ${span.col}`,
    gridRow: `span ${span.row}`,
    ["--rot"]: `${rot.toFixed(1)}deg`,
    ["--drift"]: drift,
    ["--accent"]: seed.accent,
  };

  return (
    <>
      {/* every seed gets its own accent-derived colours (ink/counter/mute),
          scoped locally — mid/burst tiers additionally get the wash
          background via .tier-mid/.tier-burst::before in globals.css */}
      <style>{`.seed-${seed.id}{${seed.worldCss}}`}</style>
      <Link
        href={`/@${seed.handle}/${seed.slug}`}
        data-seed-link
        data-id={seed.id}
        data-form={seed.form}
        data-tier={seed.tier}
        className={`seed seed-${seed.form} tier-${seed.tier} seed-${seed.id}${hidden ? " seed-hidden" : ""}${spotlit ? " spotlit" : ""}`}
        style={style}
      >
        <SeedBody seed={seed} index={index} />
        <span className="seed-peek">
          <span className="seed-place">{seed.place}</span>
          <span className="seed-meta">{seed.authorName} · {seed.readLabel}</span>
          <span className="seed-cta">Read →</span>
        </span>
      </Link>
    </>
  );
}

function SeedBody({ seed, index }: { seed: Seed; index: number }) {
  switch (seed.form) {
    case "giant-word": {
      const rest = seed.hook.replace(new RegExp(seed.chargedWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "···");
      return (
        <div className="seed-inner seed-inner-giant">
          <p className="seed-charged">{seed.chargedWord}</p>
          <p className="seed-charged-rest">{rest}</p>
        </div>
      );
    }
    case "paper-scrap":
      return (
        <div className="seed-inner seed-inner-scrap">
          <span className="seed-scrap-stamp">{seed.place} · {seed.date}</span>
          <Beat voice={seed.dominantVoice === "speak" ? "thought" : seed.dominantVoice}>{seed.hook}</Beat>
        </div>
      );
    case "postcard":
      return (
        <div className="seed-inner seed-inner-postcard">
          <div className="seed-postcard-top">
            <span className="seed-postcard-place">{seed.place}</span>
            <span className="seed-postcard-stamp"><Doodle name={seed.doodle} seed={hash(seed.id)} size={40} ink="var(--accent)" /></span>
          </div>
          <Beat voice={seed.dominantVoice}>{seed.hook}</Beat>
          <span className="seed-postcard-date">{seed.date}</span>
        </div>
      );
    case "micro-scene":
      return (
        <div className="seed-inner seed-inner-scene">
          <div className="seed-scene-stage" aria-hidden="true">
            <span className="seed-scene-doodle a"><Doodle name={seed.doodle} seed={hash(seed.id)} size={56} ink="var(--accent)" /></span>
            {seed.secondDoodle ? (
              <span className="seed-scene-doodle b"><Doodle name={seed.secondDoodle} seed={hash(seed.id) + 3} size={40} ink="var(--accent)" /></span>
            ) : null}
          </div>
          <Beat voice={seed.dominantVoice}>{seed.hook}</Beat>
        </div>
      );
    case "typographic": {
      const [a, b] = splitHook(seed.hook);
      return (
        <div className="seed-inner seed-inner-typo">
          <Beat voice={seed.dominantVoice}>{a}</Beat>
          <Beat voice={seed.secondVoice ?? "whisper"} className="seed-typo-second">{b}</Beat>
        </div>
      );
    }
    case "collage":
      return (
        <div className="seed-inner seed-inner-collage">
          <span className="seed-collage-doodle a"><Doodle name={seed.doodle} seed={hash(seed.id)} size={48} ink="var(--accent)" /></span>
          {seed.secondDoodle ? (
            <span className="seed-collage-doodle b"><Doodle name={seed.secondDoodle} seed={hash(seed.id) + 9} size={36} ink="var(--accent2, var(--accent))" /></span>
          ) : null}
          <span className="seed-collage-stamp">{seed.place}</span>
          <Beat voice={seed.dominantVoice}>{seed.hook}</Beat>
          {seed.themes[0] ? <span className="seed-collage-theme">{seed.themes[0]}</span> : null}
        </div>
      );
    case "floating-thought":
    default:
      return (
        <div className="seed-inner seed-inner-float">
          <span className="seed-float-tag">{seed.place}</span>
          <Beat voice={seed.dominantVoice} doodle={seed.doodle} side={index % 2 ? "left" : "right"} seed={hash(seed.id)}>
            {seed.hook}
          </Beat>
        </div>
      );
  }
}

export default StorySeed;
