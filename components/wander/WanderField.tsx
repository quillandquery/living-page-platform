"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { StorySeed } from "./StorySeed";
import type { StorySeed as Seed } from "@/lib/discover";

/**
 * WANDER — a field, not a feed.
 *
 * Three density bands (quiet → mid → burst) instead of scripted scroll
 * percentages: the story mix itself decides how sparse or dense a stretch
 * of the page is. Entrance is IntersectionObserver-driven `.arrived`, the
 * same pattern the real reader uses in StoryFrame — Wander is meant to
 * already feel like a Living Page, not a preview of one.
 */

type MoodKey = "laugh" | "somewhere" | "feel" | "think" | "weird" | "heartbreak";
type TimeKey = "all" | "quick" | "five" | "ten" | "long";

const MOODS: { key: MoodKey; label: string; sub: string; test: (s: Seed) => boolean }[] = [
  { key: "laugh", label: "Make me laugh", sub: "loud, fast, a little absurd", test: (s) => s.dominantVoice === "shout" || s.energy === "electric" },
  { key: "somewhere", label: "Take me somewhere", sub: "a place, a road, a dateline", test: (s) => s.themes.includes("in transit") || s.form === "postcard" },
  { key: "feel", label: "Make me feel something", sub: "quiet, close, unresolved", test: (s) => (["whisper", "listen", "thought"] as const).includes(s.dominantVoice as any) },
  { key: "think", label: "Give me something to think about", sub: "circling a question", test: (s) => s.dominantVoice === "thought" || s.dominantVoice === "drift" },
  { key: "weird", label: "Show me something weird", sub: "too many things at once", test: (s) => s.form === "collage" || s.form === "typographic" },
  { key: "heartbreak", label: "Break my heart a little", sub: "leaving, alone, still waiting", test: (s) => s.themes.some((t) => ["loss", "leaving", "alone", "waiting"].includes(t)) },
];

const TIME: { key: TimeKey; label: string; sub: string; test: (s: number) => boolean }[] = [
  { key: "all", label: "Everything", sub: "no rush", test: () => true },
  { key: "quick", label: "90 sec", sub: "a tiny stumble", test: (s) => s <= 90 },
  { key: "five", label: "5 min", sub: "a little detour", test: (s) => s > 90 && s <= 300 },
  { key: "ten", label: "10 min", sub: "let's wander", test: (s) => s > 300 && s <= 600 },
  { key: "long", label: "All night", sub: "bad idea. perfect.", test: (s) => s > 600 },
];

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

/** A handful of real connector lines between adjacent burst-tier seeds —
 * measured from their actual positions, not scripted. Best-effort: skipped
 * on narrow screens and reduced motion, and never breaks layout if it fails. */
function Connectors({ containerRef, ids }: { containerRef: RefObject<HTMLDivElement | null>; ids: string[] }) {
  const [paths, setPaths] = useState<string[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || ids.length < 2 || window.matchMedia("(max-width: 860px)").matches) {
      setPaths((p) => (p.length ? [] : p));
      return;
    }

    const compute = () => {
      const root = containerRef.current;
      if (!root) return;
      const rootBox = root.getBoundingClientRect();
      const pts: { x: number; y: number }[] = [];
      for (const id of ids) {
        const el = root.querySelector<HTMLElement>(`[data-id="${id}"]`);
        if (!el) continue;
        const box = el.getBoundingClientRect();
        pts.push({ x: box.left + box.width / 2 - rootBox.left, y: box.top + box.height / 2 - rootBox.top });
      }
      const next: string[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const midX = (a.x + b.x) / 2 + (i % 2 ? 40 : -40);
        const midY = (a.y + b.y) / 2 + (i % 2 ? -30 : 30);
        next.push(`M${a.x.toFixed(0)},${a.y.toFixed(0)} Q${midX.toFixed(0)},${midY.toFixed(0)} ${b.x.toFixed(0)},${b.y.toFixed(0)}`);
      }
      setPaths(next);
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", compute);
    return () => { ro.disconnect(); window.removeEventListener("resize", compute); };
  }, [ids, reduced, containerRef]);

  if (!paths.length) return null;
  return (
    <svg className="wander-connectors" aria-hidden="true">
      {paths.map((d, i) => <path key={i} className="wander-connector-line" d={d} style={{ ["--i" as string]: i }} />)}
    </svg>
  );
}

export function WanderField({ seeds }: { seeds: Seed[] }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [timeKey, setTimeKey] = useState<TimeKey>("all");
  const [scrambling, setScrambling] = useState(false);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);

  const quiet = useMemo(() => seeds.filter((s) => s.tier === "quiet"), [seeds]);
  const mid = useMemo(() => seeds.filter((s) => s.tier === "mid"), [seeds]);
  const burst = useMemo(() => seeds.filter((s) => s.tier === "burst"), [seeds]);

  const moodDef = mood ? MOODS.find((m) => m.key === mood) : null;
  const timeDef = TIME.find((t) => t.key === timeKey)!;
  const isVisible = (s: Seed) => (!moodDef || moodDef.test(s)) && timeDef.test(s.readSeconds);

  // arrival: the same near/arrived idea StoryFrame uses for a story, here
  // for a field of them. A page with JS disabled just renders everything.
  useEffect(() => {
    const root = fieldRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(".seed"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.add("arrived");
          el.querySelectorAll<HTMLElement>(".beat").forEach((b) => b.classList.add("arrived"));
          io.unobserve(el);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [seeds]);

  // scroll is an input: one number, everything else reads it in CSS
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const span = document.documentElement.scrollHeight - window.innerHeight;
        const p = span > 0 ? window.scrollY / span : 0;
        document.documentElement.style.setProperty("--wander-progress", Math.min(1, Math.max(0, p)).toFixed(3));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); document.documentElement.style.removeProperty("--wander-progress"); };
  }, []);

  const burstIds = useMemo(() => burst.filter(isVisible).slice(0, 4).map((s) => s.id), [burst, mood, timeKey]);

  const surprise = () => {
    const pool = seeds.filter(isVisible);
    if (!pool.length) return;
    setScrambling(true);
    window.setTimeout(() => {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setSpotlightId(pick.id);
      setScrambling(false);
      requestAnimationFrame(() => {
        document.querySelector(`[data-id="${pick.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }, 520);
  };

  const band = (list: Seed[], name: string, ref?: RefObject<HTMLDivElement | null>) => (
    <section className={`wander-field band-${name}`} data-band={name} ref={ref}>
      {list.map((s, i) => (
        <StorySeed key={s.id} seed={s} index={i} hidden={!isVisible(s)} spotlit={s.id === spotlightId} />
      ))}
    </section>
  );

  return (
    <div className={`wander${scrambling ? " is-scrambling" : ""}`} ref={fieldRef}>
      <header className="wander-hero">
        <h1 className="wander-title">Wander</h1>
        <p className="wander-tag">You don&rsquo;t have to know what you&rsquo;re looking for.</p>
      </header>

      {seeds.length === 0 ? (
        <p className="wander-empty">Nothing published yet. <Link href="/make">Be the first to make one.</Link></p>
      ) : (
        <>
          {band(quiet, "quiet")}

          <section className="mood-cluster">
            <p className="mood-kick">What are you in the mood for?</p>
            <div className="mood-doors">
              {MOODS.map((m, i) => (
                <button
                  key={m.key}
                  type="button"
                  className={`mood-door${mood === m.key ? " is-active" : ""}`}
                  style={{ ["--i" as string]: i } as CSSProperties}
                  onClick={() => setMood(mood === m.key ? null : m.key)}
                >
                  <span className="mood-door-label">{m.label}</span>
                  <span className="mood-door-sub">{m.sub}</span>
                </button>
              ))}
              <button type="button" className="mood-door mood-door-idk" onClick={surprise}>
                <span className="mood-door-label">I don&rsquo;t know</span>
                <span className="mood-door-sub">surprise me</span>
              </button>
            </div>
          </section>

          {band(mid, "mid")}

          <section className="time-cluster">
            <p className="time-kick">How long are we getting lost for?</p>
            <div className="time-doors">
              {TIME.filter((t) => t.key !== "all").map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`time-door${timeKey === t.key ? " is-active" : ""}`}
                  onClick={() => setTimeKey(timeKey === t.key ? "all" : t.key)}
                >
                  <span className="time-door-label">{t.label}</span>
                  <span className="time-door-sub">{t.sub}</span>
                </button>
              ))}
            </div>
          </section>

          <div style={{ position: "relative" }}>
            <Connectors containerRef={burstRef} ids={burstIds} />
            {band(burst, "burst", burstRef)}
          </div>

          <section className="wander-surprise-wrap">
            <button type="button" className="wander-surprise" onClick={surprise}>Surprise me →</button>
          </section>

          <section className="wander-loop">
            <p className="wander-loop-kick">You&rsquo;ve been here a while.</p>
            <p className="wander-loop-h">Got something of your own?</p>
            <Link href="/make" className="wander-loop-cta">Make a Living Page →</Link>
          </section>
        </>
      )}

      <footer className="wander-foot">Living Page</footer>
    </div>
  );
}

export default WanderField;
