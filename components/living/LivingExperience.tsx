"use client";

/**
 * THE LIVING EXPERIENCE RENDERER  (docs/EXPERIENCE-BRIEF.md)
 *
 * Executes an `ExperienceSpec` composed by the brain into an immersive, animated
 * reading experience: a layered environment that shifts as you scroll, an ambient
 * that breathes, drifting objects, a material medium (open world / paper letter /
 * underwater / film), and per-paragraph typographic behaviour. The author's prose
 * is rendered verbatim — the spec only directs how each paragraph *performs*
 * (behaviour + which words to emphasise), so the writing is never rewritten.
 *
 * Deterministic parts (layers, prose) render on the server for SEO; the random
 * parts (ambient particles) are built client-side in an effect, so there is no
 * hydration mismatch and the page still reads with JS off / reduced motion on.
 */

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { resolveSilhouette } from "@/lib/living/silhouettes";
import type { ExperienceSpec, SceneDirective } from "@/lib/living/experience";

export type LivingExperienceProps = {
  text: string;
  spec: ExperienceSpec;
  title?: string;
  eyebrow?: string;
  dek?: string;
};

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.5'/></svg>\")";

const AMB_N: Record<string, number> = {
  stars: 60, rain: 90, snow: 50, bubbles: 26, motes: 40, embers: 28, petals: 18, fog: 4,
};

function paragraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

export function LivingExperience({ text, spec, title, eyebrow, dek }: LivingExperienceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const paras = useMemo(() => paragraphs(text), [text]);
  const dark = spec.scheme !== "light";
  const sil = resolveSilhouette(spec.silhouette);

  const rootStyle = {
    "--sky": spec.sky,
    "--sky2": spec.sky2 ?? "transparent",
    "--glow": spec.glow ?? "transparent",
    "--accent": spec.accent,
    "--ink": spec.ink ?? (dark ? "#f3eee3" : "#2a2118"),
    "--sil": spec.silInk ?? "#0b0a18",
    "--vig": spec.vignette ?? (dark ? "rgba(0,0,0,.55)" : "rgba(60,40,20,.18)"),
    "--grain": dark ? 0.08 : 0.05,
    "--grainimg": GRAIN,
  } as CSSProperties;

  // ambient particles + caustic/flash: random → client only (no SSR mismatch)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const made: HTMLElement[] = [];
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const type = spec.ambient;
    if (type && type !== "none") {
      const wrap = document.createElement("div");
      wrap.className = "le-layer le-ambient";
      const n = AMB_N[type] ?? 30;
      const cls: Record<string, string> = {
        stars: "star", rain: "rain", snow: "snow", bubbles: "bub",
        motes: "mote", embers: "ember", petals: "petal",
      };
      for (let i = 0; i < n; i++) {
        const e = document.createElement("div");
        if (type === "fog") {
          e.className = "fog"; const s = rnd(30, 55);
          e.style.width = s + "vw"; e.style.height = s + "vw";
          e.style.left = rnd(-10, 90) + "vw"; e.style.top = rnd(-10, 80) + "vh";
          e.style.setProperty("--d", rnd(34, 60) + "s"); e.style.setProperty("--dl", -rnd(0, 40) + "s");
        } else {
          e.className = "le-p " + cls[type];
          e.style.left = rnd(0, 100) + "vw"; e.style.top = rnd(0, 100) + "vh";
          if (type === "bubbles") { const d = rnd(8, 22); e.style.width = d + "px"; e.style.height = d + "px"; }
          if (type === "motes") { const m = rnd(3, 7); e.style.width = m + "px"; e.style.height = m + "px"; }
          if (type === "embers") { const em = rnd(2, 5); e.style.width = em + "px"; e.style.height = em + "px"; }
          if (type === "petals") { e.style.width = "9px"; e.style.height = "9px"; e.style.background = spec.accent; }
          if (type === "stars") { const ss = rnd(1, 2.6); e.style.width = ss + "px"; e.style.height = ss + "px"; }
          const fast = type === "rain";
          e.style.setProperty("--d", rnd(fast ? 0.5 : 6, fast ? 1.1 : 18) + "s");
          e.style.setProperty("--dl", -rnd(0, 18) + "s");
        }
        wrap.appendChild(e);
      }
      root.appendChild(wrap); made.push(wrap);
    }
    if (spec.caustic) { const c = document.createElement("div"); c.className = "le-layer le-caustic"; root.appendChild(c); made.push(c); }
    if (spec.lightning) { const f = document.createElement("div"); f.className = "le-layer le-flash"; root.appendChild(f); made.push(f); }
    return () => { made.forEach((m) => m.remove()); };
  }, [spec.ambient, spec.caustic, spec.lightning, spec.accent]);

  // scroll progress (world shift + glow + parallax) and reveal-on-arrival
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const scenes = Array.from(root.querySelectorAll<HTMLElement>(".le-scene"));
    const io = new IntersectionObserver(
      (es) => es.forEach((en) => { if (en.isIntersecting) en.target.classList.add("in"); }),
      { threshold: 0.26 },
    );
    scenes.forEach((s) => io.observe(s));
    if (scenes[0]) scenes[0].classList.add("in");
    const objs = Array.from(root.querySelectorAll<HTMLElement>(".le-obj"));
    const onScroll = () => {
      const h = document.body.scrollHeight - window.innerHeight;
      const p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
      root.style.setProperty("--p", p.toFixed(3));
      objs.forEach((o) => {
        const dep = parseFloat(o.style.getPropertyValue("--depth")) || 0.3;
        o.style.transform = `translateY(${-window.scrollY * dep}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, [paras.length, spec.medium]);

  return (
    <div
      ref={rootRef}
      className={`living-exp ${dark ? "le-dark" : "le-light"} le-m-${spec.medium}`}
      style={rootStyle}
    >
      <div className="le-layer le-sky" />
      <div className="le-layer le-sky2" />
      <div className="le-layer le-glow" />
      {sil && sil !== "none" ? (
        <div className="le-silhouette" dangerouslySetInnerHTML={{ __html: sil }} />
      ) : null}
      <div className="le-layer le-vignette" />
      <div className="le-layer le-grain" />
      {spec.medium === "film" ? (<><div className="le-bar le-top" /><div className="le-bar le-bot" /></>) : null}

      {(spec.objects ?? []).map((o, i) => (
        <div
          key={i}
          className="le-obj"
          data-drift={o.drift}
          style={{ left: `${o.x}vw`, top: `${o.y}vh`, fontSize: `${o.size}px`, opacity: o.opacity, ["--depth" as string]: o.depth } as CSSProperties}
        >
          {o.emoji}
        </div>
      ))}

      <article className="le-reader">
        {eyebrow ? <p className="le-eyebrow">{eyebrow}</p> : null}
        {title ? <h1 className="le-title">{title}</h1> : null}
        {dek ? <p className="le-dek">{dek}</p> : null}
        {paras.map((p, i) => (
          <Scene key={i} text={p} directive={spec.scenes?.[i]} />
        ))}
      </article>

      <style>{CSS}</style>
    </div>
  );
}

function Scene({ text, directive }: { text: string; directive?: SceneDirective }) {
  const behavior = directive?.behavior ?? "unveil";
  const em = new Set((directive?.emphasis ?? []).map((w) => w.toLowerCase()));
  const blocks = text.split(/\n{2,}/);
  let i = 0;
  return (
    <div className={`le-scene le-b-${behavior}`}>
      {blocks.map((b, bi) => (
        <p key={bi}>
          {b.split(/\s+/).map((word, wi, arr) => {
            const key = word.toLowerCase().replace(/[^a-z0-9']/g, "");
            const cls = "le-w" + (key && em.has(key) ? " le-em" : "");
            const node = (
              <span key={wi} className={cls} style={{ ["--i" as string]: i++ } as CSSProperties}>
                {word}
              </span>
            );
            return wi < arr.length - 1 ? [node, " "] : node;
          })}
        </p>
      ))}
    </div>
  );
}

export default LivingExperience;

const CSS = `
.living-exp{position:relative;min-height:100vh;color:var(--ink);
  font-family:var(--f-disp,"Instrument Serif",Georgia,"Times New Roman",serif);
  -webkit-font-smoothing:antialiased}
.living-exp *{box-sizing:border-box}
.le-layer{position:fixed;inset:0;pointer-events:none}
.le-sky{z-index:0;background:var(--sky)}
.le-sky2{z-index:0;background:var(--sky2);opacity:calc(var(--p,0))}
.le-glow{z-index:1;background:var(--glow);mix-blend-mode:screen;
  opacity:calc(.32 + .68 * var(--p,0));transform:translateY(calc(var(--p,0) * -3vh));transition:opacity .2s linear}
.le-silhouette{position:fixed;left:0;right:0;bottom:0;height:62vh;z-index:1;color:var(--sil);
  transform:translateY(calc(var(--p,0) * -4vh));pointer-events:none}
.le-silhouette svg{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 0 30px rgba(0,0,0,.35))}
.le-vignette{z-index:5;box-shadow:inset 0 0 38vh 6vh var(--vig)}
.le-grain{z-index:6;opacity:var(--grain);mix-blend-mode:overlay;background-image:var(--grainimg)}
.le-ambient{z-index:2}
.le-reader{position:relative;z-index:4;max-width:42rem;margin:0 auto;padding:46vh 1.5rem 40vh}
.le-eyebrow{font-family:var(--f-mono,"Space Mono",ui-monospace,monospace);font-size:.68rem;letter-spacing:.34em;
  text-transform:uppercase;opacity:.62;margin:0 0 1.4rem}
.le-title{font-size:clamp(2.6rem,7vw,4.4rem);line-height:1.04;letter-spacing:-.01em;margin:0 0 1rem;font-weight:400}
.le-dek{font-size:1.12rem;line-height:1.6;opacity:.7;font-style:italic;margin:0 0 2rem;max-width:30rem}
.le-scene{margin:14vh 0;font-size:clamp(1.18rem,2.5vw,1.42rem);line-height:1.74}
.le-scene p{margin:0 0 1.2rem}
.le-scene:first-of-type{margin-top:8vh}
.le-w{display:inline-block;will-change:opacity,transform}
.le-em{color:var(--accent);font-style:italic}
.le-dark .le-em{text-shadow:0 0 18px color-mix(in srgb,var(--accent) 55%,transparent)}
.le-b-unveil .le-w{opacity:0;transform:translateY(.55em);
  transition:opacity .7s ease,transform .8s cubic-bezier(.2,.75,.2,1);transition-delay:calc(var(--i) * 26ms)}
.le-b-unveil.in .le-w{opacity:1;transform:none}
.le-b-fade .le-w{opacity:0;filter:blur(6px);transition:opacity 1.5s ease,filter 1.5s ease;transition-delay:calc(var(--i) * 48ms)}
.le-b-fade.in .le-w{opacity:.92;filter:none}
.le-b-drift{font-style:italic;opacity:.9}
.le-b-drift .le-w{opacity:0;transform:translateX(-.8em);transition:opacity 1s ease,transform 1.1s ease;transition-delay:calc(var(--i) * 40ms)}
.le-b-drift.in .le-w{opacity:.8;transform:none}
.le-b-float .le-w{opacity:0;transition:opacity .9s ease;transition-delay:calc(var(--i) * 34ms)}
.le-b-float.in .le-w{opacity:1;animation:le-bob 6s ease-in-out infinite;animation-delay:calc(var(--i) * -.4s)}
@keyframes le-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-.32em)}}
.le-b-tremor .le-w{opacity:0;transition:opacity .5s ease;transition-delay:calc(var(--i) * 18ms)}
.le-b-tremor.in .le-w{opacity:1;animation:le-tremor .22s steps(2) infinite}
@keyframes le-tremor{0%{transform:translate(0,0)}25%{transform:translate(.6px,-.5px)}50%{transform:translate(-.5px,.5px)}75%{transform:translate(.4px,.4px)}}
.le-b-write{font-family:var(--f-hand,"Snell Roundhand","Segoe Script","Bradley Hand",cursive);font-size:clamp(1.5rem,3.4vw,2rem);line-height:1.7}
.le-b-write .le-w{opacity:0;transition:opacity .01s linear;transition-delay:calc(var(--i) * 85ms)}
.le-b-write.in .le-w{opacity:1}
.le-b-write.in .le-w:last-child::after{content:"";display:inline-block;width:2px;height:1em;margin-left:2px;
  background:var(--accent);vertical-align:-.12em;animation:le-caret .9s steps(1) infinite}
@keyframes le-caret{0%,50%{opacity:1}51%,100%{opacity:0}}
.le-p{position:absolute;border-radius:50%}
.star{width:2px;height:2px;background:#fff;animation:le-tw var(--d,4s) ease-in-out infinite;animation-delay:var(--dl)}
@keyframes le-tw{0%,100%{opacity:.15}50%{opacity:.9}}
.rain{width:1px;height:14px;border-radius:0;background:linear-gradient(transparent,rgba(200,215,230,.6));
  animation:le-fall var(--d,1s) linear infinite;animation-delay:var(--dl)}
@keyframes le-fall{0%{transform:translateY(-16vh)}100%{transform:translateY(116vh)}}
.snow{width:4px;height:4px;background:rgba(255,255,255,.85);animation:le-snow var(--d,8s) linear infinite;animation-delay:var(--dl)}
@keyframes le-snow{0%{transform:translate(0,-10vh)}100%{transform:translate(4vw,112vh)}}
.bub{border:1px solid rgba(190,225,235,.45);background:rgba(190,225,235,.08);animation:le-rise var(--d,10s) ease-in infinite;animation-delay:var(--dl)}
@keyframes le-rise{0%{transform:translateY(8vh) translateX(0);opacity:0}10%{opacity:.7}90%{opacity:.5}100%{transform:translateY(-110vh) translateX(3vw);opacity:0}}
.mote{background:radial-gradient(circle,rgba(255,240,210,.9),transparent 70%);animation:le-float var(--d,16s) ease-in-out infinite;animation-delay:var(--dl)}
@keyframes le-float{0%,100%{transform:translate(0,0)}33%{transform:translate(2vw,-3vh)}66%{transform:translate(-2vw,2vh)}}
.ember{background:radial-gradient(circle,rgba(255,170,90,.95),transparent 70%);animation:le-rise var(--d,9s) ease-in infinite;animation-delay:var(--dl)}
.petal{border-radius:0;animation:le-petal var(--d,11s) linear infinite;animation-delay:var(--dl)}
@keyframes le-petal{0%{transform:translate(0,-10vh) rotate(0)}100%{transform:translate(6vw,112vh) rotate(360deg)}}
.fog{position:absolute;border-radius:50%;filter:blur(60px);background:rgba(180,190,210,.22);animation:le-drift var(--d,40s) ease-in-out infinite;animation-delay:var(--dl)}
@keyframes le-drift{0%,100%{transform:translate(0,0)}50%{transform:translate(8vw,-4vh)}}
.le-caustic{z-index:2;mix-blend-mode:screen;opacity:.5;
  background:radial-gradient(40% 24% at 30% 10%,rgba(140,220,230,.3),transparent 60%),radial-gradient(34% 22% at 70% 20%,rgba(120,200,220,.26),transparent 60%),radial-gradient(30% 20% at 50% 40%,rgba(150,230,240,.2),transparent 60%);
  animation:le-caus 14s ease-in-out infinite}
@keyframes le-caus{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-3vw,3vh) scale(1.08)}}
.le-flash{z-index:3;background:#dfe8ff;opacity:0;animation:le-flashk 9s linear infinite}
@keyframes le-flashk{0%,100%{opacity:0}1.2%{opacity:0}1.6%{opacity:.5}2%{opacity:.08}2.6%{opacity:.42}3.2%{opacity:0}}
.le-obj{position:fixed;z-index:3;pointer-events:none;will-change:transform}
.le-obj[data-drift=sway]{animation:le-sway 7s ease-in-out infinite}
@keyframes le-sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
.le-obj[data-drift=floaty]{animation:le-bob 7s ease-in-out infinite}
.le-obj[data-drift=rise]{animation:le-objrise 16s linear infinite}
@keyframes le-objrise{0%{transform:translateY(10vh);opacity:0}15%{opacity:.9}100%{transform:translateY(-80vh);opacity:0}}
.le-m-paper .le-reader{max-width:36rem;background:#f6ecd6;color:#3a2d1e;border-radius:3px;
  padding:7vh 3.2rem 10vh;margin:14vh auto;box-shadow:0 30px 80px rgba(0,0,0,.4),0 2px 0 rgba(0,0,0,.1);
  background-image:repeating-linear-gradient(transparent,transparent 2.1rem,rgba(80,60,40,.09) 2.1rem,rgba(80,60,40,.09) calc(2.1rem + 1px))}
.le-m-paper .le-title{font-family:var(--f-hand,"Snell Roundhand","Segoe Script",cursive);font-size:clamp(2.4rem,6vw,3.4rem)}
.le-m-paper .le-eyebrow{color:#9a7a4e}
.le-m-paper .le-em{color:#9c4221;text-shadow:none}
.le-m-paper .le-scene{font-size:1.2rem}
.le-m-film .le-bar{position:fixed;left:0;right:0;height:9vh;background:#000;z-index:7}
.le-m-film .le-top{top:0}.le-m-film .le-bot{bottom:0}
.le-m-film .le-eyebrow{letter-spacing:.4em}
@media(prefers-reduced-motion:reduce){
  .le-w{opacity:1!important;transform:none!important;filter:none!important;animation:none!important}
  .le-p,.le-obj,.le-caustic,.le-flash,.fog{animation:none!important}
}
`;
