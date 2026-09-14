import Link from "next/link";
import { StoryFrame } from "./StoryFrame";
import { StoryRender } from "./StoryRender";
import { Backdrop } from "./Backdrop";
import { Artwork } from "./Artwork";
import { Signature } from "./Signature";
import { Doodle } from "@/components/doodles/Doodle";
import { getBackdrop, worldVars } from "@/lib/backdrops";
import type { Block } from "@/lib/story-blocks.mjs";
import type { StoryArtDirection } from "@/lib/art-direction/types";
import { isCompleteArtDirection } from "@/lib/art-direction/types";

/**
 * THE READING SHELL.
 *
 * Everything the file-based story page did — the ground painted from the
 * story's colour, the world that overrides the reader's theme, the
 * frontispiece it opens on, the veil — lives here now, given a story's data
 * rather than a compiled component. The reader page and the studio preview
 * both render through this, so what a writer sees while writing is the page a
 * reader gets.
 */

export type StoryViewData = {
  place: string;
  date: string;
  fragment: string;
  accent: string;
  backdrop?: string | null;
  veil?: boolean;
  blocks: Block[];
  /** shown as a byline when a story is read on the platform */
  author?: { handle: string; display_name: string; href?: string } | null;
  /** the studio preview turns the frontispiece and chrome off */
  chrome?: boolean;
  seed?: string;
  /** Story Visual System 2.0 — absent or `{}` for a row saved before it
   *  existed; the shell then renders exactly as it always has. */
  artDirection?: Partial<StoryArtDirection> | null;
  /** the rabbit hole at the end of the piece — omitted in the studio preview */
  more?: {
    same: { handle: string; slug: string; place: string; theme?: string | null; href?: string } | null;
    surprise: { handle: string; slug: string; place: string; href?: string } | null;
  };
};

export function StoryView({
  place, date, fragment, accent, backdrop, veil = true, blocks, author, chrome = true, seed = "preview", more,
  artDirection,
}: StoryViewData) {
  const safeAccent = /^#[0-9a-fA-F]{3,8}$/.test(accent) ? accent : "#2B3ED0";
  const world = getBackdrop(backdrop ?? undefined);
  const vars = worldVars(world, safeAccent);

  const ad = isCompleteArtDirection(artDirection) ? artDirection : null;
  const shellClass = [
    "frame", "story-reading",
    ad ? `material-${ad.material.key}` : "",
    ad ? `comp-${ad.composition.key}` : "",
    ad?.typography.handwrittenBias ? "typo-handwritten" : "",
    ad?.typography.framed ? "typo-framed" : "",
    ad && ad.typography.rotateBias ? "typo-rotate" : "",
  ].filter(Boolean).join(" ");
  const materialVars = ad ? `--material-grain:${ad.material.grain};--material-contrast:${ad.material.contrast};--art-rotate:${ad.typography.rotateBias}deg;` : "";

  return (
    <main className={shellClass}>
      <style>{`:root{${vars};${materialVars}}`}</style>
      <Backdrop name={ad?.environment.key ?? (backdrop ?? undefined)} seed={seed} ambient={ad?.ambientMotion} />
      {ad ? <div className="material-layer" /> : null}
      {ad ? <Artwork pieces={ad.artwork} seed={seed} /> : null}
      {ad ? <Signature signature={ad.signature} seed={world?.scheme === "dark" ? 11 : 5} treatment={ad.artStyle.artworkTreatment} side={ad.composition.key === "postcard" ? "left" : "right"} /> : null}

      {chrome ? (
        <header className="frontispiece">
          <Link href="/" className="back">back</Link>
          <p className="place">{place}</p>
          <p className="stamp">{date}</p>
          {author ? (
            <p className="byline">
              by <Link href={author.href ?? `/@${author.handle}`}>{author.display_name || `@${author.handle}`}</Link>
            </p>
          ) : null}
        </header>
      ) : null}

      <StoryFrame veil={veil} accent={safeAccent}>
        <StoryRender blocks={blocks} />
      </StoryFrame>

      {chrome && more && (more.same || more.surprise) ? (
        <section className="keep-going">
          <p className="keep-going-h">Keep going.</p>
          <div className="keep-going-links">
            {more.same ? (
              <Link href={more.same.href ?? `/@${more.same.handle}/${more.same.slug}`} className="keep-going-link">
                {more.same.theme ? <>You may also fall into: {more.same.theme}</> : "Same feeling"} → <span className="keep-going-place">{more.same.place}</span>
              </Link>
            ) : null}
            {more.surprise ? (
              <Link href={more.surprise.href ?? `/@${more.surprise.handle}/${more.surprise.slug}`} className="keep-going-link">
                Surprise me → <span className="keep-going-place">{more.surprise.place}</span>
              </Link>
            ) : null}
            <Link href="/wander" className="keep-going-link">Back to Wander →</Link>
          </div>
        </section>
      ) : null}

      {chrome ? (
        <footer className="colophon">
          <span className="stamp">
            {place} · {date}
            {author ? <> · <Link href={author.href ?? `/@${author.handle}`} className="back">@{author.handle}</Link></> : null}
          </span>
          <span className="colophon-doodle"><Doodle name="spiral" seed={19} size={54} ink="var(--rule)" /></span>
          <Link href="/" className="back">the rest of them</Link>
        </footer>
      ) : null}
    </main>
  );
}

export default StoryView;
