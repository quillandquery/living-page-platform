import Link from "next/link";
import { FormatShell } from "@/components/living/formats/FormatShell";
import type { StoryViewData } from "@/components/living/StoryView";

/**
 * THE CRAWL — a long time ago, in a galaxy far, far away.
 *
 * The opening-crawl format: the story recedes into a starfield in perspective,
 * each line rising away as the reader scrolls. It stays a Living Page — real
 * veiled Beats, the world's own palette (the `space` world's black + a star's
 * yellow) — it just tilts into the distance. Scroll drives the recession, so
 * it never fights the veil.
 */
export function CrawlView(p: StoryViewData) {
  return (
    <FormatShell
      variant="crawl"
      accent={p.accent}
      artDirection={p.artDirection}
      seed={p.seed}
      blocks={p.blocks}
      veil={p.veil}
      scoped={p.scoped}
      header={p.chrome ? (
        <header className="cr-head">
          <Link href="/wander" className="wander-back">back to wander</Link>
          {p.fragment ? <p className="cr-open">{p.fragment}</p> : <p className="cr-open">A long time ago…</p>}
          {p.place ? <h1 className="cr-title">{p.place}</h1> : null}
          {p.author ? (
            <p className="byline">by <Link href={p.author.href ?? `/@${p.author.handle}`}>{p.author.display_name || `@${p.author.handle}`}</Link></p>
          ) : null}
        </header>
      ) : null}
      wrap={(beat) => <div className="cr-line">{beat}</div>}
    />
  );
}

export default CrawlView;
