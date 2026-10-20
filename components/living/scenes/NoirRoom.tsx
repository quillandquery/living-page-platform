"use client";

/**
 * NOIR-ROOM — a living world (D9), for thrillers / dread. A cold, deep room:
 * venetian-blind light, a red "dread" glow that grows as you read, cinematic
 * letterbox + grain. Its signature element is a PHONE co-located with the words
 * that stacks missed calls as those beats arrive; the climax word (BEHIND) runs
 * a tremor+swell, and the escape line (She ran) streaks. Words unveil. Scoped
 * under `.noir-room`. Ported 1:1 from the verified noir-world prototype.
 */

import { useEffect, useRef } from "react";

export type NoirCall = { who: string; sub: string; danger?: boolean };
export type NoirBeat = {
  text: string;
  kind?: "lead" | "whisper" | "behind" | "run" | "plain";
  call?: NoirCall;     // reveals a phone notification when this beat is seen
  tremor?: boolean;
};
export type NoirRoomProps = { eyebrow?: string; title?: string; dek?: string; beats: NoirBeat[] };

export function NoirRoom({ eyebrow, title, dek, beats }: NoirRoomProps) {
  const ref = useRef<HTMLDivElement>(null);

  // which beats carry phone calls (the phone is rendered at the first one)
  const callIdx: number[] = [];
  beats.forEach((b, i) => { if (b.call) callIdx.push(i); });
  const firstCall = callIdx[0] ?? -1;

  useEffect(() => {
    const root = ref.current; if (!root) return;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight, p = h > 0 ? window.scrollY / h : 0;
      root.style.setProperty("--p", Math.max(0, Math.min(1, p)).toFixed(3));
    };
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll); onScroll();

    const wrap = (el: Element) => {
      const walk = (n: Node, out: DocumentFragment | HTMLElement) => { n.childNodes.forEach((c) => {
        if (c.nodeType === 3) { (c.textContent ?? "").split(/(\s+)/).forEach((t) => { if (!t) return;
          if (/^\s+$/.test(t)) out.appendChild(document.createTextNode(t));
          else { const s = document.createElement("span"); s.className = "w"; s.textContent = t; out.appendChild(s); } }); }
        else { const e = c as Element;
          // keep summoned elements (phone, climax spans) intact — don't word-split them
          if (e.classList && (e.classList.contains("nr-phone") || e.classList.contains("nr-behind") || e.classList.contains("nr-ran") || e.classList.contains("nr-cold")))
            out.appendChild(e.cloneNode(true));
          else { const d = e.cloneNode(false) as HTMLElement; walk(c, d); out.appendChild(d); } } }); };
      const f = document.createDocumentFragment(); walk(el, f); el.innerHTML = ""; el.appendChild(f);
    };
    const bs = [...root.querySelectorAll(".nr-beat")]; bs.forEach(wrap);

    const io = new IntersectionObserver((es) => { for (const e of es) { if (!e.isIntersecting) continue;
      const b = e.target as HTMLElement;
      b.querySelectorAll<HTMLElement>(".w").forEach((w, i) => { w.style.transitionDelay = `${i * 26}ms`; });
      b.classList.add("seen");
      const call = b.getAttribute("data-call");
      if (call) {
        const pill = root.querySelector<HTMLElement>(`.nr-notif[data-n="${call}"]`);
        if (pill) pill.classList.add("show");
        if (pill?.classList.contains("danger")) root.querySelector<HTMLElement>(".nr-phone")?.classList.add("buzz");
      }
      io.unobserve(b);
    } }, { threshold: .4, rootMargin: "0px 0px -12% 0px" });
    bs.forEach((b) => io.observe(b));

    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); io.disconnect(); };
  }, [beats]);

  const phoneHtml = () => {
    const pills = callIdx.map((bi, n) => {
      const c = beats[bi].call!;
      return `<span class="nr-notif${c.danger ? " danger" : ""}" data-n="${n + 1}"><span class="nr-who">${c.who}</span><span class="nr-sub">${c.sub}</span></span>`;
    }).join("");
    return `<span class="nr-phone"><span class="nr-scr">${pills}</span></span>`;
  };

  const renderBeat = (b: NoirBeat, i: number) => {
    const cls = ["nr-beat", b.kind && b.kind !== "plain" ? b.kind : "", b.tremor ? "tremor" : ""].filter(Boolean).join(" ");
    // the phone is emitted inline at the first call-beat; its own text follows
    const callN = callIdx.indexOf(i);
    const html = (i === firstCall ? phoneHtml() : "") + b.text;
    return <p key={i} className={cls}
      {...(callN >= 0 ? { "data-call": String(callN + 1) } : {})}
      dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="noir-room" ref={ref}>
      <div className="nr-ground" />
      <div className="nr-blinds" />
      <div className="nr-dread" />
      <div className="nr-vignette" />
      <div className="nr-bar t" />
      <div className="nr-bar b" />
      <div className="nr-grain" />

      <header className="nr-essay nr-hero">
        {eyebrow ? <p className="nr-eyebrow">{eyebrow}</p> : null}
        {title ? <h1 className="nr-title" dangerouslySetInnerHTML={{ __html: title }} /> : null}
        {dek ? <p className="nr-dek">{dek}</p> : null}
      </header>
      <article className="nr-essay nr-body">
        {beats.map(renderBeat)}
        <p className="nr-colophon">Living Page</p>
      </article>
      <style>{CSS}</style>
    </div>
  );
}
export default NoirRoom;

const CSS = `
.noir-room{ --p:0; --text:#E7E8EC; --soft:rgba(231,232,236,.5); --faint:rgba(231,232,236,.26);
  --cold:#6FB4CC; --red:#E23A2E;
  color:var(--text); font-family:var(--f-body,"Newsreader",Georgia,serif); line-height:1.75; min-height:100vh;
  background:#06070c; }

.noir-room .nr-ground{ position:fixed; inset:0; z-index:0; pointer-events:none;
  background:radial-gradient(90% 60% at 72% 16%, rgba(90,120,150,.12), transparent 55%),
    linear-gradient(180deg,#05070c,#0a0f16 68%,#0e141c 100%); }
.noir-room .nr-blinds{ position:fixed; inset:0; z-index:0; pointer-events:none; opacity:.5;
  background:repeating-linear-gradient(98deg, transparent 0 26px, rgba(140,170,195,.05) 26px 30px); }
.noir-room .nr-dread{ position:fixed; inset:0; z-index:0; pointer-events:none; opacity:calc(var(--p)*.6);
  background:radial-gradient(70% 50% at 50% 60%, rgba(226,58,46,.14), transparent 62%); }
.noir-room .nr-vignette{ position:fixed; inset:0; z-index:1; pointer-events:none;
  background:radial-gradient(120% 90% at 50% 42%, transparent 46%, rgba(0,0,0,.72)); }
.noir-room .nr-bar{ position:fixed; left:0; right:0; height:6vh; background:#000; z-index:6; pointer-events:none; }
.noir-room .nr-bar.t{ top:0; } .noir-room .nr-bar.b{ bottom:0; }
.noir-room .nr-grain{ position:fixed; inset:0; z-index:5; opacity:.06; pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"); }

.noir-room .nr-essay{ max-width:33rem; margin:0 auto; padding:0 1.7rem; position:relative; z-index:2; }
.noir-room .nr-hero{ min-height:100vh; display:flex; flex-direction:column; justify-content:flex-end; padding-bottom:14vh; }
.noir-room .nr-body{ padding-top:10vh; padding-bottom:40vh; }
.noir-room .nr-eyebrow{ font-family:var(--f-mono,"Space Mono",monospace); font-size:.62rem; letter-spacing:.42em; text-transform:uppercase; color:var(--faint); }
.noir-room .nr-title{ font-family:var(--f-disp,"Instrument Serif",Georgia,serif); font-size:clamp(3rem,11vw,5rem); line-height:1; margin:.5rem 0 0; }
.noir-room .nr-dek{ color:var(--soft); font-style:italic; margin-top:1rem; }
.noir-room .nr-beat{ font-size:clamp(1.2rem,2.5vw,1.46rem); margin:0 0 10vh; max-width:30rem; position:relative; text-shadow:0 1px 16px rgba(0,0,0,.7); }
.noir-room .w{ display:inline-block; opacity:0; filter:blur(8px); transform:translateY(12px); transition:opacity .55s ease, filter .55s ease, transform .55s cubic-bezier(.2,.8,.3,1); }
.noir-room .nr-beat.seen .w{ opacity:1; filter:blur(0); transform:none; }
.noir-room .lead{ font-family:var(--f-disp,"Instrument Serif",Georgia,serif); font-size:clamp(1.6rem,3.6vw,2.1rem); line-height:1.3; }
.noir-room .whisper{ font-size:1.04rem; color:var(--soft); }
.noir-room .nr-cold{ color:var(--cold); }

/* the phone — co-located, stacking missed calls */
.noir-room .nr-phone{ display:block; width:136px; margin:0 0 1.6rem; background:#0b0d12; border-radius:22px; padding:16px 9px 16px; box-shadow:inset 0 0 0 1.5px #20232c, 0 18px 40px rgba(0,0,0,.6); position:relative; }
.noir-room .nr-phone::before{ content:""; position:absolute; top:8px; left:50%; transform:translateX(-50%); width:36%; height:4px; border-radius:3px; background:#20232c; }
.noir-room .nr-scr{ margin-top:14px; display:flex; flex-direction:column; gap:6px; }
.noir-room .nr-notif{ background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07); border-radius:10px; padding:6px 8px; font-family:var(--f-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif); display:flex; flex-direction:column; gap:2px; opacity:0; transform:translateY(-6px); transition:all .5s cubic-bezier(.2,.9,.3,1); }
.noir-room .nr-notif.show{ opacity:1; transform:none; }
.noir-room .nr-who{ font-size:.66rem; color:#cfd2d8; font-weight:600; }
.noir-room .nr-sub{ font-size:.56rem; color:#8a3b36; }
.noir-room .nr-notif.danger{ border-color:rgba(226,58,46,.5); background:rgba(226,58,46,.08); }
.noir-room .nr-notif.danger .nr-who{ color:var(--red); }
.noir-room .nr-phone.buzz{ animation:nr-buzz .12s infinite; }
@keyframes nr-buzz{ 0%,100%{transform:translate(0,0)} 50%{transform:translate(1px,-1px)} }

/* climax: BEHIND, and the run */
.noir-room .nr-behind{ font-family:var(--f-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif); font-weight:800; letter-spacing:.14em; font-size:clamp(2.6rem,11vw,5rem); color:var(--red); display:inline-block; }
.noir-room .nr-beat.seen .nr-behind{ animation:nr-tremor .2s infinite; }
.noir-room .nr-beat.seen.tremor .w{ animation:nr-tremor .22s infinite; }
@keyframes nr-tremor{ 0%,100%{transform:translate(0,0)} 25%{transform:translate(-2px,1px)} 50%{transform:translate(2px,-1px)} 75%{transform:translate(-1px,-2px)} }
.noir-room .nr-ran{ font-family:var(--f-disp,"Instrument Serif",Georgia,serif); font-size:clamp(3rem,10vw,5rem); display:inline-block; }
.noir-room .nr-beat.seen .nr-ran{ animation:nr-streak 1s ease forwards; }
@keyframes nr-streak{ 0%{transform:translateX(-26px); text-shadow:40px 0 24px rgba(231,232,236,.4); opacity:.2} 100%{transform:none; text-shadow:none; opacity:1} }
.noir-room .nr-colophon{ font-family:var(--f-mono,"Space Mono",monospace); font-size:.6rem; letter-spacing:.3em; text-transform:uppercase; color:var(--faint); margin-top:5vh; }
@media (prefers-reduced-motion:reduce){ .noir-room .nr-phone.buzz,.noir-room .nr-beat.seen .nr-behind,.noir-room .nr-beat.seen.tremor .w,.noir-room .nr-beat.seen .nr-ran{ animation:none } .noir-room .w{opacity:1;filter:none;transform:none} }
`;
