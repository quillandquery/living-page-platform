"use client";

/**
 * EVIDENCE BOARD — a MEDIUM (D10 generative): the story becomes a case file.
 * Fed by `evidenceInput(scene)` — each beat is a pinned card, an emphasis word
 * is red-circled, a question line becomes a sticky-note lead, the climax beat
 * is the red-thread hub. Works on any story. Scoped under `.ev`.
 */

import { useEffect, useRef } from "react";
import type { EvidenceInput } from "@/lib/living/cast";

function Circled({ text, word }: { text: string; word?: string }) {
  if (!word) return <>{text}</>;
  const i = text.indexOf(word);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="ev-circle">{word}
        <svg viewBox="0 0 90 40" preserveAspectRatio="none"><path d="M8 22 C6 6 84 6 82 22 C80 38 10 38 8 22" /></svg>
      </span>
      {text.slice(i + word.length)}
    </>
  );
}

export function EvidenceBoard({ caseTitle, cards, climax }: EvidenceInput) {
  const boardRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const board = boardRef.current, svg = svgRef.current;
    if (!board || !svg) return;
    const draw = () => {
      const b = board.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${board.clientWidth} ${board.clientHeight}`);
      svg.setAttribute("width", String(board.clientWidth));
      svg.setAttribute("height", String(board.clientHeight));
      svg.innerHTML = "";
      const pins = [...board.querySelectorAll<HTMLElement>(".ev-pin")];
      const hub = pins[climax];
      if (!hub) return;
      const c = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2]; };
      const [hx, hy] = c(hub);
      pins.forEach((p, i) => {
        if (i === climax) return;
        const [x, y] = c(p);
        const mx = (hx + x) / 2, my = (hy + y) / 2 + 34;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M${hx} ${hy} Q${mx} ${my} ${x} ${y}`);
        path.setAttribute("stroke", "#b2322a"); path.setAttribute("stroke-width", "2"); path.setAttribute("fill", "none");
        path.setAttribute("opacity", "0.8");
        svg.appendChild(path);
      });
    };
    const t = setTimeout(draw, 60);
    window.addEventListener("resize", draw);
    return () => { clearTimeout(t); window.removeEventListener("resize", draw); };
  }, [cards, climax]);

  return (
    <div className="ev">
      <div className="ev-grain" />
      <div className="ev-board" ref={boardRef}>
        <div className="ev-hdr">CASE FILE — N° 0447<small>SUBJECT: {caseTitle} · STATUS: OPEN</small></div>
        <svg className="ev-threads" ref={svgRef} />
        <div className="ev-grid">
          {cards.map((card, i) => (
            <div key={i} className={`ev-item${card.sticky ? " sticky" : ""}`} style={{ ["--rot" as string]: `${[-2, 2, -1.5, 2.5, -1, 1.5][i % 6]}deg` }}>
              <span className={`ev-pin${card.danger ? " red" : i % 2 ? " blue" : ""}`} />
              {card.sticky ? (
                <div className="ev-note">{card.text}</div>
              ) : (
                <div className={`ev-card${card.danger ? " danger" : ""}`}>
                  <div className="ev-label">{card.label}</div>
                  {card.danger ? <span className="ev-stamp">THE TURN</span> : null}
                  <p><Circled text={card.text} word={card.circle} /></p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );
}
export default EvidenceBoard;

const CSS = `
.ev{ --card:#f6f0e2; --ink:#241f19; --soft:#5e5648; --red:#c0392b;
  --type:"Courier New",Courier,monospace; --hand:"Bradley Hand","Snell Roundhand","Segoe Script","Comic Sans MS",cursive;
  position:relative; min-height:100vh; font-family:var(--type); color:var(--ink);
  background:radial-gradient(80% 60% at 30% 20%, #b8966a, transparent 60%),radial-gradient(70% 60% at 80% 80%, #9c7c52, transparent 60%),linear-gradient(135deg,#a9885c,#8f6f47); }
.ev-grain{ position:fixed; inset:0; z-index:0; opacity:.5; pointer-events:none; mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"); }
.ev-board{ position:relative; z-index:1; max-width:1000px; margin:0 auto; min-height:100vh; padding:40px 24px 80px; }
.ev-hdr{ display:block; width:max-content; margin:0 auto 34px; font-family:var(--type); color:#2a2118; letter-spacing:3px; font-size:13px; font-weight:700;
  background:#e8c15a; padding:6px 14px; transform:rotate(-1.5deg); box-shadow:0 3px 8px rgba(0,0,0,.25); }
.ev-hdr small{ display:block; font-weight:400; letter-spacing:1.5px; font-size:9px; color:#5a4a1e; }
.ev-threads{ position:absolute; inset:0; z-index:2; pointer-events:none; }
.ev-grid{ position:relative; z-index:3; display:flex; flex-wrap:wrap; gap:22px 34px; justify-content:center; align-items:flex-start; }
.ev-item{ position:relative; width:min(270px,80vw); transform:rotate(var(--rot)); padding-top:10px; }
.ev-pin{ position:absolute; left:50%; top:-2px; width:16px; height:16px; border-radius:50%; z-index:6; transform:translateX(-50%);
  background:radial-gradient(circle at 35% 30%, #ffcf8a, #c08a2e 60%, #7e5a1b); box-shadow:0 3px 5px rgba(0,0,0,.4); }
.ev-pin.red{ background:radial-gradient(circle at 35% 30%, #ff8a7a, #c0392b 60%, #7e241b); }
.ev-pin.blue{ background:radial-gradient(circle at 35% 30%, #8ab6e8, #2f6bb0 60%, #1a3d6b); }
.ev-card{ background:var(--card); padding:14px 16px; box-shadow:0 10px 22px rgba(0,0,0,.35); font-size:13px; line-height:1.6;
  background-image:repeating-linear-gradient(transparent 0 25px, rgba(60,80,120,.1) 25px 26px); }
.ev-card.danger{ box-shadow:0 10px 24px rgba(0,0,0,.4), 0 0 0 2px rgba(192,57,43,.5) inset; }
.ev-label{ font-size:9px; letter-spacing:2px; color:var(--soft); text-transform:uppercase; margin-bottom:6px; }
.ev-note{ font-family:var(--hand); color:#243; font-size:18px; background:#d8e8a8; padding:16px; box-shadow:0 8px 18px rgba(0,0,0,.3); }
.ev-stamp{ font-family:var(--type); color:var(--red); border:2px solid var(--red); display:inline-block; padding:2px 7px; font-size:10px; font-weight:700; letter-spacing:2px; transform:rotate(-8deg); opacity:.85; margin-bottom:6px; }
.ev-circle{ position:relative; white-space:nowrap; }
.ev-circle svg{ position:absolute; left:-10%; top:-30%; width:120%; height:160%; overflow:visible; pointer-events:none; }
.ev-circle path{ stroke:var(--red); stroke-width:2.4; fill:none; stroke-linecap:round; stroke-dasharray:1; stroke-dashoffset:1; animation:ev-draw 1s ease 1s forwards; }
@keyframes ev-draw{ to{stroke-dashoffset:0} }
`;
