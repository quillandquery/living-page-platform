"use client";

import React, { useCallback, useRef, useState } from "react";
import { Doodle, strokePaths } from "@/components/doodles/Doodle";
import { RING_MARK, UNDERLINE_MARK } from "@/components/doodles/registry";

/**
 * UNDERLINE / HOVER. Wrap a word inside a line. `ring` draws a hand-drawn
 * circle around it when the reader arrives; `doodle` pops a small drawing
 * above it on hover. Neither looks like a control — they are discoveries.
 */
export function Mark({
  children, ring, underline, doodle, seed = 3,
}: {
  children: React.ReactNode; ring?: boolean; underline?: boolean; doodle?: string; seed?: number;
}) {
  const shape = ring ? RING_MARK : underline ? UNDERLINE_MARK : null;
  const paths = shape ? strokePaths(shape, seed, 3.4) : null;

  return (
    <span className="mark" tabIndex={doodle ? 0 : -1}>
      {children}
      {paths ? (
        <svg className="mark-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"
             stroke="var(--accent)" strokeWidth={1.4} fill="none" vectorEffect="non-scaling-stroke">
          {paths.map((p, i) => (
            <path key={i} className="stk" d={p.d} style={{ ["--len" as string]: p.len, ["--s" as string]: i }}
                  strokeLinecap="round" fill="none" />
          ))}
        </svg>
      ) : null}
      {doodle ? (
        <span className="mark-pop">
          <Doodle name={doodle} seed={seed + 9} size={88} ink="var(--accent)" />
        </span>
      ) : null}
    </span>
  );
}

/**
 * HOLD. "LOOK DOWN" — the reader presses and something surfaces at the
 * speed they are willing to wait for it.
 */
export function Press({
  label = "look down", children, ms = 1400,
}: { label?: string; children: React.ReactNode; ms?: number }) {
  const [p, setP] = useState(0);
  const [open, setOpen] = useState(false);
  const raf = useRef<number | null>(null);
  const start = useRef(0);

  const step = useCallback(() => {
    const t = Math.min(1, (performance.now() - start.current) / ms);
    setP(t);
    if (t >= 1) { setOpen(true); return; }
    raf.current = requestAnimationFrame(step);
  }, [ms]);

  const down = () => { if (open) return; start.current = performance.now(); raf.current = requestAnimationFrame(step); };
  const up = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    if (!open) setP(0);
  };

  return (
    <div className="beat mv-hold">
      <div className="words">
        {!open ? (
          <button className="press" onPointerDown={down} onPointerUp={up} onPointerLeave={up}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}>
            {label}
            <span className="press-meter" style={{ ["--p" as string]: `${Math.round(p * 100)}%` }}><i /></span>
          </button>
        ) : (
          <div style={{ animation: "lp-transform 1.4s cubic-bezier(.2,.7,.25,1) both" }}>{children}</div>
        )}
      </div>
    </div>
  );
}

/**
 * DRAG. A sentence the reader can push away. Extremely rare — once, in a
 * story that is about letting something go.
 */
export function Drag({ children, voice = "speak" }: { children: React.ReactNode; voice?: string }) {
  const [x, setX] = useState(0);
  const [gone, setGone] = useState(false);
  const from = useRef(0);
  const dragging = useRef(false);

  if (gone) return <div className="beat mv-hold" aria-hidden="true"><div className="words" style={{ height: "2.5em" }} /></div>;

  return (
    <div className="beat mv-hold">
      <div
        className={`words drag v-${voice}`}
        style={{ transform: `translateX(${x}px)`, opacity: Math.max(0, 1 - Math.abs(x) / 320) }}
        onPointerDown={(e) => { dragging.current = true; from.current = e.clientX - x; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (dragging.current) setX(e.clientX - from.current); }}
        onPointerUp={() => {
          dragging.current = false;
          if (Math.abs(x) > 220) { setX(x > 0 ? 700 : -700); setTimeout(() => setGone(true), 600); }
          else setX(0);
        }}
      >
        {children}
      </div>
    </div>
  );
}
