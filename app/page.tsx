"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/**
 * THE FRONT DOOR — the product's first demo (PRD v2 §5–6).
 * Bright, warm-paper, alive. It shows — not tells — that ordinary writing
 * becomes an extraordinary page. Self-contained (inline styles + a small
 * client animation) so it doesn't touch the reader/editor/engine.
 */

const HERO_LINES = [
  "I got to the beach just before sunset.",
  "The water was colder than I expected.",
  "I stayed anyway.",
];

const PERSONALITIES = [
  { label: "whispered", cls: "p-whisper" },
  { label: "shouted", cls: "p-shout" },
  { label: "handwritten", cls: "p-hand" },
  { label: "adrift", cls: "p-drift" },
  { label: "typed", cls: "p-type" },
];

const MODES = [
  { key: "story", label: "Something happened.", cta: "Start a story" },
  { key: "moment", label: "Something tiny you can't forget.", cta: "Capture a moment" },
  { key: "thought", label: "Something sitting in your head.", cta: "Put it somewhere" },
  { key: "freeform", label: "Don't know yet? That's fine.", cta: "Just start" },
];

const EXAMPLES = [
  { place: "GOKARNA", line: "The night bus, and the ten minutes after I got down.", accent: "#2D6BF0" },
  { place: "A KITCHEN, 2AM", line: "Everyone was asleep. I wasn't.", accent: "#F0492E" },
  { place: "THE 6:40 TRAIN", line: "I didn't expect to miss this place.", accent: "#1F9E5A" },
];

export default function Home() {
  const [phase, setPhase] = useState(0); // 0 raw → 1 transforming → 2 alive
  const [pIdx, setPIdx] = useState(0);

  useEffect(() => {
    const seq = [
      setTimeout(() => setPhase(1), 1100),
      setTimeout(() => setPhase(2), 2100),
    ];
    const loop = setInterval(() => {
      setPhase(0);
      setTimeout(() => setPhase(1), 1100);
      setTimeout(() => setPhase(2), 2100);
    }, 6500);
    return () => { seq.forEach(clearTimeout); clearInterval(loop); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPIdx((i) => (i + 1) % PERSONALITIES.length), 1600);
    return () => clearInterval(t);
  }, []);

  const p = PERSONALITIES[pIdx];
  const heroClass = useMemo(() => `hero-page ph-${phase}`, [phase]);

  return (
    <main className="lp">
      <style>{CSS}</style>

      <nav className="lp-nav">
        <span className="lp-logo">Living Page</span>
        <span className="lp-nav-r">
          <Link href="/explore">Explore stories</Link>
          <Link href="/login">Sign in</Link>
        </span>
      </nav>

      {/* ── hero ── */}
      <header className="lp-hero">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow">A new way to tell a story</p>
          <h1 className="lp-h1">You have a story.<br /><span className="lp-h1-2">It shouldn&rsquo;t look like a blog post.</span></h1>
          <p className="lp-sub">Write it normally. We&rsquo;ll make it come alive.</p>
          <div className="lp-cta-row">
            <Link href="/make" className="lp-btn lp-btn-primary">Make something</Link>
            <Link href="/explore" className="lp-btn lp-btn-ghost">Explore stories</Link>
          </div>
        </div>

        <div className={heroClass} aria-hidden="true">
          <span className="hero-doodle" />
          {HERO_LINES.map((l, i) => (
            <p key={i} className={`hero-line hl-${i}`}>{l}</p>
          ))}
        </div>
      </header>

      {/* ── one sentence, many personalities ── */}
      <section className="lp-sec">
        <h2 className="lp-sec-h">One sentence. Many personalities.</h2>
        <div className="lp-personality">
          <span className={`per-line ${p.cls}`}>I didn&rsquo;t expect to miss this place.</span>
          <span className="per-tag">{p.label}</span>
        </div>
      </section>

      {/* ── the four modes ── */}
      <section className="lp-sec">
        <h2 className="lp-sec-h">You don&rsquo;t have to write a whole thing.</h2>
        <div className="lp-modes">
          {MODES.map((m) => (
            <Link key={m.key} href="/make" className="lp-mode">
              <span className="lp-mode-label">{m.label}</span>
              <span className="lp-mode-cta">{m.cta} →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── read something ── */}
      <section className="lp-sec">
        <h2 className="lp-sec-h">Or just read something.</h2>
        <div className="lp-examples">
          {EXAMPLES.map((e) => (
            <Link key={e.place} href="/explore" className="lp-example" style={{ ["--a" as string]: e.accent }}>
              <span className="ex-place">{e.place}</span>
              <span className="ex-line">{e.line}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── closing ── */}
      <section className="lp-close">
        <p className="lp-close-kick">Got a story?</p>
        <p className="lp-close-h">Tell it.</p>
        <Link href="/make" className="lp-btn lp-btn-primary lp-btn-lg">Make your first page →</Link>
        <Link href="/explore" className="lp-close-alt">Read something beautiful →</Link>
      </section>

      <footer className="lp-foot">Living Page</footer>
    </main>
  );
}

const CSS = `
.lp{
  --paper:#FBF6EC; --paper-2:#fff; --ink:#1A1816; --ink-soft:#4A4642; --mute:#8A837A; --line:#E7DFCE;
  --sun:#FFC53D; --tomato:#F0492E; --electric:#2D6BF0; --grass:#1F9E5A; --coral:#FF5C7A; --lilac:#9B7EDE;
  --f-disp:var(--font-disp),Georgia,serif; --f-body:var(--font-body),Georgia,serif;
  --f-hand:var(--font-hand),cursive; --f-mono:var(--font-mono),ui-monospace,monospace;
  background:var(--paper); color:var(--ink); min-height:100vh; overflow-x:hidden;
  font-family:var(--f-body);
}
.lp a{ color:inherit; text-decoration:none; }
.lp-nav{ display:flex; align-items:center; justify-content:space-between; padding:1.3rem max(1rem,4vw); }
.lp-logo{ font-family:var(--f-hand); font-size:1.4rem; }
.lp-nav-r{ display:flex; gap:1.4rem; font-family:var(--f-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; }
.lp-nav-r a{ color:var(--mute); } .lp-nav-r a:hover{ color:var(--electric); }

.lp-hero{ display:grid; grid-template-columns:1.05fr .95fr; gap:3rem; align-items:center;
  padding:6vh max(1rem,4vw) 8vh; max-width:78rem; margin:0 auto; }
.lp-eyebrow{ font-family:var(--f-mono); font-size:.72rem; letter-spacing:.16em; text-transform:uppercase; color:var(--electric); margin:0 0 1rem; }
.lp-h1{ font-family:var(--f-disp); font-weight:400; font-size:clamp(2.6rem,6vw,4.4rem); line-height:1.03; margin:0; }
.lp-h1-2{ color:var(--tomato); }
.lp-sub{ font-size:1.25rem; color:var(--ink-soft); margin:1.4rem 0 2rem; }
.lp-cta-row{ display:flex; gap:.8rem; flex-wrap:wrap; }
.lp-btn{ display:inline-block; font-family:var(--f-mono); font-size:.75rem; letter-spacing:.1em; text-transform:uppercase;
  padding:.85rem 1.3rem; border-radius:999px; transition:transform .2s cubic-bezier(.2,1.25,.3,1), background .2s; }
.lp a.lp-btn-primary{ background:var(--ink); color:var(--paper); }
.lp a.lp-btn-primary:hover{ background:var(--electric); transform:translateY(-2px); }
.lp a.lp-btn-ghost{ border:1px solid var(--line); color:var(--ink-soft); }
.lp a.lp-btn-ghost:hover{ border-color:var(--electric); color:var(--electric); }
.lp-btn-lg{ font-size:.85rem; padding:1rem 1.6rem; }

/* hero transform panel */
.hero-page{ position:relative; background:var(--paper-2); border:1px solid var(--line); border-radius:18px;
  padding:2.4rem 2.2rem; min-height:16rem; box-shadow:0 12px 36px rgba(26,24,22,.07); overflow:hidden; }
.hero-line{ font-family:var(--f-body); font-size:1.35rem; line-height:1.5; margin:.2rem 0; color:var(--ink);
  transition:all .9s cubic-bezier(.2,.8,.3,1); }
.ph-0 .hero-line{ color:var(--mute); font-size:1.15rem; letter-spacing:0; }
.ph-1 .hero-line{ color:var(--ink-soft); }
/* alive state: each line gets a personality */
.ph-2 .hl-0{ font-family:var(--f-hand); font-size:1.5rem; color:var(--electric); transform:rotate(-1.5deg); }
.ph-2 .hl-1{ color:var(--electric); font-style:italic; letter-spacing:.02em; opacity:.85; }
.ph-2 .hl-2{ font-family:var(--f-disp); font-size:2.6rem; line-height:1.1; color:var(--tomato); }
.hero-doodle{ position:absolute; right:1.4rem; top:1.2rem; width:56px; height:56px; opacity:0;
  background:radial-gradient(circle at 50% 50%, var(--sun) 0%, transparent 62%); transition:opacity .8s ease; }
.ph-2 .hero-doodle{ opacity:1; animation:hb 3s ease-in-out infinite; }
@keyframes hb{ 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.15); } }
.ph-1 .hero-page, .ph-2 .hero-page{ }

.lp-sec{ max-width:66rem; margin:0 auto; padding:5vh max(1rem,4vw); border-top:1px solid var(--line); }
.lp-sec-h{ font-family:var(--f-disp); font-weight:400; font-size:clamp(1.7rem,4vw,2.6rem); margin:0 0 1.6rem; }

/* personalities */
.lp-personality{ display:flex; align-items:baseline; gap:1rem; flex-wrap:wrap; min-height:4rem; }
.per-line{ font-size:2rem; transition:all .5s cubic-bezier(.2,.8,.3,1); }
.p-whisper{ font-size:1.1rem; color:var(--mute); letter-spacing:.04em; }
.p-shout{ font-family:var(--f-disp); font-size:2.8rem; color:var(--tomato); }
.p-hand{ font-family:var(--f-hand); font-size:2.2rem; color:var(--electric); transform:rotate(-2deg); }
.p-drift{ font-style:italic; color:var(--lilac); letter-spacing:.1em; opacity:.8; }
.p-type{ font-family:var(--f-mono); font-size:1.4rem; color:var(--grass); }
.per-tag{ font-family:var(--f-mono); font-size:.7rem; letter-spacing:.1em; text-transform:uppercase; color:var(--mute); }

/* modes */
.lp-modes{ display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; }
.lp-mode{ background:var(--paper-2); border:1px solid var(--line); border-radius:14px; padding:1.4rem 1.5rem;
  display:flex; flex-direction:column; gap:.8rem; transition:transform .2s cubic-bezier(.2,1.25,.3,1), border-color .2s; }
.lp-mode:hover{ transform:translateY(-3px); border-color:var(--electric); }
.lp-mode-label{ font-family:var(--f-disp); font-size:1.4rem; }
.lp-mode-cta{ font-family:var(--f-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--electric); }

/* examples */
.lp-examples{ display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; }
.lp-example{ background:var(--paper-2); border:1px solid var(--line); border-left:3px solid var(--a,var(--electric));
  border-radius:12px; padding:1.3rem 1.4rem; display:flex; flex-direction:column; gap:.6rem; transition:transform .2s; }
.lp-example:hover{ transform:translateY(-3px); }
.ex-place{ font-family:var(--f-mono); font-size:.68rem; letter-spacing:.1em; color:color-mix(in oklab,var(--a,var(--electric)) 70%,var(--ink)); }
.ex-line{ font-family:var(--f-disp); font-size:1.25rem; line-height:1.25; }

/* closing */
.lp-close{ text-align:center; padding:12vh max(1rem,4vw) 8vh; }
.lp-close-kick{ font-family:var(--f-mono); font-size:.8rem; letter-spacing:.14em; text-transform:uppercase; color:var(--mute); margin:0; }
.lp-close-h{ font-family:var(--f-disp); font-size:clamp(3rem,10vw,6rem); margin:.2rem 0 1.8rem; }
.lp-close-alt{ display:block; margin-top:1.2rem; font-family:var(--f-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--mute); }
.lp-close-alt:hover{ color:var(--electric); }
.lp-foot{ text-align:center; padding:3rem; font-family:var(--f-hand); font-size:1.2rem; color:var(--mute); border-top:1px solid var(--line); }

@media (max-width:820px){
  .lp-hero{ grid-template-columns:1fr; gap:2rem; }
  .lp-modes{ grid-template-columns:1fr; }
  .lp-examples{ grid-template-columns:1fr; }
}
@media (prefers-reduced-motion:reduce){
  .hero-line,.per-line,.hero-doodle{ transition:none !important; animation:none !important; }
}
`;
