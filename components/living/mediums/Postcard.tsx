"use client";

/**
 * POSTCARD — a MEDIUM (D10 generative): the story becomes a found travel
 * memory. Fed by `postcardInput(scene)` — the lead is the title/opening, the
 * body beats are typewriter blocks with an emphasis word hand-underlined, the
 * climax is the red handwritten line, the recurring motif becomes the postmark
 * place + photo caption. Works on any story. Scoped under `.pc`.
 */

import type { PostcardInput } from "@/lib/living/cast";

function Underlined({ text, word }: { text: string; word?: string }) {
  if (!word) return <>{text}</>;
  const i = text.indexOf(word);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="pc-u">{word}
        <svg viewBox="0 0 100 8" preserveAspectRatio="none"><path d="M1 4 Q25 1 50 4 T99 4" /></svg>
      </span>
      {text.slice(i + word.length)}
    </>
  );
}

export function Postcard({ stampPlace, date, lead, blocks, scream, aside, caption }: PostcardInput) {
  return (
    <div className="pc">
      <div className="pc-desk" />
      <div className="pc-card">
        <div className="pc-divider" />
        <div className="pc-left">
          <p className="pc-meta">PAR AVION · correo aéreo</p>
          <p className="pc-lead">{lead}</p>
          {blocks.map((b, i) => (
            <p key={i} className="pc-block"><Underlined text={b.text} word={b.underline} /></p>
          ))}
          {scream ? <p className="pc-scream-line">I keep thinking: <span className="pc-scream">{scream}.</span></p> : null}
          {aside ? (
            <p className="pc-aside">
              <svg viewBox="0 0 70 30" width="54" height="24"><path d="M64 26 C40 24 14 18 6 4 M6 4 L6 16 M6 4 L18 8" /></svg> {aside}
            </p>
          ) : null}
          <div className="pc-spacer" />
          <div className="pc-footer">
            <svg className="pc-sketch" viewBox="0 0 150 90">
              <path d="M18 70 Q75 8 132 70" /><line x1="6" y1="70" x2="144" y2="70" />
              <circle cx="110" cy="30" r="10" /><path d="M40 70 l10 -22 l10 22" />
            </svg>
            {date ? <p className="pc-coords">{date}</p> : null}
          </div>
        </div>
        <div className="pc-right">
          <div className="pc-stamp"><div className="pc-stamp-in">
            <svg viewBox="0 0 60 50"><g fill="none" stroke="#9c3b2e" strokeWidth="2"><path d="M6 40 L18 18 L30 36 L40 12 L54 40" /></g><circle cx="46" cy="13" r="5" fill="#e0b24a" /></svg>
            <span className="pc-val">POR 85</span>
          </div></div>
          <div className="pc-postmark"><svg viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="40" strokeWidth="2" /><circle cx="55" cy="55" r="31" strokeWidth="1" />
            <text x="55" y="32" textAnchor="middle" fontSize="10" letterSpacing="2">{stampPlace}</text>
            <text x="55" y="84" textAnchor="middle" fontSize="8" letterSpacing="1">· POST ·</text>
            <text x="55" y="60" textAnchor="middle" fontSize="13" letterSpacing="1">{(date || "·").slice(0, 7)}</text>
            <g strokeWidth="1.4"><line x1="2" y1="46" x2="18" y2="48" /><line x1="2" y1="54" x2="18" y2="56" /><line x1="2" y1="62" x2="18" y2="64" /></g>
          </svg></div>
          <div className="pc-photo">
            <div className="pc-tape" />
            <svg viewBox="0 0 220 150"><rect x="0" y="0" width="220" height="150" fill="#cdb488" />
              <path d="M0 150 L0 96 L26 96 L26 70 L52 70 L52 96 L84 96 L84 60 L120 60 L120 96 L150 96 L150 78 L180 78 L180 96 L220 96 L220 150 Z" fill="#a98a5c" />
              <path d="M0 150 L0 120 L40 120 L40 104 L70 104 L70 120 L110 120 L110 110 L150 110 L150 120 L220 120 L220 150 Z" fill="#8a6a44" />
              <circle cx="186" cy="32" r="15" fill="#e4c477" /></svg>
            <p className="pc-cap">{caption}</p>
          </div>
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );
}
export default Postcard;

const CSS = `
.pc{ --ink:#3a2c1c; --soft:#6b5a44; --red:#9c3b2e; --blue:#2f4a6b;
  --type:"Courier New",Courier,monospace; --hand:"Snell Roundhand","Bradley Hand","Segoe Script","Comic Sans MS",cursive;
  position:relative; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:6vh 4vw;
  background:radial-gradient(120% 90% at 50% 20%, #3a332b, #211c17 70%, #171310 100%); font-family:var(--type); }
.pc-desk{ position:fixed; inset:0; z-index:0; opacity:.22; pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"); }
.pc-card{ position:relative; z-index:1; width:min(720px,94vw); display:flex; gap:26px; padding:30px 34px;
  background:radial-gradient(60% 50% at 16% 20%, rgba(150,110,60,.12), transparent 60%),radial-gradient(44% 44% at 88% 82%, rgba(120,80,40,.12), transparent 60%),linear-gradient(135deg,#f6edd7,#efe2c6 60%,#e8d6b4);
  border-radius:4px; transform:rotate(-1.2deg); box-shadow:0 30px 60px rgba(0,0,0,.5), 0 2px 0 rgba(255,255,255,.3) inset, 0 0 0 1px rgba(120,90,50,.25) inset; }
.pc-card::after{ content:""; position:absolute; inset:0; pointer-events:none; opacity:.4; mix-blend-mode:multiply; border-radius:4px;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>"); }
.pc-left{ flex:1.3; display:flex; flex-direction:column; min-width:0; position:relative; z-index:3; }
.pc-right{ flex:1; position:relative; min-width:150px; min-height:300px; z-index:3; }
.pc-divider{ position:absolute; top:6%; bottom:8%; left:56%; width:2px; background:rgba(120,90,50,.2); z-index:2; }
.pc-meta{ font-size:11px; color:var(--soft); letter-spacing:.6px; margin-bottom:14px; }
.pc-lead{ font-family:var(--hand); font-size:clamp(22px,3vw,30px); color:var(--ink); line-height:1.3; margin-bottom:16px; }
.pc-block{ font-family:var(--type); font-size:13px; line-height:1.72; color:var(--ink); margin-bottom:14px; max-width:34ch; }
.pc-scream-line{ font-family:var(--type); font-size:13px; line-height:1.6; color:var(--ink); }
.pc-scream{ font-family:var(--hand); color:var(--red); font-size:1.4em; }
.pc-u{ position:relative; white-space:nowrap; }
.pc-u svg{ position:absolute; left:-2px; right:-2px; bottom:-6px; width:calc(100% + 4px); height:8px; overflow:visible; }
.pc-u path{ stroke:var(--red); stroke-width:2; fill:none; stroke-linecap:round; stroke-dasharray:1; stroke-dashoffset:1; animation:pc-draw 1s ease 1.4s forwards; }
.pc-aside{ font-family:var(--hand); color:var(--blue); font-size:18px; margin-top:6px; display:flex; align-items:center; gap:6px; opacity:0; animation:pc-fade .8s ease 1.8s forwards; }
.pc-aside svg path{ stroke:var(--blue); stroke-width:1.6; fill:none; stroke-linecap:round; }
@keyframes pc-draw{ to{stroke-dashoffset:0} } @keyframes pc-fade{ to{opacity:1} }
.pc-spacer{ flex:1; min-height:18px; }
.pc-footer{ display:flex; align-items:flex-end; gap:16px; }
.pc-sketch{ width:118px; flex:none; }
.pc-sketch path,.pc-sketch line,.pc-sketch circle{ stroke:#5a4632; stroke-width:1.6; fill:none; stroke-linecap:round; }
.pc-coords{ font-family:var(--hand); font-size:15px; color:var(--soft); padding-bottom:6px; }
.pc-stamp{ position:absolute; top:0; right:0; width:80px; height:96px; background:#e9e0c8; padding:5px; transform:rotate(4deg);
  filter:drop-shadow(0 4px 8px rgba(0,0,0,.3)); -webkit-mask-image:radial-gradient(circle at 6px 6px, transparent 3px, #000 3.5px); -webkit-mask-size:11px 11px; mask-image:radial-gradient(circle at 6px 6px, transparent 3px, #000 3.5px); mask-size:11px 11px; z-index:4; }
.pc-stamp-in{ border:1px solid var(--red); height:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; padding:5px; }
.pc-stamp-in svg{ width:100%; } .pc-val{ font-size:9px; color:var(--red); font-weight:700; letter-spacing:.5px; }
.pc-postmark{ position:absolute; top:62px; right:4px; width:100px; height:100px; opacity:.72; transform:rotate(-12deg); z-index:5; }
.pc-postmark svg{ width:100%; } .pc-postmark circle,.pc-postmark line{ stroke:var(--red); fill:none; } .pc-postmark text{ fill:var(--red); font-family:var(--type); font-weight:700; }
.pc-photo{ position:absolute; left:0; bottom:0; width:92%; transform:rotate(3deg); background:#fbf6ea; padding:8px 8px 24px; box-shadow:0 10px 22px rgba(0,0,0,.35); z-index:3; }
.pc-photo svg{ display:block; width:100%; opacity:.95; }
.pc-cap{ font-family:var(--hand); font-size:13px; color:var(--soft); text-align:center; margin-top:4px; }
.pc-tape{ position:absolute; top:-9px; left:50%; transform:translateX(-50%) rotate(-4deg); width:64px; height:20px; background:rgba(214,196,150,.55); box-shadow:0 1px 3px rgba(0,0,0,.15); }
@media (max-width:560px){ .pc-card{ flex-direction:column; } .pc-right{ min-height:260px; } }
`;
