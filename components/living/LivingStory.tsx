"use client";

/**
 * THE LIVING STORY RENDERER  (Decision D9)
 *
 * Reader-output renderer for the living-page design language. Replaces (for new
 * stories) the warm-grey `StoryView`, the `Look` system and the 70%-plain
 * `annotate` path. It owns the shared mechanics:
 *   · a fixed, motivated WORLD that EVOLVES as you read (--lit from scroll),
 *     with a living AMBIENT (rain / stars / motes) so nothing reads dead,
 *   · WORDS THAT UNVEIL per beat, and a BEHAVIOUR per beat (tremor, dissolve,
 *     heartbeat, rush, fall, drift, hold, swell) so stories *perform* rather
 *     than just differ by background,
 *   · optional inline ELEMENTS summoned by the caster (phone, flame),
 *   · legibility by type-shadow; reduced-motion safety.
 *
 * Input: a `LivingScene` from `lib/living/cast.ts`. No `annotate`, no `Look`.
 */

import { useEffect, useRef } from "react";
import { spansOf, type LivingScene, type ElementKey, type Span } from "@/lib/living/cast";

function Words({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((p, i) =>
        /^\s+$/.test(p) || p === "" ? p : <span className="w" key={i}>{p}</span>,
      )}
    </>
  );
}

/** One directed span — word-split for the unveil, wrapped in its mark's class
 *  (emphasis / recurring motif / heartbeat ♥). */
function SpanView({ span }: { span: Span }) {
  const cls = span.mark === "em" ? "em" : span.mark === "motif" ? "motif" : span.mark === "heartbeat" ? "hb" : undefined;
  const inner = <Words text={span.text} />;
  return cls ? <span className={cls}>{inner}</span> : inner;
}

const ELEMENT_SVG: Record<Exclude<ElementKey, "none">, string> = {
  phone: `<svg viewBox="0 0 44 72"><rect x="4" y="2" width="36" height="68" rx="7" fill="#0c0d11" stroke="#23242b" stroke-width="1.5"/><rect x="9" y="12" width="26" height="34" rx="4" fill="rgba(94,208,230,.1)" stroke="rgba(94,208,230,.5)" stroke-width="1"/><circle cx="22" cy="60" r="3" fill="#23242b"/><circle class="ping" cx="22" cy="26" r="4" fill="#E23A2E"/></svg>`,
  flame: `<svg viewBox="0 0 40 60"><g class="flamefx"><path d="M20 30 C12 22 16 12 20 2 C24 12 28 22 20 30 Z" fill="#F0A24A"/><path d="M20 26 C16 21 18 15 20 9 C22 15 24 21 20 26 Z" fill="#F6D27A"/></g><rect x="11" y="30" width="18" height="24" rx="3" fill="#2a2420" stroke="#5a4c3e" stroke-width="1.2"/></svg>`,
};

/**
 * `contained` renders the world inside its own bounded, scrolling box (for the
 * make/editor split-pane previews) instead of the full viewport: background
 * layers are pinned absolutely inside the box and a `.ls-scroll` region scrolls,
 * driving `--lit` from its own scrollTop. Default (false) is the full-viewport
 * reader render — unchanged.
 */
export type PaletteOverride = { scheme?: "light" | "dark"; ground?: string; accent?: string; warm?: string };

export function LivingStory({ scene, contained = false, palette }: { scene: LivingScene; contained?: boolean; palette?: PaletteOverride }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const scroller = contained ? scrollRef.current : null;
    const onScroll = () => {
      const h = scroller
        ? scroller.scrollHeight - scroller.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      const y = scroller ? scroller.scrollTop : window.scrollY;
      const p = h > 0 ? y / h : 0;
      root.style.setProperty("--lit", Math.max(0, Math.min(1, p)).toFixed(3));
    };
    const target: Window | HTMLElement = scroller ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue;
          const beat = e.target as HTMLElement;
          beat.querySelectorAll<HTMLElement>(".w").forEach((w, i) => {
            w.style.transitionDelay = `${i * 28}ms`;
          });
          beat.classList.add("seen");
          if (beat.classList.contains("beh-dissolve")) {
            const words = beat.querySelectorAll<HTMLElement>(".w").length;
            setTimeout(() => beat.classList.add("ghosted"), 700 + words * 28);
          }
          io.unobserve(beat);
        }
      },
      { root: scroller ?? null, threshold: 0.3, rootMargin: "0px 0px -14% 0px" },
    );
    root.querySelectorAll(".ls-beat").forEach((b) => io.observe(b));
    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io.disconnect();
    };
  }, [scene, contained]);

  const { world } = scene;
  // the brain's palette (Stage 1) re-tints the chosen world to this story —
  // custom per story for the cost of one Sonnet call (D11).
  const ground = palette?.ground ?? world.ground;
  const accent = palette?.accent ?? world.accent;
  const scheme = palette?.scheme ?? world.scheme;
  const warm = palette?.warm ?? world.warm;

  const layers = (
    <>
      <div className="ls-world" style={{ background: ground }}>
        {world.sceneSvg ? <div className="ls-scene" dangerouslySetInnerHTML={{ __html: world.sceneSvg }} /> : null}
      </div>
      {warm ? <div className="ls-warm" style={{ background: warm }} /> : null}
      {world.ambient ? <div className={`ls-ambient amb-${world.ambient}`} aria-hidden /> : null}
      <div className="ls-dim" />
      <div className="ls-vignette" />
      <div className="ls-grain" />
    </>
  );

  const essay = (
    <article className="ls-essay">
      {scene.eyebrow ? <p className="ls-eyebrow">{scene.eyebrow}</p> : null}
      {scene.title ? <h1 className="ls-title">{scene.title}</h1> : null}
      {scene.title && scene.dek ? <p className="ls-dek">{scene.dek}</p> : null}
      {scene.beats.map((b, i) => (
        <p key={i} className={`ls-beat beh-${b.behavior}${b.loud ? " loud" : ""}`}>
          {b.element !== "none" ? (
            <span className="ls-el" dangerouslySetInnerHTML={{ __html: ELEMENT_SVG[b.element] }} />
          ) : null}
          {spansOf(b).map((s, j) => <SpanView key={j} span={s} />)}
        </p>
      ))}
      <p className="ls-colophon">Living Page</p>
    </article>
  );

  return (
    <div className={`ls${contained ? " ls-contained" : ""}`} ref={rootRef} data-scheme={scheme}
      style={{ ["--accent" as string]: accent, ...(contained ? {} : { background: ground }) }}>
      {layers}
      {contained ? <div className="ls-scroll" ref={scrollRef}>{essay}</div> : essay}
      <style>{CSS}</style>
    </div>
  );
}

export default LivingStory;

const CSS = `
.ls{ --lit:0; --ink:#ECE7DD; --soft:rgba(236,231,221,.6); --faint:rgba(236,231,221,.34);
  color:var(--ink); font-family:var(--f-body,"Newsreader",Georgia,serif); line-height:1.75;
  /* self-contained: own stacking context + min-height so the world's layers
     (some on negative z-index) always paint above any parent/host background
     (e.g. the embed iframe's dark body) instead of being hidden behind it. */
  position:relative; isolation:isolate; min-height:100vh; }
.ls:not(.ls-contained){ overflow:hidden; }
.ls[data-scheme="light"]{ --ink:#1A1816; --soft:rgba(26,24,22,.6); --faint:rgba(26,24,22,.4); }

/* contained — the world lives inside a bounded box (make/editor preview): the
   background layers pin absolutely inside the box, the essay scrolls. */
.ls-contained{ position:relative; width:100%; height:100%; overflow:hidden; border-radius:inherit; }
.ls-contained .ls-world, .ls-contained .ls-warm, .ls-contained .ls-dim,
.ls-contained .ls-vignette, .ls-contained .ls-grain, .ls-contained .ls-ambient{ position:absolute; }
.ls-contained .ls-scroll{ position:absolute; inset:0; z-index:1; overflow-y:auto; overflow-x:hidden; }
.ls-contained .ls-essay{ padding:12% 8% 30%; max-width:none; }
.ls-contained .ls-title{ margin-bottom:8%; }
.ls-contained .ls-beat{ margin-bottom:9%; }

.ls-world{ position:fixed; inset:0; z-index:-3; overflow:hidden; }
.ls-scene, .ls-scene svg{ position:absolute; inset:0; width:100%; height:100%; display:block; }
.ls-warm{ position:fixed; inset:0; z-index:-2; pointer-events:none; opacity:calc(.4 + .6*var(--lit)); animation:ls-glow 18s ease-in-out infinite alternate; }
@keyframes ls-glow{ from{ transform:translate(0,0) } to{ transform:translate(4%,-3%) } }
.ls-dim{ position:fixed; inset:0; z-index:-2; pointer-events:none; background:#0a0912; opacity:calc((1 - var(--lit)) * .55); }
.ls[data-scheme="light"] .ls-dim{ background:#FBF6EC; opacity:calc((1 - var(--lit)) * .22); }
.ls-vignette{ position:fixed; inset:0; z-index:-2; pointer-events:none; background:radial-gradient(130% 100% at 50% 40%, transparent 56%, rgba(6,4,14,.5)); }
.ls[data-scheme="light"] .ls-vignette{ background:radial-gradient(130% 100% at 50% 40%, transparent 60%, rgba(120,80,40,.14)); }
.ls-grain{ position:fixed; inset:0; z-index:40; opacity:.05; pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"); }

/* ambients — every world feels alive even without a bespoke scene */
.ls-ambient{ position:fixed; inset:0; z-index:-2; pointer-events:none; opacity:calc(.45 + .45*var(--lit)); }
.amb-rain{ background-image:repeating-linear-gradient(103deg, transparent 0 22px, rgba(174,188,203,.22) 22px 23px);
  background-size:200px 200px; animation:ls-rainmove 0.7s linear infinite; }
@keyframes ls-rainmove{ from{ background-position:0 0 } to{ background-position:-40px 200px } }
.amb-stars{ background-image:radial-gradient(1.3px 1.3px at 12% 18%,#fff,transparent),radial-gradient(1.1px 1.1px at 28% 32%,#fff,transparent),radial-gradient(1px 1px at 46% 12%,#fff,transparent),radial-gradient(1.3px 1.3px at 64% 26%,#fff,transparent),radial-gradient(1px 1px at 80% 16%,#fff,transparent),radial-gradient(1.1px 1.1px at 88% 36%,#fff,transparent),radial-gradient(1px 1px at 36% 44%,#fff,transparent); animation:ls-tw 4s ease-in-out infinite alternate; }
@keyframes ls-tw{ from{opacity:.5} to{opacity:1} }
.amb-motes{ background-image:radial-gradient(2px 2px at 20% 30%,rgba(255,235,200,.5),transparent),radial-gradient(2px 2px at 70% 60%,rgba(255,235,200,.4),transparent),radial-gradient(1.5px 1.5px at 45% 80%,rgba(255,235,200,.4),transparent); animation:ls-drift 14s ease-in-out infinite alternate; }
@keyframes ls-drift{ from{transform:translateY(0)} to{transform:translateY(-22px)} }

/* scene-part brightening (for worlds that ship a bespoke sceneSvg) */
.ls .lampglow{ opacity:calc(.15 + .85 * var(--lit)); }
.ls .boothwarm{ opacity:var(--lit); }
.ls .emberlit{ opacity:calc(.1 + .9 * var(--lit)); }
.ls .rainl{ opacity:calc(.1 + .5 * var(--lit)); animation:ls-rain 1.1s linear infinite; }
@keyframes ls-rain{ from{transform:translateY(-24px)} to{transform:translateY(24px)} }
.ls .smoke{ opacity:calc(.3 * var(--lit)); animation:ls-rise 3.2s ease-out infinite; }
@keyframes ls-rise{ 0%{opacity:.4;transform:translateY(0)} 100%{opacity:0;transform:translateY(-22px)} }

.ls-essay{ max-width:36rem; margin:0 auto; padding:22vh 1.7rem 42vh; position:relative; z-index:1; }
.ls-eyebrow{ font-family:var(--f-mono,"Space Mono",monospace); font-size:.62rem; letter-spacing:.34em; text-transform:uppercase; color:var(--faint); text-shadow:0 1px 14px rgba(8,6,14,.7); }
.ls-title{ font-family:var(--f-disp,"Instrument Serif",Georgia,serif); font-size:clamp(2.6rem,8vw,4rem); line-height:1.03; margin:.7rem 0 12vh; text-shadow:0 2px 30px rgba(8,6,14,.7); }
.ls-dek{ font-family:var(--f-disp,"Instrument Serif",Georgia,serif); font-style:italic; color:var(--soft); font-size:clamp(1.1rem,2.6vw,1.5rem); margin:-10vh 0 12vh; text-shadow:0 1px 16px rgba(8,6,14,.6); }
.ls[data-scheme="light"] .ls-dek{ text-shadow:none; }
/* directed inline marks — emphasis, the recurring signature motif, a heartbeat */
.ls .em{ color:var(--accent); }
.ls .motif{ color:var(--accent); animation:ls-shimmer 2.6s ease-in-out infinite; }
@keyframes ls-shimmer{ 0%,100%{ opacity:.72; letter-spacing:0 } 50%{ opacity:1; letter-spacing:.04em } }
.ls .hb{ color:#F2766A; display:inline-block; animation:ls-beat 1.15s ease-in-out infinite; }
.ls-beat{ font-size:clamp(1.22rem,2.6vw,1.5rem); margin:0 0 10vh; max-width:34rem; position:relative;
  text-shadow:0 1px 18px rgba(8,6,14,.72), 0 0 2px rgba(8,6,14,.5); }
.ls[data-scheme="light"] .ls-beat{ text-shadow:none; }
.ls-colophon{ font-family:var(--f-mono,"Space Mono",monospace); font-size:.6rem; letter-spacing:.3em; text-transform:uppercase; color:var(--faint); margin-top:6vh; }

/* an inline summoned element, co-located with its words (D9) */
.ls-el{ display:block; width:46px; margin:0 0 .9rem; opacity:0; transform:translateY(8px) scale(.9); transition:opacity .9s ease, transform .9s ease; }
.ls-beat.seen .ls-el{ opacity:1; transform:none; }
.ls-el svg{ width:100%; display:block; }
.ls-el .ping{ animation:ls-ping 1.1s ease-in-out infinite; }
@keyframes ls-ping{ 0%,100%{opacity:1} 50%{opacity:.25} }
.ls-el .flamefx{ transform-origin:50% 100%; animation:ls-flick .35s ease-in-out infinite alternate; }
@keyframes ls-flick{ from{transform:scaleY(1)} to{transform:scaleY(1.16) translateY(-.4px)} }

/* THE UNVEIL — words wait out of focus, then assemble on arrival */
.ls .w{ display:inline-block; opacity:0; filter:blur(8px); transform:translateY(14px);
  transition:opacity .6s ease, filter .6s ease, transform .6s cubic-bezier(.2,.8,.3,1); }
.ls-beat.seen .w{ opacity:1; filter:blur(0); transform:none; }

/* ── BEHAVIOURS ── */
.ls-beat.loud{ font-family:var(--f-disp,"Instrument Serif",Georgia,serif); font-size:clamp(2.1rem,6vw,3.4rem); line-height:1.08; max-width:18ch; }
.ls-beat.beh-swell.seen .w, .ls-beat.loud.seen .w{ color:var(--accent); }

/* tremor — tense lines shake and glow the accent */
.ls-beat.beh-tremor.seen{ color:var(--accent); animation:ls-shake .26s infinite; }
.ls-beat.beh-tremor.loud.seen{ animation:ls-shake .18s infinite; }
@keyframes ls-shake{ 0%,100%{transform:translate(0,0)} 25%{transform:translate(-1.4px,1px)} 50%{transform:translate(1.4px,-1px)} 75%{transform:translate(-1px,-1.4px)} }

/* dissolve — assembles, then drifts up and fades like a fading memory */
.ls-beat.beh-dissolve.ghosted .w{ opacity:.32; filter:blur(1.4px); transform:translateY(-8px); transition:opacity 1.4s ease, filter 1.4s ease, transform 1.4s ease; }

/* heartbeat — a pulse under the line */
.ls-beat.beh-heartbeat .hb{ color:#F2766A; display:inline-block; animation:ls-beat 1.15s ease-in-out infinite; }
@keyframes ls-beat{ 0%,100%{transform:scale(1)} 15%{transform:scale(1.35)} 30%{transform:scale(1)} }

/* rush — words sweep in from the side, fast */
.ls-beat.beh-rush .w{ transform:translateX(26px); filter:blur(6px); transition-duration:.42s; }
.ls-beat.beh-rush.seen .w{ transform:none; filter:blur(0); }

/* fall — words drop from above with gravity */
.ls-beat.beh-fall .w{ transform:translateY(-28px); transition-timing-function:cubic-bezier(.5,0,.75,0); }
.ls-beat.beh-fall.seen .w{ transform:none; }

/* drift — reflective, handwritten-soft, slow */
.ls-beat.beh-drift{ font-style:italic; color:var(--soft); }
.ls-beat.beh-drift .w{ transition-duration:.9s; }

/* hold — quiet, centred, slow to arrive */
.ls-beat.beh-hold{ text-align:center; letter-spacing:.01em; }
.ls-beat.beh-hold .w{ transition-duration:1s; filter:blur(10px); }

@media (prefers-reduced-motion: reduce){
  .ls .w{ opacity:1 !important; filter:none !important; transform:none !important; transition:opacity .3s; }
  .ls-beat.beh-tremor.seen, .ls-beat.beh-heartbeat .hb, .ls .rainl, .ls .smoke,
  .ls-ambient, .ls-el .ping, .ls-el .flamefx{ animation:none; }
}
`;
