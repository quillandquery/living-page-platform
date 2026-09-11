import React from "react";
import { Beat } from "./Beat";
import { Hold, StoryH2, Margin } from "./Scene";
import type { Block } from "@/lib/story-blocks.mjs";
import type { Body, Gesture, Move, Voice } from "@/lib/vocabulary";

/**
 * RUNTIME RENDERING.
 *
 * The old reader compiled an .mdx file through the bundler and rendered the
 * resulting component. A platform can't do that — a story is written after
 * the build, by someone else — so the reader renders the story's Block[] at
 * request time instead. The blocks are the same grammar the studio emits
 * (lib/story-blocks.mjs), so the writing behaves exactly as it did on the
 * file-based site: a beat is a beat, a hold is a silence.
 *
 * Auto-annotated stories are only ever `beat` and `hold`. The `raw` branch
 * exists for pieces a writer has hand-tuned into structure the block editor
 * doesn't model — a scene mark, a margin doodle, a voiced line with an inline
 * mark. It renders those best-effort and, above all, never throws: a reader
 * must never hit a blank page because one line was shaped oddly.
 */

const VOICES = new Set<Voice>(["speak", "whisper", "shout", "thought", "drift", "echo", "listen", "ledger"]);

const attr = (attrs: string, name: string): string | undefined => {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : undefined;
};
const numAttr = (attrs: string, name: string): number | undefined => {
  const m = new RegExp(`\\b${name}=\\{\\s*(-?\\d+(?:\\.\\d+)?)\\s*\\}`).exec(attrs);
  return m ? Number(m[1]) : undefined;
};
const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const VOICE_RE = /^<(Speak|Whisper|Shout|Thought|Drift|Echo|Listen|Ledger)\b([^>]*)>([\s\S]*)<\/\1>$/;
const MARGIN_RE = /^<Margin\b([^>]*)\/>$/;
const PRESS_RE = /^<Press\b[^>]*>([\s\S]*)<\/Press>$/;

/** One hand-tuned raw block, interpreted as leniently as possible. */
function renderRaw(text: string, key: number): React.ReactNode {
  const t = text.trim();

  // a scene fence or any other opaque wrapper — nothing to draw
  if (/^<\/?Scene\b/.test(t) || t === "") return null;
  // horizontal rule was a two-beat silence on the file site
  if (t === "---") return <Hold key={key} beats={2} />;
  // a scene mark
  if (/^#{1,6}\s/.test(t)) return <StoryH2 key={key}>{t.replace(/^#{1,6}\s/, "")}</StoryH2>;

  const margin = MARGIN_RE.exec(t);
  if (margin) {
    const a = margin[1];
    return (
      <Margin
        key={key}
        doodle={attr(a, "doodle") ?? "spiral"}
        side={attr(a, "side") === "left" ? "left" : "right"}
        gesture={attr(a, "gesture") as Gesture | undefined}
        becomes={attr(a, "becomes")}
      />
    );
  }

  const press = PRESS_RE.exec(t);
  const inner = press ? press[1].trim() : t;

  const voiced = VOICE_RE.exec(inner);
  if (voiced) {
    const [, tag, attrs, body] = voiced;
    return (
      <Beat
        key={key}
        voice={tag.toLowerCase() as Voice}
        body={attr(attrs, "body") as Body | undefined}
        gesture={attr(attrs, "gesture") as Gesture | undefined}
        doodle={attr(attrs, "doodle")}
        becomes={attr(attrs, "becomes")}
        side={attr(attrs, "side") === "left" ? "left" : "right"}
        seed={key * 7 + 3}
      >
        {stripTags(body)}
      </Beat>
    );
  }

  // a bare line carrying an inline mark, or anything else with words in it
  const words = stripTags(t);
  return words ? <Beat key={key} voice="speak" seed={key * 7 + 3}>{words}</Beat> : null;
}

function MediaFigure({ block }: { block: Extract<Block, { kind: "media" }> }) {
  return (
    <div className="beat media-beat">
      <figure className="media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.src} alt={block.alt} loading="lazy" />
        <figcaption>
          <a href={block.link} target="_blank" rel="noreferrer noopener">{block.credit}</a>
        </figcaption>
      </figure>
    </div>
  );
}

export function StoryRender({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === "hold") return <Hold key={i} beats={b.beats} />;
        if (b.kind === "raw") return <React.Fragment key={i}>{renderRaw(b.text, i)}</React.Fragment>;
        if (b.kind === "media") return null; // AI imagery disabled — pending a curated approach
        // a beat
        const voice = VOICES.has(b.voice as Voice) ? (b.voice as Voice) : "speak";
        return (
          <Beat
            key={i}
            voice={voice}
            body={b.body as Body | undefined}
            gesture={b.gesture as Gesture | undefined}
            move={b.move as Move | undefined}
            doodle={b.doodle}
            becomes={b.becomes}
            ink={b.ink}
            side={b.side === "left" ? "left" : "right"}
            seed={i * 7 + 3}
          >
            {b.text}
          </Beat>
        );
      })}
    </>
  );
}

export default StoryRender;
