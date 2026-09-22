import Link from "next/link";
import { StoryFrame } from "./StoryFrame";
import { StoryRender } from "./StoryRender";
import { Backdrop } from "./Backdrop";
import { Artwork } from "./Artwork";
import { Signature } from "./Signature";
import { ShareControls, type ShareControlsProps } from "./ShareControls";
import { RemindedOf } from "./RemindedOf";
import { Doodle } from "@/components/doodles/Doodle";
import { getBackdrop, worldVars } from "@/lib/backdrops";
import { paletteStyle } from "@/lib/palette-style";
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
  /** scope the palette to this element (for many previews on one screen) */
  scoped?: boolean;
  seed?: string;
  /** Story Visual System 2.0 — absent or `{}` for a row saved before it
   *  existed; the shell then renders exactly as it always has. */
  artDirection?: Partial<StoryArtDirection> | null;
  /** share prop bundle from `lib/share.ts`, present only on the public reader
   *  (Module 4 PARTS 14-33) — the studio preview stays share-less. */
  share?: ShareControlsProps | null;
  /** the rabbit hole at the end of the piece — omitted in the studio preview */
  more?: {
    same: { handle: string; slug: string; place: string; theme?: string | null; href?: string; fragment?: string | null; accent?: string | null; backdrop?: string | null } | null;
    surprise: { handle: string; slug: string; place: string; href?: string; fragment?: string | null; accent?: string | null; backdrop?: string | null } | null;
  };
};

export function StoryView({
  place, date, fragment, accent, backdrop, veil = true, blocks, author, chrome = true, seed = "preview", more,
  artDirection, scoped = false, share,
}: StoryViewData) {
  const safeAccent = /^#[0-9a-fA-F]{3,8}$/.test(accent) ? accent : "#2B3ED0";
  const world = getBackdrop(backdrop ?? undefined);
  const ad0 = isCompleteArtDirection(artDirection) ? artDirection : null;
  const vars = ad0?.palette?.vars ?? worldVars(world, safeAccent);

  const ad = ad0;
  const shellClass = [
    "frame", "story-reading",
    ad ? `material-${ad.material.key}` : "",
    ad ? `comp-${ad.composition.key}` : "",
    ad?.typography.handwrittenBias ? "typo-handwritten" : "",
    ad?.typography.framed ? "typo-framed" : "",
    ad && ad.typography.rotateBias ? "typo-rotate" : "",
    ad?.look ? `look-${ad.look}` : "",
    ad?.palette ? `palette-${ad.palette.key}` : "",
    ad?.palette ? `scheme-${ad.palette.scheme}` : "",
  ].filter(Boolean).join(" ");
  const materialVars = ad ? `--material-grain:${ad.material.grain};--material-contrast:${ad.material.contrast};--art-rotate:${ad.typography.rotateBias}deg;` : "";

  return (
    <main className={shellClass} style={scoped ? paletteStyle(`${vars};${materialVars}`) : undefined}>
      {scoped ? null : <style>{`:root{${vars};${materialVars}}`}</style>}
      <Backdrop name={ad?.environment.key ?? (backdrop ?? undefined)} seed={seed} ambient={ad?.ambientMotion} scheme={ad?.palette?.scheme} />
      {ad ? <div className="material-layer" /> : null}
      {ad ? <Artwork pieces={ad.artwork} seed={seed} /> : null}
      {ad ? <Signature signature={ad.signature} seed={world?.scheme === "dark" ? 11 : 5} treatment={ad.artStyle.artworkTreatment} side={ad.composition.key === "postcard" ? "left" : "right"} /> : null}

      {chrome ? (
        <header className="frontispiece">
          <Link href="/" className="back">back</Link>
          <p className="place">{place}</p>
          {/* THE STORY HERO (Module 4) — the writer's own hook line. Used
              to open as its own big beat below the frontispiece; folded in
              here instead, as one more small-caps tag alongside place/date/
              author, so it reads as part of the byline row rather than a
              second title competing with `place`. */}
          {fragment ? <h1 className="hero-tag">{fragment.trim()}</h1> : null}
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

      {/* READ NEXT EXPERIMENT 1 — "this reminded me of…"
         Replaces the three-link "Keep going" strip with a single
         associative link out. To roll back, restore the original block
         from git history and drop the RemindedOf import + component. */}
      {chrome && more ? (
        <RemindedOf same={more.same ?? null} surprise={more.surprise ?? null} />
      ) : null}

      {chrome ? (
        <footer className="colophon">
          <span className="stamp">
            {place} · {date}
            {author ? <> · <Link href={author.href ?? `/@${author.handle}`} className="back">@{author.handle}</Link></> : null}
          </span>
          <span className="colophon-doodle"><Doodle name={ad?.signature.doodle ?? "spiral"} seed={19} size={54} ink="var(--rule)" /></span>
          {share ? <ShareControls {...share} /> : null}
          <Link href="/" className="back">the rest of them</Link>
        </footer>
      ) : null}
    </main>
  );
}

export default StoryView;
