import Link from "next/link";
import { Doodle } from "@/components/doodles/Doodle";
import { FormatShell, groupsFrom, isListOpener, isCoda } from "@/components/living/formats/FormatShell";
import type { StoryViewData } from "@/components/living/StoryView";

/**
 * THE LIST — a bright countdown of small things.
 *
 * None of the other ten formats fit a list-piece: a credo, a set of tips, a
 * "things I've learned". They read down a single column and the enumeration
 * — the whole shape of the writing — vanishes. This one leans into it: each
 * item is a big numbered entry with its headline pulled large, the elaboration
 * beneath it, and a spark in the margin. The lead-in line sits above the count
 * unnumbered; a closing "say to yourself …" mantra lands as a stamp, not item
 * N+1. It stays a Living Page — real veiled Beats, the story's own palette —
 * it just knows it's a list. Fun is the point.
 */
export function ListicleView(p: StoryViewData) {
  const groups = groupsFrom(p.blocks);
  const hasLede = groups.length > 0 && !isListOpener(groups[0][0].text) && !isCoda(groups[0][0].text);

  return (
    <FormatShell
      variant="listicle"
      accent={p.accent}
      artDirection={p.artDirection}
      seed={p.seed}
      blocks={p.blocks}
      veil={p.veil}
      scoped={p.scoped}
      header={p.chrome ? (
        <header className="lk-head">
          <Link href="/wander" className="wander-back">back to wander</Link>
          <p className="lk-kicker">{p.place || "a little list"}</p>
          {p.fragment ? <h1 className="lk-frag">{p.fragment}</h1> : null}
          {p.author ? (
            <p className="byline">by <Link href={p.author.href ?? `/@${p.author.handle}`}>{p.author.display_name || `@${p.author.handle}`}</Link></p>
          ) : null}
        </header>
      ) : null}
      renderGroup={(kids, { beats, index }) => {
        const first = beats[0]?.text ?? "";
        const coda = isCoda(first);
        const lede = index === 0 && hasLede;
        const arr = Array.isArray(kids) ? kids : [kids];

        if (coda) {
          return (
            <div className="lk-coda">
              <span className="lk-coda-star"><Doodle name="star" seed={index * 31 + 5} treatment="filled" size={40} ink="var(--accent)" /></span>
              <div className="lk-coda-line">{arr}</div>
            </div>
          );
        }
        if (lede) {
          return <p className="lk-lede">{arr}</p>;
        }

        const num = hasLede ? index : index + 1;
        return (
          <div className="lk-item">
            <span className="lk-num" aria-hidden="true">{String(num).padStart(2, "0")}</span>
            <div className="lk-body">
              <div className="lk-headline">{arr[0]}</div>
              {arr.length > 1 ? <div className="lk-rest">{arr.slice(1)}</div> : null}
            </div>
            <span className="lk-mark"><Doodle name="star" seed={num * 41 + 7} treatment="line" size={38} ink="var(--accent)" /></span>
          </div>
        );
      }}
    />
  );
}

export default ListicleView;
