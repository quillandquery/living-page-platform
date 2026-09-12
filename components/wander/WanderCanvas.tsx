"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Doodle } from "@/components/doodles/Doodle";

/**
 * WANDER — the reader's own surface (Home explains, Wander helps you find
 * something to read). Lightweight, real data only: every number and label
 * here comes from an actual published story. There is no mood/topic
 * classification in the schema, so this deliberately does not fake one —
 * discovery here works by chance (spotlight + another) and by an honest
 * read-time filter, not by invented categories.
 */

export type WanderSeed = {
  id: string;
  slug: string;
  handle: string;
  authorName: string;
  place: string;
  fragment: string;
  accent: string;
  readSeconds: number;
  readLabel: string;
};

const TIME_BUCKETS = [
  { key: "all", label: "Everything" },
  { key: "quick", label: "90 seconds", test: (s: number) => s <= 90 },
  { key: "five", label: "5 minutes", test: (s: number) => s > 90 && s <= 300 },
  { key: "ten", label: "10 minutes", test: (s: number) => s > 300 && s <= 600 },
  { key: "long", label: "I have all night", test: (s: number) => s > 600 },
] as const;

const TILE_DOODLES = ["wave", "bird", "trace", "cloud", "mountain", "flower", "boat", "star"];

/** Deterministic small hash so layout is stable between server and client render. */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function sizeOf(id: string): "lg" | "md" | "sm" {
  const n = hash(id) % 5;
  if (n === 0) return "lg";
  if (n <= 2) return "md";
  return "sm";
}

function doodleOf(id: string): string {
  return TILE_DOODLES[hash(id + "d") % TILE_DOODLES.length];
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** IntersectionObserver-driven reveal — no library, degrades to "already visible" without JS. */
function useReveal() {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ as: As = "div", className = "", children }: { as?: any; className?: string; children: React.ReactNode }) {
  const { ref, visible } = useReveal();
  return (
    <As ref={ref} className={`reveal${visible ? " is-visible" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </As>
  );
}

/** A read link that, where supported, falls into the story with a soft cross-fade
 * instead of a hard navigation — progressive enhancement, plain <Link> otherwise. */
function ReadLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const onClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    const anyDoc = document as any;
    if (reduced || typeof anyDoc.startViewTransition !== "function") return; // let Link navigate normally
    e.preventDefault();
    anyDoc.startViewTransition(() => router.push(href));
  };
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function WanderCanvas({ seeds }: { seeds: WanderSeed[] }) {
  const [spotlightIdx, setSpotlightIdx] = useState(0);
  const [bucket, setBucket] = useState<(typeof TIME_BUCKETS)[number]["key"]>("all");
  const [cursorLabel, setCursorLabel] = useState<"idle" | "read">("idle");
  const [cursorOn, setCursorOn] = useState(false);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  // Randomise the spotlight once we're on the client — avoids an SSR/CSR mismatch.
  useEffect(() => {
    if (seeds.length > 1) setSpotlightIdx(Math.floor(Math.random() * seeds.length));
  }, [seeds.length]);

  // Custom cursor: only on a fine pointer, and only after JS confirms it — a
  // page with JS disabled, or on touch, keeps the native cursor throughout.
  useEffect(() => {
    if (reduced) return;
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;
    setCursorOn(true);
    const move = (e: globalThis.MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      }
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [reduced]);

  const spotlight = seeds[spotlightIdx];
  const another = () => {
    if (seeds.length < 2) return;
    let next = Math.floor(Math.random() * seeds.length);
    while (next === spotlightIdx) next = Math.floor(Math.random() * seeds.length);
    setSpotlightIdx(next);
  };

  const scattered = useMemo(() => seeds.slice(0, 5), [seeds]);
  const activeBucket = TIME_BUCKETS.find((b) => b.key === bucket)!;
  const visibleSeeds = useMemo(
    () => (activeBucket.key === "all" ? seeds : seeds.filter((s) => "test" in activeBucket && activeBucket.test(s.readSeconds))),
    [seeds, activeBucket],
  );

  return (
    <div className={`wd${cursorOn ? " wd-nocursor" : ""}`} ref={rootRef}>
      <style>{CSS}</style>

      {cursorOn ? (
        <div ref={cursorRef} className={`wd-cursor wd-cursor-${cursorLabel}`} aria-hidden="true">
          <span className="wd-cursor-glyph">✦</span>
          <span className="wd-cursor-label">READ →</span>
        </div>
      ) : null}

      <nav className="wd-nav">
        <Link href="/" className="wd-logo">Living Page</Link>
        <Link href="/make" className="wd-make">Make a Living Page</Link>
      </nav>

      {/* ── SCENE 1: arrival ── */}
      <header className="wd-arrival">
        <h1 className="wd-title">Wander</h1>
        <p className="wd-tag">You don&rsquo;t have to know what you&rsquo;re looking for.</p>
        <div className="wd-scatter" aria-hidden="true">
          {scattered.map((s, i) => (
            <span key={s.id} className={`wd-scrap wd-scrap-${i}`} style={{ ["--a" as string]: s.accent }}>
              {s.fragment}
            </span>
          ))}
        </div>
      </header>

      {seeds.length === 0 ? (
        <p className="wd-empty">Nothing published yet. <Link href="/make">Be the first to make one.</Link></p>
      ) : (
        <>
          {/* ── SCENE 2–3: here's one for you ── */}
          {spotlight ? (
            <Reveal as="section" className="wd-spotlight-wrap">
              <p className="wd-spotlight-kick">Here&rsquo;s one for you.</p>
              <div className="wd-spotlight" style={{ ["--a" as string]: spotlight.accent }}>
                <p className="wd-spotlight-hook">{spotlight.fragment}</p>
                <p className="wd-spotlight-meta">
                  {spotlight.place} · {spotlight.authorName} · {spotlight.readLabel}
                </p>
                <div className="wd-spotlight-actions">
                  <ReadLink
                    href={`/@${spotlight.handle}/${spotlight.slug}`}
                    className="wd-btn wd-btn-primary"
                    key={spotlight.id}
                  >
                    Read →
                  </ReadLink>
                  <button type="button" className="wd-btn wd-btn-ghost" onClick={another} disabled={seeds.length < 2}>
                    Another →
                  </button>
                </div>
              </div>
            </Reveal>
          ) : null}

          {/* ── SCENE 12: how long do you have ── */}
          <Reveal as="section" className="wd-time">
            <p className="wd-time-h">How long do you have?</p>
            <div className="wd-time-row">
              {TIME_BUCKETS.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  className={`wd-time-pill${bucket === b.key ? " is-active" : ""}`}
                  onClick={() => setBucket(b.key)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </Reveal>

          {/* ── SCENE 7: asymmetric canvas ── */}
          <section className="wd-canvas">
            {visibleSeeds.length === 0 ? (
              <p className="wd-empty">Nothing that short (yet) — try a different window.</p>
            ) : (
              visibleSeeds.map((s) => {
                const size = sizeOf(s.id);
                const showDoodle = size !== "sm";
                return (
                  <Reveal key={s.id} as="article" className={`wd-tile wd-tile-${size}`}>
                    <ReadLink
                      href={`/@${s.handle}/${s.slug}`}
                      className="wd-tile-link"
                    >
                      <span
                        className="wd-tile-inner"
                        style={{ ["--a" as string]: s.accent }}
                        onMouseEnter={() => setCursorLabel("read")}
                        onMouseLeave={() => setCursorLabel("idle")}
                      >
                        {showDoodle ? (
                          <span className="wd-tile-doodle"><Doodle name={doodleOf(s.id)} seed={hash(s.id)} size={size === "lg" ? 64 : 44} ink="var(--a)" /></span>
                        ) : null}
                        <span className="wd-tile-hook">{s.fragment}</span>
                        <span className="wd-tile-peek">
                          <span className="wd-tile-place">{s.place}</span>
                          <span className="wd-tile-meta">{s.authorName} · {s.readLabel}</span>
                          <span className="wd-tile-cta">Read →</span>
                        </span>
                      </span>
                    </ReadLink>
                  </Reveal>
                );
              })
            )}
          </section>

          {/* ── reader → writer loop ── */}
          <Reveal as="section" className="wd-loop">
            <p className="wd-loop-kick">You&rsquo;ve been here a while.</p>
            <p className="wd-loop-h">Got something of your own?</p>
            <Link href="/make" className="wd-btn wd-btn-primary wd-btn-lg">Make a Living Page →</Link>
          </Reveal>
        </>
      )}

      <footer className="wd-foot">Living Page</footer>
    </div>
  );
}

export default WanderCanvas;

const CSS = `
.wd{
  --paper:#FBF6EC; --paper-2:#fff; --ink:#1A1816; --ink-soft:#4A4642; --mute:#8A837A; --line:#E7DFCE;
  --electric:#2D6BF0;
  --f-disp:var(--font-disp),Georgia,serif; --f-body:var(--font-body),Georgia,serif;
  --f-hand:var(--font-hand),cursive; --f-mono:var(--font-mono),ui-monospace,monospace;
  background:var(--paper); color:var(--ink); min-height:100vh; font-family:var(--f-body);
  position:relative;
}
.wd a{ color:inherit; text-decoration:none; }
.wd.wd-nocursor, .wd.wd-nocursor *{ cursor:none; }

/* custom cursor */
.wd-cursor{ position:fixed; top:0; left:0; z-index:60; pointer-events:none; will-change:transform;
  transform:translate(-100px,-100px); }
.wd-cursor-glyph{ position:absolute; left:0; top:0; transform:translate(-50%,-50%); font-size:1.1rem; color:var(--electric);
  transition:opacity .15s ease; }
.wd-cursor-label{ position:absolute; left:.9rem; top:-.5rem; font-family:var(--f-mono); font-size:.68rem; letter-spacing:.08em;
  text-transform:uppercase; color:var(--paper); background:var(--ink); padding:.3rem .55rem; border-radius:999px;
  white-space:nowrap; opacity:0; transform:translateY(2px) scale(.9); transition:opacity .15s ease, transform .15s ease; }
.wd-cursor-read .wd-cursor-glyph{ opacity:0; }
.wd-cursor-read .wd-cursor-label{ opacity:1; transform:translateY(0) scale(1); }

.wd-nav{ display:flex; align-items:center; justify-content:space-between; padding:1.3rem max(1rem,4vw); position:relative; z-index:2; }
.wd-logo{ font-family:var(--f-hand); font-size:1.4rem; }
.wd-make{ font-family:var(--f-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--paper);
  background:var(--ink); padding:.5rem .9rem; border-radius:999px; }
.wd-make:hover{ background:var(--electric); }

/* arrival */
.wd-arrival{ position:relative; max-width:70rem; margin:0 auto; padding:8vh max(1rem,4vw) 12vh; text-align:center; overflow:hidden; }
.wd-title{ font-family:var(--f-disp); font-weight:400; font-size:clamp(3.4rem,11vw,7rem); margin:0; letter-spacing:-.02em; }
.wd-tag{ font-family:var(--f-hand); font-size:1.35rem; color:var(--ink-soft); margin:.6rem 0 0; }
.wd-scatter{ position:relative; height:14rem; margin-top:2rem; }
.wd-scrap{ position:absolute; font-family:var(--f-disp); font-size:1.15rem; line-height:1.3; max-width:14rem;
  color:color-mix(in oklab,var(--a,var(--electric)) 72%,var(--ink)); opacity:.8; }
.wd-scrap-0{ left:2%; top:6%; transform:rotate(-3deg); }
.wd-scrap-1{ right:4%; top:0%; transform:rotate(2deg); text-align:right; }
.wd-scrap-2{ left:24%; top:52%; transform:rotate(1.5deg); font-size:.95rem; opacity:.6; }
.wd-scrap-3{ right:20%; top:58%; transform:rotate(-2deg); font-size:1rem; }
.wd-scrap-4{ left:50%; top:20%; transform:translateX(-50%) rotate(-1deg); font-size:1.3rem; }
@media (max-width:720px){ .wd-scatter{ display:none; } }

.wd-empty{ max-width:40rem; margin:0 auto; padding:4vh max(1rem,4vw) 10vh; text-align:center; color:var(--mute); }
.wd-empty a{ color:var(--electric); }

/* reveal-on-scroll */
.reveal{ opacity:0; transform:translateY(1.1em); transition:opacity .8s cubic-bezier(.2,.7,.25,1), transform .8s cubic-bezier(.2,.7,.25,1); }
.reveal.is-visible{ opacity:1; transform:none; }
@media (prefers-reduced-motion:reduce){ .reveal{ opacity:1; transform:none; transition:none; } }

/* spotlight */
.wd-spotlight-wrap{ max-width:52rem; margin:0 auto; padding:4vh max(1rem,4vw) 9vh; text-align:center; }
.wd-spotlight-kick{ font-family:var(--f-mono); font-size:.75rem; letter-spacing:.14em; text-transform:uppercase; color:var(--mute); margin:0 0 1.2rem; }
.wd-spotlight{ background:var(--paper-2); border:1px solid var(--line); border-top:4px solid var(--a,var(--electric));
  border-radius:18px; padding:3rem 2.2rem; box-shadow:0 18px 44px rgba(26,24,22,.08); }
.wd-spotlight-hook{ font-family:var(--f-disp); font-size:clamp(1.8rem,4.4vw,2.7rem); line-height:1.2; margin:0; }
.wd-spotlight-meta{ font-family:var(--f-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase;
  color:color-mix(in oklab,var(--a,var(--electric)) 60%,var(--ink)); margin:1.4rem 0 0; }
.wd-spotlight-actions{ display:flex; gap:.8rem; justify-content:center; margin-top:1.8rem; flex-wrap:wrap; }

.wd-btn{ display:inline-flex; align-items:center; font-family:var(--f-mono); font-size:.75rem; letter-spacing:.1em;
  text-transform:uppercase; padding:.85rem 1.3rem; border-radius:999px; border:1px solid transparent; background:none;
  cursor:pointer; transition:transform .2s cubic-bezier(.2,1.25,.3,1), background .2s, border-color .2s; }
.wd-btn-primary{ background:var(--ink); color:var(--paper); }
.wd-btn-primary:hover{ background:var(--electric); transform:translateY(-2px); }
.wd-btn-ghost{ border-color:var(--line); color:var(--ink-soft); }
.wd-btn-ghost:hover:not(:disabled){ border-color:var(--electric); color:var(--electric); }
.wd-btn:disabled{ opacity:.4; cursor:default; }
.wd-btn-lg{ font-size:.85rem; padding:1rem 1.7rem; }

/* time filter */
.wd-time{ max-width:52rem; margin:0 auto; padding:2vh max(1rem,4vw) 6vh; text-align:center; }
.wd-time-h{ font-family:var(--f-disp); font-size:1.5rem; margin:0 0 1.2rem; }
.wd-time-row{ display:flex; gap:.6rem; justify-content:center; flex-wrap:wrap; }
.wd-time-pill{ font-family:var(--f-mono); font-size:.7rem; letter-spacing:.08em; text-transform:uppercase;
  color:var(--ink-soft); background:var(--paper-2); border:1px solid var(--line); border-radius:999px; padding:.55rem 1rem;
  cursor:pointer; transition:all .15s ease; }
.wd-time-pill:hover{ border-color:var(--electric); color:var(--electric); }
.wd-time-pill.is-active{ background:var(--ink); border-color:var(--ink); color:var(--paper); }

/* asymmetric canvas */
.wd-canvas{ max-width:78rem; margin:0 auto; padding:2vh max(1rem,4vw) 10vh;
  display:grid; grid-template-columns:repeat(6,1fr); grid-auto-rows:9rem; gap:1rem; }
.wd-tile-lg{ grid-column:span 3; grid-row:span 2; }
.wd-tile-md{ grid-column:span 3; grid-row:span 1; }
.wd-tile-sm{ grid-column:span 2; grid-row:span 1; }
.wd-tile-link{ display:block; height:100%; }
.wd-tile-inner{ position:relative; display:flex; flex-direction:column; justify-content:space-between; height:100%;
  background:var(--paper-2); border:1px solid var(--line); border-left:3px solid var(--a,var(--electric));
  border-radius:14px; padding:1.2rem 1.3rem; overflow:hidden; transition:transform .25s cubic-bezier(.2,1.25,.3,1), box-shadow .25s ease; }
.wd-tile-inner:hover{ transform:translateY(-3px); box-shadow:0 14px 30px rgba(26,24,22,.09); }
.wd-tile-doodle{ position:absolute; right:.6rem; top:.6rem; opacity:.35; }
.wd-tile-hook{ font-family:var(--f-disp); font-size:1.15rem; line-height:1.3; max-width:88%; }
.wd-tile-lg .wd-tile-hook{ font-size:1.6rem; }
.wd-tile-sm .wd-tile-hook{ font-size:.95rem; -webkit-line-clamp:3; display:-webkit-box; -webkit-box-orient:vertical; overflow:hidden; }
.wd-tile-peek{ display:flex; flex-direction:column; gap:.15rem; opacity:0; transform:translateY(.4rem);
  transition:opacity .2s ease, transform .2s ease; }
.wd-tile-inner:hover .wd-tile-peek, .wd-tile-link:focus-visible .wd-tile-peek{ opacity:1; transform:none; }
.wd-tile-place{ font-family:var(--f-mono); font-size:.65rem; letter-spacing:.1em; text-transform:uppercase;
  color:color-mix(in oklab,var(--a,var(--electric)) 65%,var(--ink)); }
.wd-tile-meta{ font-family:var(--f-mono); font-size:.65rem; color:var(--mute); }
.wd-tile-cta{ font-family:var(--f-mono); font-size:.68rem; letter-spacing:.08em; text-transform:uppercase; color:var(--electric); margin-top:.2rem; }
@media (max-width:860px){
  .wd-canvas{ grid-template-columns:repeat(2,1fr); grid-auto-rows:auto; }
  .wd-tile-lg, .wd-tile-md, .wd-tile-sm{ grid-column:span 2; grid-row:auto; }
  .wd-tile-inner{ min-height:9rem; }
  .wd-tile-peek{ opacity:1; transform:none; position:static; margin-top:.6rem; }
}

/* reader -> writer loop */
.wd-loop{ text-align:center; padding:10vh max(1rem,4vw) 8vh; border-top:1px solid var(--line); max-width:40rem; margin:0 auto; }
.wd-loop-kick{ font-family:var(--f-mono); font-size:.72rem; letter-spacing:.1em; text-transform:uppercase; color:var(--mute); margin:0; }
.wd-loop-h{ font-family:var(--f-disp); font-size:clamp(1.8rem,4vw,2.6rem); margin:.3rem 0 1.6rem; }

.wd-foot{ text-align:center; padding:3rem; font-family:var(--f-hand); font-size:1.2rem; color:var(--mute); border-top:1px solid var(--line); }

@media (prefers-reduced-motion:reduce){
  .wd-tile-inner, .wd-btn, .wd-time-pill{ transition:none !important; }
}
`;
