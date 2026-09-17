import Link from "next/link";
import { Beat } from "@/components/living/Beat";
import { StoryFrame } from "@/components/living/StoryFrame";
import { Doodle } from "@/components/doodles/Doodle";
import { worldVars } from "@/lib/backdrops";
import { isCompleteArtDirection } from "@/lib/art-direction/types";
import type { StoryViewData } from "@/components/living/StoryView";
import type { Block } from "@/lib/story-blocks.mjs";
import type { Body, Gesture, Move, Voice } from "@/lib/vocabulary";

/**
 * SCRAPBOOK FORMAT.
 *
 * The same story, pinned to a board instead of read down a column — BUT the
 * living core is untouched: every card holds a real <Beat>, so the words
 * still carry their voice, still move and scatter, and the whole board still
 * veils and reveals on scroll through <StoryFrame>. A format changes the
 * stage, never the behaviour. The card, the tape, the tilt, the stamp are
 * staging around beats that behave exactly as they do everywhere else.
 */

const VOICES = new Set<Voice>(["speak", "whisper", "shout", "thought", "drift", "echo", "listen", "ledger"]);
const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

type Card = { text: string; voice: Voice; body?: Body; move?: Move; gesture?: Gesture; doodle?: string };

function toCards(blocks: Block[]): Card[] {
  const cards: Card[] = [];
  for (const b of blocks) {
    if (b.kind === "beat" && (b.text ?? "").trim()) {
      cards.push({
        text: b.text.trim(),
        voice: VOICES.has(b.voice as Voice) ? (b.voice as Voice) : "speak",
        body: b.body as Body | undefined,
        move: b.move as Move | undefined,
        gesture: b.gesture as Gesture | undefined,
        doodle: b.doodle,
      });
    } else if (b.kind === "raw" && !b.text.trim().startsWith("<")) {
      const text = strip(b.text);
      if (text && text !== "---") cards.push({ text, voice: "speak" });
    }
  }
  return cards;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

export function ScrapbookView({
  place, date, fragment, accent, blocks, author, chrome = true, seed = "preview", artDirection,
}: StoryViewData) {
  const safeAccent = /^#[0-9a-fA-F]{3,8}$/.test(accent) ? accent : "#A66A3B";
  const ad = isCompleteArtDirection(artDirection) ? artDirection : null;
  const vars = ad?.palette?.vars ?? worldVars(null, safeAccent);
  const scheme = ad?.palette?.scheme ?? "light";
  const cards = toCards(blocks);

  return (
    <main className={`frame story-reading sb-board scheme-${scheme}`}>
      <style>{`:root{${vars}}`}</style>

      {chrome ? (
        <header className="sb-head">
          <Link href="/" className="back sb-back">back</Link>
          <h1 className="sb-title">{place}</h1>
          {fragment ? <p className="sb-frag">{fragment}</p> : null}
          <span className="sb-stamp" aria-hidden="true">
            <Doodle name={ad?.signature.doodle ?? "spiral"} seed={19} size={40} ink="var(--accent)" />
            <em>{date || place}</em>
          </span>
        </header>
      ) : null}

      <StoryFrame veil accent={safeAccent}>
        <div className="sb-scatter">
          {cards.map((c, i) => {
            const r = (hash(`${seed}-r-${i}`) - 0.5) * 6.5;
            const style = { ["--r" as string]: `${r.toFixed(2)}deg` } as React.CSSProperties;
            return (
              <div className="sb-card" style={style} key={i}>
                <span className="sb-tape" aria-hidden="true" />
                {c.doodle ? (
                  <span className="sb-sticker" aria-hidden="true">
                    <Doodle name={c.doodle} seed={i * 41 + 7} treatment="line" size={52} ink="var(--accent)" />
                  </span>
                ) : null}
                <Beat voice={c.voice} body={c.body} move={c.move} gesture={c.gesture} seed={i * 7 + 3}>
                  {c.text}
                </Beat>
              </div>
            );
          })}
        </div>
      </StoryFrame>

      {chrome ? (
        <footer className="sb-foot">
          <span className="sb-stamp small" aria-hidden="true"><em>{place}{date ? ` · ${date}` : ""}</em></span>
          {author ? <Link href={`/@${author.handle}`} className="back sb-back">@{author.handle}</Link> : null}
          <Link href="/" className="back sb-back">the rest of them</Link>
        </footer>
      ) : null}
    </main>
  );
}

export default ScrapbookView;
