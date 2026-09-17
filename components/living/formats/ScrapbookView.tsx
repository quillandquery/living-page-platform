import Link from "next/link";
import { Doodle } from "@/components/doodles/Doodle";
import { worldVars } from "@/lib/backdrops";
import { isCompleteArtDirection } from "@/lib/art-direction/types";
import type { StoryViewData } from "@/components/living/StoryView";
import type { Block } from "@/lib/story-blocks.mjs";

/**
 * SCRAPBOOK FORMAT.
 *
 * The same story, but not read down a column — pinned to a board. Each beat
 * becomes a torn-paper card at its own slight angle, a strip of tape at the
 * corner; doodles the story named become stickers and polaroids; the place is
 * a rubber stamp. Nothing scrolls in a straight line — you sift.
 *
 * It consumes the identical block data the standard reader does, so a reader
 * flipping "Read as — Scrapbook" sees THIS story, rearranged, not a new one.
 */

const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

type Card = { text: string; doodle?: string; kind: "note" | "polaroid" };

function toCards(blocks: Block[]): Card[] {
  const cards: Card[] = [];
  for (const b of blocks) {
    if (b.kind === "beat") {
      const text = (b.text ?? "").trim();
      if (!text) continue;
      const short = text.length <= 46;
      cards.push({ text, doodle: b.doodle, kind: b.doodle && short ? "polaroid" : "note" });
    } else if (b.kind === "raw" && !b.text.trim().startsWith("<")) {
      const text = strip(b.text);
      if (text && text !== "---") cards.push({ text, kind: "note" });
    }
  }
  return cards;
}

/** deterministic per-card jitter so the board is the same on every visit */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

export function ScrapbookView({
  place, date, fragment, accent, backdrop, blocks, author, chrome = true, seed = "preview", artDirection,
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

      <div className="sb-scatter">
        {cards.map((c, i) => {
          const r = (hash(`${seed}-r-${i}`) - 0.5) * 7;          // ±3.5deg
          const style = { ["--r" as string]: `${r.toFixed(2)}deg`, ["--i" as string]: i } as React.CSSProperties;
          if (c.kind === "polaroid" && c.doodle) {
            return (
              <figure className="sb-card sb-polaroid" style={style} key={i}>
                <span className="sb-tape" />
                <span className="sb-photo"><Doodle name={c.doodle} seed={i * 41 + 7} treatment="filled" size={128} ink="var(--accent)" /></span>
                <figcaption>{c.text}</figcaption>
              </figure>
            );
          }
          return (
            <div className={`sb-card sb-note ${i % 5 === 0 ? "sb-wide" : ""}`} style={style} key={i}>
              <span className="sb-tape" />
              {c.doodle ? <span className="sb-sticker"><Doodle name={c.doodle} seed={i * 41 + 7} treatment="line" size={54} ink="var(--accent)" /></span> : null}
              <p>{c.text}</p>
            </div>
          );
        })}
      </div>

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
