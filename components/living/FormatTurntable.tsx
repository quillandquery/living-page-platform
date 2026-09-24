"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { FORMATS, type FormatKey } from "@/lib/formats";
import { LayoutEmblem } from "@/components/living/LayoutEmblem";

/** Accent, a one-word "feels", and a nickname per format — the turntable's
 *  cast list. Same accents FormatWheel used, so a format keeps its colour
 *  wherever it's picked from. */
const META: Record<FormatKey, { accent: string; feels: string; cls: string }> = {
  standard:  { accent: "#C89A5B", feels: "Balanced",  cls: "The Reader" },
  scrapbook: { accent: "#C9822F", feels: "Warm",       cls: "The Collector" },
  letter:    { accent: "#3B5168", feels: "Intimate",   cls: "The Confidant" },
  poster:    { accent: "#D23B2E", feels: "Loud",        cls: "The Shout" },
  ticket:    { accent: "#2E8B8B", feels: "Restless",   cls: "The Departure" },
  notebook:  { accent: "#3FA05C", feels: "Quiet",       cls: "The Field Notes" },
  gallery:   { accent: "#7A5C8A", feels: "Composed",   cls: "The Curator" },
  film:      { accent: "#8A8F98", feels: "Cinematic",  cls: "The Director" },
  ransom:    { accent: "#D2662E", feels: "Chaotic",     cls: "The Cut-Up" },
  marquee:   { accent: "#31C8D8", feels: "Electric",   cls: "The Marquee" },
  postcard:  { accent: "#A66A3B", feels: "Sunlit",      cls: "The Traveller" },
  listicle:  { accent: "#E4A020", feels: "Playful",     cls: "The Countdown" },
};

/**
 * TURNTABLE — layouts as lit, dimensional plates on a depth-carousel; an
 * avatar-select for the format, not a menu. Fully controlled by `value`:
 * clicking any plate (or an arrow) calls onSelect and the carousel re-centres
 * on it, same instant-pick contract as the wheel it replaces.
 */
export function FormatTurntable({
  formats, value, autoKey, onSelect,
}: { formats: FormatKey[]; value: FormatKey; autoKey: FormatKey; onSelect: (k: FormatKey) => void }) {
  const sel = Math.max(0, formats.indexOf(value));
  const n = formats.length;
  const m = META[value] ?? META.standard;
  const wrapRef = useRef<HTMLDivElement>(null);

  // drifting dust, generated once and cleaned up on unmount — imperative so
  // it never fights React over per-frame styles, and never runs on the server.
  useEffect(() => {
    const atmos = wrapRef.current?.querySelector<HTMLElement>(".ft-atmos");
    if (!atmos) return;
    const made: HTMLElement[] = [];
    for (let i = 0; i < 16; i++) {
      const s = 1 + Math.random() * 2.2;
      const el = document.createElement("span");
      el.className = "ft-mote";
      el.style.width = el.style.height = `${s}px`;
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${40 + Math.random() * 60}%`;
      el.style.animationDuration = `${7 + Math.random() * 10}s`;
      el.style.animationDelay = `${-Math.random() * 12}s`;
      atmos.appendChild(el);
      made.push(el);
    }
    return () => made.forEach((el) => el.remove());
  }, []);

  const surprise = () => {
    if (n < 2) return;
    let i = Math.floor(Math.random() * n);
    if (formats[i] === value) i = (i + 1) % n;
    onSelect(formats[i]);
  };

  return (
    <div className="ft-wrap" ref={wrapRef} style={{ "--ac": m.accent } as CSSProperties}>
      <div className="ft-atmos" aria-hidden="true">
        <span className="ft-ray" /><span className="ft-ray" /><span className="ft-ray" /><span className="ft-ray" />
      </div>
      <div className="ft-pool" aria-hidden="true" />

      <div className="ft-hud ft-hud-tl"><span className="ft-hud-l">Format</span><span className="ft-hud-v">{String(sel + 1).padStart(2, "0")} · {String(n).padStart(2, "0")}</span></div>
      <div className="ft-hud ft-hud-tr"><span className="ft-hud-l">Feels</span><span className="ft-hud-v">{m.feels}</span></div>

      <div className="ft-stage">
        <button type="button" className="ft-nav ft-nav-l" aria-label="Previous format" onClick={() => onSelect(formats[(sel - 1 + n) % n])}>&larr;</button>

        <div className="ft-turn">
          {formats.map((k, i) => {
            const off = i - sel;
            const a = Math.abs(off);
            const accent = META[k]?.accent ?? "#C89A5B";
            const style = {
              "--ac": accent,
              "--off": off,
              "--sc": i === sel ? 1 : Math.max(0.5, 0.74 - (a - 1) * 0.07),
              "--op": a > 3 ? 0 : i === sel ? 1 : Math.max(0.2, 0.6 - (a - 1) * 0.14),
              "--z": 60 - a,
            } as CSSProperties;
            return (
              <button
                key={k} type="button"
                className={`ft-tcard${i === sel ? " is-sel" : ""}`}
                style={style}
                onClick={() => onSelect(k)}
                aria-pressed={i === sel}
                aria-label={FORMATS[k].label}
              >
                <span className="ft-temb"><LayoutEmblem k={k} /></span>
                {i !== sel && <span className="ft-tlabel">{FORMATS[k].label}</span>}
              </button>
            );
          })}
        </div>

        <button type="button" className="ft-nav ft-nav-r" aria-label="Next format" onClick={() => onSelect(formats[(sel + 1) % n])}>&rarr;</button>
      </div>
      <div className="ft-podium" aria-hidden="true" />

      <div className="ft-title">
        <div className="ft-eyebrow">{m.cls}</div>
        <div className="ft-big">
          {[...FORMATS[value].label].map((c, i) => (
            <span key={i} className="ft-lt" style={{ animationDelay: `${i * 26}ms` }}>{c === " " ? " " : c}</span>
          ))}
        </div>
        <div className="ft-sub">{FORMATS[value].blurb}</div>
      </div>

      <div className="ft-controls">
        <button type="button" className="ft-dice" onClick={surprise}>Surprise me</button>
        {autoKey !== value && (
          <button type="button" className="ft-auto" onClick={() => onSelect(autoKey)}>or let us decide</button>
        )}
      </div>
    </div>
  );
}

export default FormatTurntable;
