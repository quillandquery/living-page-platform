"use client";

/**
 * ILLUMINATED MANUSCRIPT — a MEDIUM (D10 generative): modern writing rendered as
 * a sacred text. Fed by `manuscriptInput(scene)` — the title is the heading, the
 * first letter is an illuminated drop cap, emphasis words + the motif are
 * rubricated (red small-caps), the motif becomes marginalia. The illumination is
 * generative on any text; the witty medieval rewording is a future brain
 * feature. Scoped under `.ms`.
 */

import type { ManuscriptInput } from "@/lib/living/cast";

export function Manuscript({ title, dropcap, rest, paras, marginNote, dragonLabel }: ManuscriptInput) {
  return (
    <div className="ms">
      <div className="ms-page">
        <div className="ms-frame" />
        <div className="ms-corner tl"><svg viewBox="0 0 46 46"><path d="M2 44 C2 20 20 2 44 2" /><path d="M8 44 C8 24 24 8 44 8" /><circle className="leaf" cx="14" cy="14" r="5" /></svg></div>
        <div className="ms-corner tr"><svg viewBox="0 0 46 46"><path d="M2 44 C2 20 20 2 44 2" /><path d="M8 44 C8 24 24 8 44 8" /><circle className="leaf" cx="14" cy="14" r="5" /></svg></div>
        <div className="ms-corner bl"><svg viewBox="0 0 46 46"><path d="M2 44 C2 20 20 2 44 2" /><path d="M8 44 C8 24 24 8 44 8" /><circle className="leaf" cx="14" cy="14" r="5" /></svg></div>
        <div className="ms-corner br"><svg viewBox="0 0 46 46"><path d="M2 44 C2 20 20 2 44 2" /><path d="M8 44 C8 24 24 8 44 8" /><circle className="leaf" cx="14" cy="14" r="5" /></svg></div>

        <p className="ms-eyebrow">· CAP. I ·</p>
        <h1 className="ms-title">{title}</h1>
        <svg className="ms-rule" viewBox="0 0 120 14"><path d="M2 7 H48" /><path d="M72 7 H118" /><circle cx="60" cy="7" r="4" /><path d="M52 7 L60 2 L68 7 L60 12 Z" fill="none" stroke="#b58a2e" strokeWidth="1.4" /></svg>

        <div className="ms-body">
          <div className="ms-drop"><i /><span>{dropcap}</span></div>
          <p className="ms-p">{rest}</p>
          {paras.map((p, i) => <p key={i} className="ms-p" dangerouslySetInnerHTML={{ __html: p.html }} />)}
        </div>

        {marginNote ? <>
          <svg className="ms-margin ms-manicule" viewBox="0 0 54 40"><path d="M2 20 h20 v-7 l10 7 v-7 l10 7 v-7 l8 10 -8 10 v-6 l-10 6 v-6 l-10 6 v-6 h-20 Z" /></svg>
          <span className="ms-mnote">{marginNote}</span>
        </> : null}
        {dragonLabel ? <>
          <svg className="ms-margin ms-dragon" viewBox="0 0 66 70"><path className="body" d="M10 60 q-6 -20 10 -30 q18 -12 34 -6 q-10 6 -14 16 q14 -4 20 6 q-12 2 -18 12 q-16 10 -32 -8 Z" /><path d="M10 60 q-6 -20 10 -30 q18 -12 34 -6 q-10 6 -14 16 q14 -4 20 6 q-12 2 -18 12 q-16 10 -32 -8 Z" /><circle cx="48" cy="26" r="1.6" fill="#27406e" /></svg>
          <span className="ms-dlabel">{dragonLabel}</span>
        </> : null}

        <p className="ms-colophon">· HERE ENDS THE LESSON ·</p>
      </div>
      <style>{CSS}</style>
    </div>
  );
}
export default Manuscript;

const CSS = `
.ms{ --ink:#2a2018; --red:#9c2b22; --blue:#27406e; --gold:#b58a2e; --gold2:#e8c96a;
  --disp:"Luminari","Papyrus","Herculanum","Trattatello",Georgia,serif;
  --body:"Hoefler Text","Iowan Old Style","Palatino Linotype",Georgia,serif;
  position:relative; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:5vh 4vw; color:var(--ink);
  background:radial-gradient(60% 50% at 50% 0%, #2a2218, #1a150f 80%); font-family:var(--body); }
.ms-page{ position:relative; width:min(760px,95vw); padding:54px 56px 60px;
  background:radial-gradient(70% 60% at 20% 10%, rgba(180,140,80,.14), transparent 60%),radial-gradient(60% 60% at 90% 90%, rgba(150,110,60,.16), transparent 60%),linear-gradient(135deg,#f3e8cd,#ecdfbf 60%,#e2d1a9);
  box-shadow:0 30px 70px rgba(0,0,0,.55); }
.ms-page::after{ content:""; position:absolute; inset:0; pointer-events:none; opacity:.5; mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>"); }
.ms-frame{ position:absolute; inset:18px; border:2px solid var(--gold); pointer-events:none; }
.ms-frame::before{ content:""; position:absolute; inset:5px; border:1px solid var(--red); }
.ms-corner{ position:absolute; width:46px; height:46px; } .ms-corner svg{ width:100%; height:100%; }
.ms-corner.tl{ top:4px; left:4px; } .ms-corner.tr{ top:4px; right:4px; transform:scaleX(-1); }
.ms-corner.bl{ bottom:4px; left:4px; transform:scaleY(-1); } .ms-corner.br{ bottom:4px; right:4px; transform:scale(-1,-1); }
.ms-corner path{ fill:none; stroke:var(--red); stroke-width:2.2; stroke-linecap:round; }
.ms-corner .leaf{ fill:var(--gold2); stroke:var(--gold); stroke-width:1.2; }
.ms-eyebrow{ font-family:var(--disp); text-align:center; color:var(--red); letter-spacing:4px; font-size:13px; position:relative; z-index:2; }
.ms-title{ font-family:var(--disp); text-align:center; font-size:clamp(26px,5.2vw,44px); color:var(--ink); line-height:1.1; margin:6px 0 4px; position:relative; z-index:2; }
.ms-rule{ width:120px; height:14px; margin:8px auto 26px; display:block; }
.ms-rule path{ stroke:var(--gold); stroke-width:1.6; fill:none; } .ms-rule circle{ fill:var(--red); }
.ms-body{ position:relative; z-index:2; font-size:16px; line-height:1.78; text-align:justify; hyphens:auto; }
.ms-drop{ float:left; width:88px; height:88px; margin:4px 16px 2px 0; position:relative;
  background:linear-gradient(135deg,#f0d987,#c9a54a); border:3px solid var(--red); box-shadow:0 2px 0 var(--gold); }
.ms-drop span{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:var(--disp); font-size:60px; color:#5a1a14; }
.ms-drop i{ position:absolute; inset:6px; border:1px solid rgba(156,43,34,.5); }
.ms-p{ margin-bottom:14px; }
.ms-rubric{ color:var(--red); font-variant:small-caps; letter-spacing:.5px; }
.ms-margin{ position:absolute; z-index:3; }
.ms-manicule{ right:16px; top:42%; width:54px; }
.ms-manicule path{ fill:#f0e4c6; stroke:var(--ink); stroke-width:1.4; stroke-linejoin:round; }
.ms-mnote{ font-family:var(--disp); font-size:11px; color:var(--red); position:absolute; right:14px; top:calc(42% + 54px); writing-mode:vertical-rl; }
.ms-dragon{ left:10px; bottom:60px; width:66px; }
.ms-dragon path{ fill:none; stroke:var(--blue); stroke-width:2; stroke-linecap:round; stroke-linejoin:round; } .ms-dragon .body{ fill:rgba(39,64,110,.12); }
.ms-dlabel{ font-family:var(--disp); font-size:10px; color:var(--blue); position:absolute; left:8px; bottom:46px; }
.ms-colophon{ font-family:var(--disp); text-align:center; color:var(--gold); font-size:11px; letter-spacing:3px; margin-top:22px; position:relative; z-index:2; }
`;
