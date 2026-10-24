"use client";

/**
 * COAST-STORM — a living world (D9). Responsive, aspect-robust: the scene is
 * composed as layers anchored to viewport fractions (sky / clouds / horizon
 * glow / sea / palms), not one stretched SVG, so it holds on phone and desktop.
 * The scroll arc (--cloud/--dusk/--rainO/--glowret) turns dusk → storm → calm;
 * words unveil; beats perform (swell/tremor/echo/whisper/heartbeat). Scoped
 * under `.coast-storm`.
 */

import { useEffect, useRef, type CSSProperties } from "react";

export type CoastStormBeat = {
  text: string;
  kind?: "lead" | "echo" | "whisper" | "swell" | "close" | "plain";
  doodle?: boolean;
  storm?: boolean;
};
/** Per-world visual spec. CoastStorm is one crafted renderer; the SPEC is the
 *  skin — background, horizon glow, accent, text tone, ambient and silhouette —
 *  so every world in the library (lib/living/worlds.ts) renders distinctly at
 *  the same craft bar. Absent fields fall back to the original coast-storm look. */
export type CoastStormSpec = {
  bg?: string;            // background gradient (world.ground)
  glow?: string;          // horizon glow gradient (world.warm)
  accent?: string;        // key-word / swell accent
  scheme?: "light" | "dark";
  ambient?: "rain" | "stars" | "fog" | "motes" | "none";
  silhouette?: string;    // SVG markup for the bottom silhouette (else palms; "none" to hide)
};
export type CoastStormProps = { eyebrow?: string; title?: string; dek?: string; beats: CoastStormBeat[]; spec?: CoastStormSpec };

export function CoastStorm({ eyebrow, title, dek, beats, spec }: CoastStormProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current; if (!root) return;
    const flash = root.querySelector<HTMLElement>(".cs-flash");
    const smooth = (x: number, a: number, b: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    let stormActive = false, lastBolt = 0;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight, p = h > 0 ? window.scrollY / h : 0;
      root.style.setProperty("--cloud", smooth(p, .22, .62).toFixed(3));
      root.style.setProperty("--dusk", (1 - smooth(p, .15, .5) * .92).toFixed(3));
      root.style.setProperty("--glowret", smooth(p, .82, 1).toFixed(3));
      root.style.setProperty("--rainO", (Math.min(smooth(p, .38, .62), 1) * (1 - smooth(p, .88, 1) * .7) * .7).toFixed(3));
      stormActive = p > .42 && p < .86;
    };
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll); onScroll();
    const bolt = window.setInterval(() => {
      if (flash && stormActive && Date.now() - lastBolt > 1400 && Math.random() < .5) { lastBolt = Date.now(); flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on"); }
    }, 700);

    const wrap = (el: Element) => {
      const walk = (n: Node, out: DocumentFragment | HTMLElement) => { n.childNodes.forEach((c) => {
        if (c.nodeType === 3) { (c.textContent ?? "").split(/(\s+)/).forEach((t) => { if (!t) return;
          if (/^\s+$/.test(t)) out.appendChild(document.createTextNode(t));
          else { const s = document.createElement("span"); s.className = "w"; s.textContent = t; out.appendChild(s); } }); }
        else if ((c as Element).nodeName === "svg") out.appendChild(c.cloneNode(true));
        else { const d = (c as Element).cloneNode(false) as HTMLElement; walk(c, d); out.appendChild(d); } }); };
      const f = document.createDocumentFragment(); walk(el, f); el.innerHTML = ""; el.appendChild(f);
    };
    const bs = [...root.querySelectorAll(".cs-beat")]; bs.forEach(wrap);
    const io = new IntersectionObserver((es) => { for (const e of es) { if (!e.isIntersecting) continue;
      const b = e.target as HTMLElement; b.querySelectorAll<HTMLElement>(".w").forEach((w, i) => { w.style.transitionDelay = `${i * 24}ms`; }); b.classList.add("seen"); io.unobserve(b); } },
      { threshold: .35, rootMargin: "0px 0px -14% 0px" });
    bs.forEach((b) => io.observe(b));
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); window.clearInterval(bolt); io.disconnect(); };
  }, [beats]);

  const renderBeat = (b: CoastStormBeat, i: number) => {
    const cls = ["cs-beat", b.kind && b.kind !== "plain" ? b.kind : "", b.storm ? "tremor" : ""].filter(Boolean).join(" ");
    return <p key={i} className={cls} {...(b.storm ? { "data-storm": "" } : {})}
      dangerouslySetInnerHTML={{ __html: (b.doodle ? WAVE : "") + b.text }} />;
  };

  const light = spec?.scheme === "light";
  const rootStyle: Record<string, string> = {};
  if (spec?.bg) rootStyle["--bg"] = spec.bg;
  if (spec?.glow) rootStyle["--glow"] = spec.glow;
  if (spec?.accent) rootStyle["--accent"] = spec.accent;
  if (light) { rootStyle["--text"] = "#2a2334"; rootStyle["--soft"] = "rgba(42,35,52,.66)"; rootStyle["--faint"] = "rgba(42,35,52,.42)"; }
  const sil = spec?.silhouette;                 // markup | "none" | undefined(→palms)
  const showStars = spec ? spec.ambient === "stars" : !light;   // default coast: stars
  const wet = spec ? spec.ambient === "rain" : true;            // default coast: rain + lightning

  return (
    <div className={`coast-storm${light ? " cs-light" : ""}`} ref={ref} style={rootStyle as CSSProperties}>
      {/* responsive scene layers (viewport-fraction anchored) */}
      {showStars ? <div className="cs-stars" /> : null}
      <div className="cs-clouds" />
      <div className="cs-horizon" />
      <div className="cs-sea"><svg className="cs-waves" viewBox="0 0 100 24" preserveAspectRatio="none"><path d="M0 8 Q12 3 25 8 T50 8 T75 8 T100 8" /><path d="M0 16 Q12 11 25 16 T50 16 T75 16 T100 16" /></svg></div>
      <div className="cs-glowret" />
      {sil === "none" ? null : sil
        ? <div className="cs-scene" dangerouslySetInnerHTML={{ __html: sil }} />
        : (<><div className="cs-palm cs-palm-l" dangerouslySetInnerHTML={{ __html: PALM }} /><div className="cs-palm cs-palm-r" dangerouslySetInnerHTML={{ __html: PALM }} /></>)}
      {wet ? <div className="cs-flash" /> : null}
      {wet ? <div className="cs-rain" /> : null}
      <div className="cs-vignette" />
      <div className="cs-grain" />

      <header className="cs-essay cs-hero">
        {eyebrow ? <p className="cs-eyebrow">{eyebrow}</p> : null}
        {title ? <h1 className="cs-title" dangerouslySetInnerHTML={{ __html: title }} /> : null}
        {dek ? <p className="cs-dek">{dek}</p> : null}
      </header>
      <article className="cs-essay cs-body">
        {beats.map(renderBeat)}
        <p className="cs-colophon">Living Page</p>
      </article>
      <style>{CSS}</style>
    </div>
  );
}
export default CoastStorm;

const WAVE = `<svg class="cs-doodle" viewBox="0 0 48 20"><path d="M2 12 q6 -10 12 0 q6 10 12 0 q6 -10 12 0"/></svg>`;
const PALM = `<svg viewBox="0 0 160 320" preserveAspectRatio="xMidYMax meet"><g fill="#0e0a20">
  <path d="M74 320 C70 240 66 172 74 122 C76 114 82 114 86 124 C78 172 76 240 82 320 Z"/>
  <path d="M80 122 C55 114 30 114 6 126 C30 120 54 122 80 130 Z"/>
  <path d="M80 122 C58 102 34 94 12 94 C34 102 56 110 80 124 Z"/>
  <path d="M80 122 C72 98 66 74 62 50 C70 76 78 100 84 122 Z"/>
  <path d="M80 122 C102 114 128 114 152 126 C128 120 104 122 80 130 Z"/>
  <path d="M80 122 C102 102 126 94 148 94 C126 102 104 110 80 124 Z"/>
  <path d="M80 122 C88 98 96 76 104 54 C94 80 86 100 80 124 Z"/>
  <circle cx="76" cy="126" r="3"/><circle cx="84" cy="128" r="3"/><circle cx="80" cy="132" r="3"/>
</g></svg>`;

const CSS = `
.coast-storm{ --cloud:0; --dusk:1; --rainO:0; --glowret:0;
  --text:#EFE9F4; --soft:rgba(239,233,244,.62); --faint:rgba(239,233,244,.34); --accent:#C7AEF2; --warm:#F2B06A;
  color:var(--text); font-family:var(--f-body,"Newsreader",Georgia,serif); line-height:1.78; min-height:100vh;
  background:var(--bg, linear-gradient(180deg,#1a1230 0%,#241a46 38%,#2e2250 66%,#3a2a4e 100%)); }

/* scene layers — fixed, anchored to viewport fractions so they hold at any aspect */
.coast-storm .cs-stars{ position:fixed; top:0; left:0; right:0; height:56%; z-index:0; pointer-events:none;
  opacity:calc((1 - var(--cloud))*.9);
  background-image:radial-gradient(1.4px 1.4px at 14% 22%,#fff,transparent),radial-gradient(1.1px 1.1px at 36% 12%,#fff,transparent),radial-gradient(1.3px 1.3px at 60% 26%,#fff,transparent),radial-gradient(1px 1px at 78% 14%,#fff,transparent),radial-gradient(1.1px 1.1px at 88% 34%,#fff,transparent),radial-gradient(1px 1px at 26% 40%,#fff,transparent),radial-gradient(1.2px 1.2px at 70% 42%,#fff,transparent); }
.coast-storm .cs-clouds{ position:fixed; top:0; left:0; right:0; height:46%; z-index:0; pointer-events:none;
  opacity:var(--cloud); background:linear-gradient(180deg,#0c0917 0%,#0c0917 42%,transparent 100%); }
.coast-storm .cs-horizon{ position:fixed; left:0; right:0; top:34%; height:30%; z-index:0; pointer-events:none;
  opacity:var(--dusk); background:var(--glow, radial-gradient(70% 120% at 50% 100%, rgba(244,168,94,.85), rgba(197,107,122,.32) 42%, transparent 72%)); }
/* a world-provided full-scene silhouette layer (e.g. a city street), in place of the palms */
.coast-storm .cs-scene{ position:fixed; inset:0; z-index:0; pointer-events:none; }
.coast-storm .cs-scene svg{ position:absolute; inset:0; width:100%; height:100%; display:block; }
/* light worlds: dark text, drop the dark sea/vignette weight */
.coast-storm.cs-light .cs-sea{ background:linear-gradient(180deg, rgba(255,255,255,.12), transparent); }
.coast-storm.cs-light .cs-vignette{ background:radial-gradient(120% 90% at 50% 40%, transparent 60%, rgba(60,40,20,.18)); }
.coast-storm.cs-light .cs-clouds{ background:linear-gradient(180deg, rgba(255,255,255,.5) 0%, transparent 100%); }
.coast-storm .cs-sea{ position:fixed; left:0; right:0; top:64%; bottom:0; z-index:0; pointer-events:none;
  background:linear-gradient(180deg,#1c1838,#141130); }
.coast-storm .cs-waves{ position:absolute; top:6%; left:0; width:100%; height:40px; opacity:.3; }
.coast-storm .cs-waves path{ fill:none; stroke:#8a90c0; stroke-width:.5; vector-effect:non-scaling-stroke; animation:cs-sway 6s ease-in-out infinite alternate; }
@keyframes cs-sway{ from{transform:translateX(0)} to{transform:translateX(-10px)} }
.coast-storm .cs-glowret{ position:fixed; left:0; right:0; bottom:0; height:42%; z-index:0; pointer-events:none;
  opacity:var(--glowret); background:radial-gradient(60% 120% at 50% 100%, rgba(242,176,106,.5), transparent 70%); }
.coast-storm .cs-palm{ position:fixed; bottom:0; z-index:0; pointer-events:none; height:min(48vh,440px); }
.coast-storm .cs-palm svg{ height:100%; display:block; }
.coast-storm .cs-palm-l{ left:-1.5vw; }
.coast-storm .cs-palm-r{ right:-1.5vw; height:min(42vh,380px); transform:scaleX(-1); }

.coast-storm .cs-flash{ position:fixed; inset:0; z-index:1; pointer-events:none; opacity:0;
  background:radial-gradient(70% 50% at 50% 24%, rgba(226,232,255,.9), rgba(200,210,255,.2) 40%, transparent 70%); }
.coast-storm .cs-flash.on{ animation:cs-flash .5s ease; }
@keyframes cs-flash{ 0%{opacity:0} 8%{opacity:.9} 16%{opacity:.2} 24%{opacity:.75} 100%{opacity:0} }
.coast-storm .cs-rain{ position:fixed; inset:0; z-index:1; pointer-events:none; opacity:var(--rainO);
  background-image:repeating-linear-gradient(104deg, transparent 0 18px, rgba(185,194,224,.22) 18px 19px); background-size:190px 190px; animation:cs-rainmove .6s linear infinite; }
@keyframes cs-rainmove{ from{background-position:0 0} to{background-position:-34px 190px} }
.coast-storm .cs-vignette{ position:fixed; inset:0; z-index:1; pointer-events:none; background:radial-gradient(120% 90% at 50% 40%, transparent 54%, rgba(8,5,18,.6)); }
.coast-storm .cs-grain{ position:fixed; inset:0; z-index:5; opacity:.05; pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"); }

.coast-storm .cs-essay{ max-width:34rem; margin:0 auto; padding:0 1.7rem; position:relative; z-index:2; }
.coast-storm .cs-hero{ min-height:100vh; display:flex; flex-direction:column; justify-content:flex-end; padding-bottom:12vh; }
.coast-storm .cs-body{ padding-top:16vh; padding-bottom:42vh; }
.coast-storm .cs-eyebrow{ font-family:var(--f-mono,"Space Mono",monospace); font-size:.62rem; letter-spacing:.38em; text-transform:uppercase; color:var(--faint); }
.coast-storm .cs-title{ font-family:var(--f-disp,"Instrument Serif",Georgia,serif); font-size:clamp(2.9rem,9vw,4.8rem); line-height:1; margin:.5rem 0 0; text-shadow:0 2px 50px rgba(0,0,0,.5); }
.coast-storm .cs-dek{ color:var(--soft); font-style:italic; margin-top:1rem; }
.coast-storm .cs-beat{ font-size:clamp(1.22rem,2.6vw,1.5rem); margin:0 0 11vh; max-width:32rem; position:relative; text-shadow:0 1px 20px rgba(8,5,20,.7); }
.coast-storm .w{ display:inline-block; opacity:0; filter:blur(9px); transform:translateY(14px); transition:opacity .62s ease, filter .62s ease, transform .62s cubic-bezier(.2,.8,.3,1); }
.coast-storm .cs-beat.seen .w{ opacity:1; filter:blur(0); transform:none; }
.coast-storm .em{ color:var(--accent); }
.coast-storm .echo{ color:var(--soft); font-style:italic; } .coast-storm .echo .w{ transition-duration:.9s; }
.coast-storm .whisper{ font-size:1.04rem; color:var(--soft); }
.coast-storm .swell{ font-family:var(--f-disp,"Instrument Serif",Georgia,serif); font-size:clamp(2.4rem,7vw,3.9rem); line-height:1.06; color:var(--accent); max-width:15ch; }
.coast-storm .cs-doodle{ position:absolute; left:-54px; top:.25em; width:40px; opacity:0; transition:opacity 1.2s .3s ease; }
.coast-storm .cs-beat.seen .cs-doodle{ opacity:.75; }
.coast-storm .cs-doodle path{ stroke:var(--accent); stroke-width:2; fill:none; stroke-linecap:round; stroke-dasharray:1; stroke-dashoffset:1; }
.coast-storm .cs-beat.seen .cs-doodle path{ animation:cs-draw 1.5s ease .4s forwards; }
@keyframes cs-draw{ to{stroke-dashoffset:0} }
.coast-storm .cs-beat.seen.tremor .w{ animation:cs-tremor .24s infinite; }
@keyframes cs-tremor{ 0%,100%{transform:translate(0,0)} 25%{transform:translate(-1.2px,1px)} 50%{transform:translate(1.2px,-1px)} 75%{transform:translate(-1px,-1.2px)} }
.coast-storm .abba{ color:var(--warm); animation:cs-shimmer 2.2s ease-in-out infinite; }
@keyframes cs-shimmer{ 0%,100%{opacity:.7; letter-spacing:0} 50%{opacity:1; letter-spacing:.06em} }
.coast-storm .hb{ display:inline-block; color:var(--warm); animation:cs-hb 1.15s ease-in-out infinite; }
@keyframes cs-hb{ 0%,100%{transform:scale(1)} 15%{transform:scale(1.4)} 30%{transform:scale(1)} }
.coast-storm .cs-colophon{ font-family:var(--f-mono,"Space Mono",monospace); font-size:.6rem; letter-spacing:.3em; text-transform:uppercase; color:var(--faint); margin-top:5vh; }
@media (prefers-reduced-motion:reduce){ .coast-storm .cs-rain,.coast-storm .cs-waves path,.coast-storm .abba,.coast-storm .hb{ animation:none } .coast-storm .w{opacity:1;filter:none;transform:none} }
`;
