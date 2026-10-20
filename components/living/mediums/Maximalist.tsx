"use client";

/**
 * MAXIMALIST — a MEDIUM (D9), not a world: the text becomes a Basquiat-ish
 * explosion where the engine decides what SCREAMS. Fully generative over any
 * story via `maximalistInput` (lib/living/cast.ts): the scream is the story's
 * most charged word, the ghosted refrain is its recurring motif, and every
 * other beat is a fragment sized by its role. Scoped under `.maxi`.
 */

import type { MaximalistInput, MaxItem } from "@/lib/living/cast";

const LOUD_COLORS = ["var(--mx-red)", "var(--mx-blue)", "var(--mx-green)", "var(--mx-black)"];
const ANGLES = [-3, 2, -1.5, 3, -2.5, 1.5, -1];

export function Maximalist({ eyebrow, refrain, items }: MaximalistInput) {
  let loudN = 0;
  return (
    <div className="maxi">
      {refrain ? <div className="mx-echo" aria-hidden>{`${refrain} `.repeat(90)}</div> : null}
      <div className="mx-grain" />
      <div className="mx-stage">
        {eyebrow ? <div className="mx-tag">{eyebrow}</div> : null}
        {items.map((it, i) => {
          const delay = `${0.1 + i * 0.12}s`;
          if (it.kind === "scream") {
            const len = Math.max(3, it.word.length);
            return (
              <div key={i} className="mx-screamblock reveal" style={{ animationDelay: delay }}>
                {it.pre ? <div className="mx-pre">{it.pre}</div> : null}
                <div className="mx-crown" aria-hidden>
                  <svg viewBox="0 0 80 54"><polygon points="4,50 12,10 28,34 40,6 52,34 68,10 76,50" /></svg>
                </div>
                <div className="mx-scream" style={{ ["--len" as string]: len }}>{it.word}</div>
                {it.post ? <div className="mx-post">{it.post}</div> : null}
              </div>
            );
          }
          const angle = ANGLES[i % ANGLES.length];
          if (it.role === "opener") {
            return (
              <div key={i} className="reveal" style={{ animationDelay: delay }}>
                <span className="mx-opener" style={{ transform: `rotate(${angle}deg)` }}>
                  {it.text}
                  <svg className="mx-stroke" viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M6 70 C80 20 320 30 394 64 C360 104 60 110 10 86 Z" fill="var(--mx-yellow)" /></svg>
                </span>
              </div>
            );
          }
          if (it.role === "loud") {
            const color = LOUD_COLORS[loudN++ % LOUD_COLORS.length];
            return <p key={i} className="mx-loud reveal" style={{ animationDelay: delay, color, transform: `rotate(${angle}deg)` }}>{it.text}</p>;
          }
          if (it.role === "quiet") {
            return <p key={i} className="mx-quiet reveal" style={{ animationDelay: delay, transform: `rotate(${angle}deg)` }}>{it.text}</p>;
          }
          if (it.role === "resolve") {
            return <p key={i} className="mx-resolve reveal" style={{ animationDelay: delay }}>{it.text}</p>;
          }
          return <p key={i} className="mx-plain reveal" style={{ animationDelay: delay }}>{it.text}</p>;
        })}
        {/* margin doodles */}
        <svg className="mx-doodle mx-star" style={{ left: "5%", top: "32%" }} viewBox="0 0 50 50" aria-hidden><polygon points="25,2 31,18 48,18 34,29 39,47 25,36 11,47 16,29 2,18 19,18" /></svg>
        <svg className="mx-doodle mx-arrow" style={{ right: "7%", top: "18%" }} viewBox="0 0 140 80" aria-hidden><path d="M6 10 C60 0 120 30 128 70 M128 70 L110 60 M128 70 L120 48" /></svg>
        <svg className="mx-doodle mx-scribble" style={{ left: "8%", bottom: "16%" }} viewBox="0 0 180 60" aria-hidden><path d="M6 40 q20 -40 40 0 t40 0 t40 0 t40 0" /></svg>
        <svg className="mx-doodle mx-halftone" style={{ right: "5%", bottom: "12%" }} viewBox="0 0 120 120" aria-hidden><defs><pattern id="mxd" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="3" fill="var(--mx-red)" /></pattern></defs><circle cx="60" cy="60" r="58" fill="url(#mxd)" /></svg>
      </div>
      <style>{CSS}</style>
    </div>
  );
}
export default Maximalist;

const CSS = `
.maxi{ --mx-black:#1a1712; --mx-red:#e23b2e; --mx-yellow:#f5c518; --mx-blue:#2f6bd8; --mx-green:#2fa36b;
  --mx-sans:"Arial Black","Helvetica Neue",Impact,sans-serif; --mx-cond:"Arial Narrow",Arial,sans-serif;
  --mx-hand:"Bradley Hand","Snell Roundhand","Segoe Script","Comic Sans MS",cursive; --mx-mono:"Courier New",monospace;
  position:relative; min-height:100vh; background:#f2ede0; color:var(--mx-black); font-family:var(--mx-sans); overflow:hidden; }
.maxi .mx-echo{ position:fixed; inset:-10%; z-index:0; pointer-events:none; opacity:.05; font-family:var(--mx-sans);
  font-size:46px; line-height:1.1; color:var(--mx-black); transform:rotate(-8deg); word-spacing:14px; overflow:hidden; }
.maxi .mx-grain{ position:fixed; inset:0; z-index:0; opacity:.4; pointer-events:none; mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"); }
.maxi .mx-stage{ position:relative; z-index:1; max-width:1000px; margin:0 auto; padding:9vh 24px 16vh; min-height:100vh; }
.maxi .mx-tag{ display:inline-block; font-family:var(--mx-mono); font-size:11px; letter-spacing:2px; text-transform:uppercase;
  background:var(--mx-black); color:#fff; padding:4px 7px; transform:rotate(-3deg); margin-bottom:3vh; }

.maxi .mx-opener{ position:relative; display:inline-block; font-family:var(--mx-sans); font-size:clamp(34px,7vw,74px);
  line-height:.95; letter-spacing:-1px; margin:1.4vh 0; }
.maxi .mx-stroke{ position:absolute; z-index:-1; left:-5%; top:8%; width:110%; height:84%; }
.maxi .mx-loud{ font-family:var(--mx-sans); font-size:clamp(28px,5.4vw,58px); line-height:1; letter-spacing:-1px; margin:1.6vh 0; max-width:22ch; }
.maxi .mx-quiet{ font-family:var(--mx-hand); color:var(--mx-blue); font-size:clamp(22px,4vw,40px); margin:1.4vh 0 1.4vh 6%; }
.maxi .mx-plain{ font-family:var(--mx-cond); font-weight:700; font-size:clamp(18px,2.6vw,26px); letter-spacing:.3px; line-height:1.35; margin:1.4vh 0; max-width:40ch; }
.maxi .mx-resolve{ font-family:var(--mx-sans); font-size:clamp(22px,3.6vw,40px); line-height:1.04; margin:2vh 0; max-width:24ch; }

.maxi .mx-screamblock{ text-align:center; margin:3vh 0; position:relative; }
.maxi .mx-pre{ font-family:var(--mx-cond); font-weight:700; font-size:clamp(20px,4vw,40px); letter-spacing:2px; text-transform:uppercase; }
.maxi .mx-scream{ font-family:var(--mx-sans); font-size:min(150px, calc(150vw / var(--len))); line-height:.82; color:var(--mx-red);
  letter-spacing:-3px; transform:rotate(-2deg); display:inline-block; margin:4px 0; -webkit-text-stroke:2px var(--mx-black); paint-order:stroke fill; }
.maxi .mx-post{ font-family:var(--mx-hand); color:var(--mx-blue); font-size:clamp(26px,5vw,56px); text-decoration:underline wavy var(--mx-red); transform:rotate(-1deg); }
.maxi .mx-crown{ width:64px; margin:0 auto -8px; } .maxi .mx-crown svg{ width:100%; } .maxi .mx-crown polygon{ fill:var(--mx-yellow); stroke:var(--mx-black); stroke-width:4; }

.maxi .mx-doodle{ position:absolute; z-index:2; pointer-events:none; }
.maxi .mx-star{ width:44px; } .maxi .mx-star polygon{ fill:var(--mx-yellow); stroke:var(--mx-black); stroke-width:3; }
.maxi .mx-arrow{ width:110px; } .maxi .mx-arrow path{ stroke:var(--mx-black); stroke-width:4; fill:none; stroke-linecap:round; }
.maxi .mx-scribble{ width:150px; } .maxi .mx-scribble path{ stroke:var(--mx-green); stroke-width:5; fill:none; stroke-linecap:round; }
.maxi .mx-halftone{ width:110px; opacity:.5; }

.maxi .reveal{ opacity:0; transform:translateY(16px); animation:mx-pop .5s cubic-bezier(.2,1.3,.4,1) forwards; }
@keyframes mx-pop{ to{opacity:1; transform:none} }
@media (prefers-reduced-motion:reduce){ .maxi .reveal{ opacity:1; transform:none; animation:none; } }
`;
