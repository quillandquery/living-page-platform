import Link from "next/link";
import { Doodle } from "@/components/doodles/Doodle";
import { FormatShell, hashAt } from "@/components/living/formats/FormatShell";
import type { StoryViewData } from "@/components/living/StoryView";

/**
 * THE FORMAT LIBRARY — nine stages for the same story. Each supplies only a
 * header and (sometimes) a per-beat wrapper; FormatShell gives them the
 * palette, the veil and real animated Beats. First-pass drafts, meant to be
 * tuned by eye.
 */

const Back = () => <Link href="/wander" className="wander-back">back to wander</Link>;
const code = (seed: string, i: number) => `NO ${String(Math.floor(hashAt(`${seed}-${i}`) * 900 + 100))}`;

/** Story → author, in every format the reader might have switched to —
 *  not just the standard/scrapbook views. Same relationship, same
 *  target (`/@handle`), just dressed to match each stage. */
const FormatByline = ({ author }: Pick<StoryViewData, "author">) =>
  author ? (
    <p className="byline">
      by <Link href={author.href ?? `/@${author.handle}`}>{author.display_name || `@${author.handle}`}</Link>
    </p>
  ) : null;

/* ── LETTER — correspondence: intimate column, dateline, a sign-off ── */
export function LetterView(p: StoryViewData) {
  return (
    <FormatShell variant="letter" accent={p.accent} artDirection={p.artDirection} seed={p.seed} blocks={p.blocks} veil={p.veil} scoped={p.scoped}
      header={p.chrome ? (
        <header className="lt-head">
          <Back />
          <div className="lt-meta"><span className="lt-place">{p.place}</span>{p.date ? <span className="lt-date">{p.date}</span> : null}</div>
          {p.fragment ? <h1 className="lt-frag">{p.fragment}</h1> : null}
          <p className="lt-open">Dear —</p>
        </header>
      ) : null}
      footer={p.chrome ? (
        <footer className="lt-foot">
          <p className="lt-sign">
            — {p.author ? <Link href={p.author.href ?? `/@${p.author.handle}`}>@{p.author.handle}</Link> : "me"}
          </p>
        </footer>
      ) : null}
    />
  );
}

/* ── POSTER — one enormous line, a few loud panels ── */
export function PosterView(p: StoryViewData) {
  return (
    <FormatShell variant="poster" accent={p.accent} artDirection={p.artDirection} seed={p.seed} blocks={p.blocks} veil={p.veil} scoped={p.scoped}
      header={p.chrome ? (
        <header className="ps-head">
          <Back />
          <p className="ps-kicker">{p.place}</p>
          {p.fragment ? <h1 className="ps-hero">{p.fragment}</h1> : null}
          <FormatByline author={p.author} />
        </header>
      ) : null}
    />
  );
}

/* ── BOARDING PASS — travel-native: each beat a perforated stub ── */
export function TicketView(p: StoryViewData) {
  return (
    <FormatShell variant="ticket" accent={p.accent} artDirection={p.artDirection} seed={p.seed} blocks={p.blocks} veil={p.veil} scoped={p.scoped}
      header={p.chrome ? (
        <header className="tk-head">
          <Back /><span className="tk-dest">{p.place}</span><span className="tk-tag">boarding pass</span>
          {p.fragment ? <h1 className="tk-frag">{p.fragment}</h1> : null}
          <FormatByline author={p.author} />
        </header>
      ) : null}
      wrap={(beat, _info, i) => (
        <div className="tk-stub"><span className="tk-code">{code(String(p.seed), i)}</span><div className="tk-body">{beat}</div></div>
      )}
    />
  );
}

/* ── FIELD NOTES — graph paper, numbered entries, margin sketches ── */
export function NotebookView(p: StoryViewData) {
  return (
    <FormatShell variant="notebook" accent={p.accent} artDirection={p.artDirection} seed={p.seed} blocks={p.blocks} veil={p.veil} scoped={p.scoped}
      header={p.chrome ? (
        <header className="nb-head">
          <Back /><p className="nb-title">{p.place}</p>{p.date ? <span className="nb-date">{p.date}</span> : null}
          {p.fragment ? <h1 className="nb-frag">{p.fragment}</h1> : null}
          <FormatByline author={p.author} />
        </header>
      ) : null}
      wrap={(beat, info, i) => (
        <div className="nb-entry">
          <span className="nb-num">{String(i + 1).padStart(2, "0")}</span>
          <div className="nb-body">{beat}</div>
          {info.doodle ? <span className="nb-sketch"><Doodle name={info.doodle} seed={i * 41 + 7} treatment="line" size={44} ink="var(--accent)" /></span> : null}
        </div>
      )}
    />
  );
}

/* ── GALLERY — each beat a captioned plate on a wall ── */
export function GalleryView(p: StoryViewData) {
  return (
    <FormatShell variant="gallery" accent={p.accent} artDirection={p.artDirection} seed={p.seed} blocks={p.blocks} veil={p.veil} scoped={p.scoped}
      header={p.chrome ? (
        <header className="gl-head">
          <Back /><p className="gl-title">{p.place}</p>{p.fragment ? <h1 className="gl-sub">{p.fragment}</h1> : null}
          <FormatByline author={p.author} />
        </header>
      ) : null}
      wrap={(beat, info, i) => (
        <figure className="gl-plate">
          <span className="gl-frame"><Doodle name={info.doodle ?? "spiral"} seed={i * 41 + 7} treatment="filled" size={120} ink="var(--accent)" /></span>
          <figcaption><span className="gl-label">PLATE {String(i + 1).padStart(2, "0")}</span>{beat}</figcaption>
        </figure>
      )}
    />
  );
}

/* ── FILM — letterboxed dark, subtitle lines, a title card ── */
export function FilmView(p: StoryViewData) {
  return (
    <FormatShell variant="film" accent={p.accent} artDirection={p.artDirection} seed={p.seed} blocks={p.blocks} veil={p.veil} scoped={p.scoped}
      header={p.chrome ? (
        <header className="fl-head">
          <Back /><p className="fl-title">{p.place}</p>{p.fragment ? <h1 className="fl-sub">{p.fragment}</h1> : null}
          <FormatByline author={p.author} />
        </header>
      ) : null}
    />
  );
}

/* ── CUT-UP — ransom-note absurdist: the story escapes the grid ── */
export function RansomView(p: StoryViewData) {
  return (
    <FormatShell variant="ransom" accent={p.accent} artDirection={p.artDirection} seed={p.seed} blocks={p.blocks} veil={p.veil} scoped={p.scoped}
      header={p.chrome ? (
        <header className="rn-head">
          <Back /><p className="rn-title">{p.place}</p>{p.fragment ? <h1 className="rn-frag">{p.fragment}</h1> : null}
          <FormatByline author={p.author} />
        </header>
      ) : null}
    />
  );
}

/* ── MARQUEE — a lit sign at night, each line glowing ── */
export function MarqueeView(p: StoryViewData) {
  return (
    <FormatShell variant="marquee" accent={p.accent} artDirection={p.artDirection} seed={p.seed} blocks={p.blocks} veil={p.veil} scoped={p.scoped}
      header={p.chrome ? (
        <header className="mq-head">
          <Back /><p className="mq-title">{p.place}</p>{p.fragment ? <h1 className="mq-frag">{p.fragment}</h1> : null}
          <FormatByline author={p.author} />
        </header>
      ) : null}
    />
  );
}

/* ── POSTCARD — a stamped card, the message written across it ── */
export function PostcardView(p: StoryViewData) {
  return (
    <FormatShell variant="postcard-card" accent={p.accent} artDirection={p.artDirection} seed={p.seed} blocks={p.blocks} veil={p.veil} scoped={p.scoped}
      header={p.chrome ? (
        <header className="pc-head">
          <Back />
          <span className="pc-stamp"><Doodle name={p.artDirection && "signature" in p.artDirection ? (p.artDirection.signature?.doodle ?? "spiral") : "spiral"} seed={19} size={36} ink="var(--accent)" /></span>
          <span className="pc-dest">{p.place}{p.date ? ` · ${p.date}` : ""}</span>
          {p.fragment ? <h1 className="pc-frag">{p.fragment}</h1> : null}
          <FormatByline author={p.author} />
        </header>
      ) : null}
    />
  );
}
