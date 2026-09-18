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

const Back = () => <Link href="/" className="back">back</Link>;
const code = (seed: string, i: number) => `NO ${String(Math.floor(hashAt(`${seed}-${i}`) * 900 + 100))}`;

/* ── LETTER — correspondence: intimate column, dateline, a sign-off ── */
export function LetterView(p: StoryViewData) {
  return (
    <FormatShell variant="letter" accent={p.accent} artDirection={p.artDirection} seed={p.seed} blocks={p.blocks} veil={p.veil} scoped={p.scoped}
      header={p.chrome ? (
        <header className="lt-head">
          <Back />
          <div className="lt-meta"><span className="lt-place">{p.place}</span>{p.date ? <span className="lt-date">{p.date}</span> : null}</div>
          <p className="lt-open">Dear —</p>
        </header>
      ) : null}
      footer={p.chrome ? (
        <footer className="lt-foot"><p className="lt-sign">— {p.author ? `@${p.author.handle}` : "me"}</p></footer>
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
        <header className="tk-head"><Back /><span className="tk-dest">{p.place}</span><span className="tk-tag">boarding pass</span></header>
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
        <header className="nb-head"><Back /><h1 className="nb-title">{p.place}</h1>{p.date ? <span className="nb-date">{p.date}</span> : null}</header>
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
        <header className="gl-head"><Back /><h1 className="gl-title">{p.place}</h1>{p.fragment ? <p className="gl-sub">{p.fragment}</p> : null}</header>
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
        <header className="fl-head"><Back /><h1 className="fl-title">{p.place}</h1>{p.fragment ? <p className="fl-sub">{p.fragment}</p> : null}</header>
      ) : null}
    />
  );
}

/* ── CUT-UP — ransom-note absurdist: the story escapes the grid ── */
export function RansomView(p: StoryViewData) {
  return (
    <FormatShell variant="ransom" accent={p.accent} artDirection={p.artDirection} seed={p.seed} blocks={p.blocks} veil={p.veil} scoped={p.scoped}
      header={p.chrome ? (
        <header className="rn-head"><Back /><h1 className="rn-title">{p.place}</h1></header>
      ) : null}
    />
  );
}

/* ── MARQUEE — a lit sign at night, each line glowing ── */
export function MarqueeView(p: StoryViewData) {
  return (
    <FormatShell variant="marquee" accent={p.accent} artDirection={p.artDirection} seed={p.seed} blocks={p.blocks} veil={p.veil} scoped={p.scoped}
      header={p.chrome ? (
        <header className="mq-head"><Back /><h1 className="mq-title">{p.place}</h1></header>
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
        </header>
      ) : null}
    />
  );
}
