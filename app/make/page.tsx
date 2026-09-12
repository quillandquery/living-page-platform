"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { createStoryAction } from "@/app/write/actions";

/**
 * WRITER ENTRY (PRD v2 §11). Four ways in — the point is to lower the barrier
 * before a word is written. Each starts a draft and drops the writer into the
 * editor. Client-driven with a pending state so a click always does something
 * (if you're not signed in, it routes you to sign in first).
 */

const MODES = [
  { label: "Something happened.", prompt: "A trip, a person, a strange night, a day you still remember.", cta: "Start a story" },
  { label: "Something tiny you can't forget.", prompt: "A look. A sentence. A smell. Five minutes that stayed with you.", cta: "Capture a moment" },
  { label: "Something sitting in your head.", prompt: "An observation, a feeling, a question, a tiny rant.", cta: "Put it somewhere" },
  { label: "Don't know yet? That's fine.", prompt: "Type whatever is in your head.", cta: "Just start" },
];

export default function Make() {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<number | null>(null);

  const go = (i: number) => {
    setBusy(i);
    start(() => { createStoryAction(); });
  };

  return (
    <main className="mk">
      <style>{CSS}</style>
      <nav className="mk-nav">
        <Link href="/" className="mk-logo">Living Page</Link>
        <Link href="/wander" className="mk-back">Wander</Link>
      </nav>
      <div className="mk-head">
        <h1 className="mk-h1">What do you want to tell?</h1>
        <p className="mk-sub">Pick a shape, or just start. You can change it later — the page figures itself out.</p>
      </div>
      <div className="mk-grid">
        {MODES.map((m, i) => (
          <button key={m.label} className="mk-card" onClick={() => go(i)} disabled={pending} type="button">
            <span className="mk-label">{m.label}</span>
            <span className="mk-prompt">{m.prompt}</span>
            <span className="mk-cta">{busy === i && pending ? "starting…" : `${m.cta} →`}</span>
          </button>
        ))}
      </div>
      {pending ? <div className="mk-loading">Opening your desk…</div> : null}
    </main>
  );
}

const CSS = `
.mk{ --paper:#FBF6EC; --paper-2:#fff; --ink:#1A1816; --ink-soft:#4A4642; --mute:#8A837A; --line:#E7DFCE; --electric:#2D6BF0;
  --f-disp:var(--font-disp),Georgia,serif; --f-body:var(--font-body),Georgia,serif; --f-hand:var(--font-hand),cursive;
  --f-mono:var(--font-mono),ui-monospace,monospace; background:var(--paper); color:var(--ink); min-height:100vh; font-family:var(--f-body); }
.mk-nav{ display:flex; align-items:center; justify-content:space-between; padding:1.3rem max(1rem,4vw); }
.mk-logo{ font-family:var(--f-hand); font-size:1.4rem; color:inherit; text-decoration:none; }
.mk-back{ font-family:var(--f-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--mute); text-decoration:none; }
.mk-back:hover{ color:var(--electric); }
.mk-head{ max-width:44rem; margin:0 auto; padding:6vh max(1rem,4vw) 2vh; text-align:center; }
.mk-h1{ font-family:var(--f-disp); font-weight:400; font-size:clamp(2.2rem,6vw,3.4rem); margin:0; }
.mk-sub{ font-size:1.1rem; color:var(--ink-soft); margin:1rem 0 0; }
.mk-grid{ max-width:52rem; margin:0 auto; padding:3vh max(1rem,4vw) 10vh; display:grid; grid-template-columns:1fr 1fr; gap:1.1rem; }
.mk-card{ text-align:left; background:var(--paper-2); border:1px solid var(--line); border-radius:16px; padding:1.8rem 1.7rem;
  display:flex; flex-direction:column; gap:.7rem; align-items:flex-start; cursor:pointer; font-family:inherit; color:inherit;
  transition:transform .2s cubic-bezier(.2,1.25,.3,1), border-color .2s; }
.mk-card:hover{ transform:translateY(-3px); border-color:var(--electric); }
.mk-card:disabled{ opacity:.6; cursor:default; transform:none; }
.mk-label{ font-family:var(--f-disp); font-size:1.5rem; line-height:1.15; }
.mk-prompt{ font-size:.98rem; color:var(--ink-soft); line-height:1.5; }
.mk-cta{ margin-top:.4rem; font-family:var(--f-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase;
  background:var(--ink); color:var(--paper); border-radius:999px; padding:.7rem 1.1rem; }
@media (max-width:680px){ .mk-grid{ grid-template-columns:1fr; } }
.mk-loading{ position:fixed; inset:0; z-index:50; display:flex; align-items:center; justify-content:center;
  background:color-mix(in oklab, var(--paper) 80%, transparent); backdrop-filter:blur(3px);
  font-family:var(--f-mono); font-size:.78rem; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-soft); }
`;
