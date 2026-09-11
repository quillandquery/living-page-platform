import Link from "next/link";
import { StoryFrame } from "./StoryFrame";
import { StoryRender } from "./StoryRender";
import { Backdrop } from "./Backdrop";
import { Doodle } from "@/components/doodles/Doodle";
import { getBackdrop, worldVars } from "@/lib/backdrops";
import type { Block } from "@/lib/story-blocks.mjs";

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
  author?: { handle: string; display_name: string } | null;
  /** the studio preview turns the frontispiece and chrome off */
  chrome?: boolean;
  seed?: string;
};

export function StoryView({
  place, date, fragment, accent, backdrop, veil = true, blocks, author, chrome = true, seed = "preview",
}: StoryViewData) {
  const safeAccent = /^#[0-9a-fA-F]{3,8}$/.test(accent) ? accent : "#2B3ED0";
  const world = getBackdrop(backdrop ?? undefined);
  const vars = worldVars(world, safeAccent);

  return (
    <main className="frame story-reading">
      <style>{`:root{${vars}}`}</style>
      <Backdrop name={backdrop ?? undefined} seed={seed} />

      {chrome ? (
        <header className="frontispiece">
          <Link href="/" className="back">back</Link>
          <p className="place">{place}</p>
          <p className="stamp">{date}</p>
          {author ? (
            <p className="byline">
              by <Link href={`/@${author.handle}`}>{author.display_name || `@${author.handle}`}</Link>
            </p>
          ) : null}
        </header>
      ) : null}

      <StoryFrame veil={veil} accent={safeAccent}>
        <StoryRender blocks={blocks} />
      </StoryFrame>

      {chrome ? (
        <footer className="colophon">
          <span className="stamp">
            {place} · {date}
            {author ? <> · <Link href={`/@${author.handle}`} className="back">@{author.handle}</Link></> : null}
          </span>
          <span className="colophon-doodle"><Doodle name="spiral" seed={19} size={54} ink="var(--rule)" /></span>
          <Link href="/" className="back">the rest of them</Link>
        </footer>
      ) : null}
    </main>
  );
}

export default StoryView;
