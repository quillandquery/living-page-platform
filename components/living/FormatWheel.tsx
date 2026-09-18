"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { FORMATS, type FormatKey } from "@/lib/formats";
import { FormatCover } from "@/components/living/FormatCover";

/** Accent per format, so the rail reads colourful instead of uniform cream. */
const TINT: Record<string, string> = {
  standard: "#C89A5B",
  scrapbook: "#C9822F",
  letter: "#3B5168",
  poster: "#D23B2E",
  ticket: "#2E8B8B",
  notebook: "#3FA05C",
  gallery: "#7A5C8A",
  film: "#8A8F98",
  ransom: "#D23B2E",
  marquee: "#31C8D8",
  postcard: "#A66A3B",
};

/**
 * CIRCLE WHEEL — layouts arranged around a hub. Each spoke drifts gently on
 * its own; as the cursor nears one it stills and leans toward it (magnetic),
 * and the one under the cursor swells. The hub is "or let us decide" (the
 * engine's pick). Kept to the story's curated few so the wheel never crowds.
 */
export function FormatWheel({
  formats, value, autoKey, onSelect,
}: { formats: FormatKey[]; value: FormatKey; autoKey: FormatKey; onSelect: (k: FormatKey) => void }) {
  const n = formats.length;
  const wheelRef = useRef<HTMLDivElement>(null);

  // Proximity pass: near spokes pause their idle drift and lean at the cursor.
  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    if (window.matchMedia?.("(pointer: coarse)").matches) return; // touch: leave it be
    const spokes = Array.from(wheel.querySelectorAll<HTMLElement>(".fs-spoke"));
    const R = 150; // px radius that counts as "near"
    let raf = 0;
    const apply = (cx: number, cy: number) => {
      for (const el of spokes) {
        const r = el.getBoundingClientRect();
        const dx = cx - (r.left + r.width / 2);
        const dy = cy - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy);
        const near = d < R;
        el.dataset.near = near ? "1" : "";
        const pull = near ? Math.max(0, 1 - d / R) : 0; // 0..1, stronger up close
        el.style.setProperty("--px", `${(dx / R) * 8 * pull}px`);
        el.style.setProperty("--py", `${(dy / R) * 8 * pull}px`);
      }
    };
    const clear = () => {
      for (const el of spokes) { el.dataset.near = ""; el.style.setProperty("--px", "0px"); el.style.setProperty("--py", "0px"); }
    };
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; apply(e.clientX, e.clientY); });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    wheel.addEventListener("pointerleave", clear);
    return () => {
      window.removeEventListener("pointermove", onMove);
      wheel.removeEventListener("pointerleave", clear);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [n]);

  return (
    <div className="fs-wheel" ref={wheelRef}>
      {formats.map((k, i) => {
        const a = (-90 + (i * 360) / n) * (Math.PI / 180);
        const x = 50 + Math.cos(a) * 40;
        const y = 50 + Math.sin(a) * 40;
        return (
          <button key={k} type="button" onClick={() => onSelect(k)}
            className={`fs-spoke${k === value ? " is-active" : ""}`}
            style={{ left: `${x}%`, top: `${y}%`, "--i": i, "--tint": TINT[k] ?? "#C89A5B" } as CSSProperties}
            aria-pressed={k === value}>
            <span className="fs-spoke-face"><FormatCover k={k} /></span>
            <span className="fs-spoke-name">{FORMATS[k].label}</span>
          </button>
        );
      })}
      <button type="button" className="fs-hub" onClick={() => onSelect(autoKey)}>
        <span className="fs-hub-t">Choose<br/>a layout</span>
        <span className="fs-hub-s">or let us decide</span>
      </button>
    </div>
  );
}

export default FormatWheel;
