"use client";

import { useEffect, useRef, useState } from "react";
import { AutoStage, TAB_ORDER, WORLD_META, WorldStage, splitBeats, type WorldKey } from "@/components/home/WorldStage";

/**
 * THE TRY-IT DEMO — the homepage's whole proposition, watched AND played
 * with (P0.2 + the "one sentence, many personalities" demonstration merged
 * into a single interactive centerpiece). [HERO.DEMO_RAW], verbatim per
 * docs/COPY.md, is the default text.
 *
 * Passive visitor: the sentence transforms automatically (Auto), then the
 * demo tours the six other personalities on its own — nobody has to click
 * anything to see the range.
 *
 * Typing your own line is a deliberate two-step, not a live-as-you-type
 * effect: type it, it sits there looking ordinary, then a "Give it life"
 * button plays the same raw → transforming → alive reveal on your words —
 * the text repositions, the doodle draws in. Clicking a personality tab
 * stays instant (no ceremony); the ceremony belongs to typing.
 *
 * Renders inside the SAME `.hero-page` card the live homepage already uses
 * for its transform demo — one box, no per-personality chrome. The tab
 * colours are the one deliberately playful/colourful UI element, restored
 * per feedback. Self-contained: its own state, its own CSS (in
 * app/page.tsx) — this never touches the real annotate/render/
 * art-direction pipeline (homepage-only scope).
 */

const DEFAULT_SENTENCE = "I got to the beach just before sunset. The water was colder than I expected. I stayed anyway.";

const INTRO_RAW_MS = 1150;
const INTRO_ALIVE_MS = 2250;
const LIFE_RAW_MS = 450;
const LIFE_ALIVE_MS = 1350;
const TOUR_STEP_MS = 3200;

export function TryIt() {
  const [sentence, setSentence] = useState(DEFAULT_SENTENCE);
  const [activeTab, setActiveTab] = useState<WorldKey>("auto");
  const [introPhase, setIntroPhase] = useState<0 | 1 | 2>(0);
  const [pending, setPending] = useState(false); // typed text waiting to be "given life"
  const [interacted, setInteracted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lifeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearLifeTimers = () => {
    lifeTimers.current.forEach(clearTimeout);
    lifeTimers.current = [];
  };

  // Respect prefers-reduced-motion: rest on the finished state, no tour.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // The one-time "watch it transform" intro, on the default sentence.
  useEffect(() => {
    if (reduced) {
      setIntroPhase(2);
      return;
    }
    const t1 = setTimeout(() => setIntroPhase(1), INTRO_RAW_MS);
    const t2 = setTimeout(() => setIntroPhase(2), INTRO_ALIVE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduced]);

  // The automatic tour through the other six personalities — starts once
  // the intro has settled, and cancels the moment a visitor takes the wheel.
  useEffect(() => {
    if (interacted || reduced || introPhase < 2) return;
    const id = setInterval(() => {
      setActiveTab((cur) => TAB_ORDER[(TAB_ORDER.indexOf(cur) + 1) % TAB_ORDER.length]);
    }, TOUR_STEP_MS);
    return () => clearInterval(id);
  }, [interacted, reduced, introPhase]);

  useEffect(() => clearLifeTimers, []);

  const takeControl = () => setInteracted(true);

  // Tabs are instant — no ceremony, that belongs to typing.
  const selectTab = (t: WorldKey) => {
    takeControl();
    clearLifeTimers();
    setPending(false);
    setActiveTab(t);
    setIntroPhase(2);
  };

  // Typing drops back to Auto, looking plain/ordinary, and waits for you to
  // hit "Give it life" rather than transforming on every keystroke.
  const onEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    takeControl();
    clearLifeTimers();
    setSentence(e.target.value);
    setActiveTab("auto");
    setIntroPhase(reduced ? 2 : 0);
    setPending(!reduced);
  };

  const onFocusInput = () => takeControl();

  const giveLife = () => {
    clearLifeTimers();
    if (reduced) {
      setPending(false);
      setIntroPhase(2);
      return;
    }
    setIntroPhase(0);
    lifeTimers.current.push(setTimeout(() => setIntroPhase(1), LIFE_RAW_MS));
    lifeTimers.current.push(
      setTimeout(() => {
        setIntroPhase(2);
        setPending(false);
      }, LIFE_ALIVE_MS),
    );
  };

  const reset = () => {
    clearLifeTimers();
    setSentence(DEFAULT_SENTENCE);
    setActiveTab("auto");
    setIntroPhase(2);
    setPending(false);
    inputRef.current?.focus();
  };

  return (
    <div className="tryit">
      <div className={activeTab === "auto" ? `hero-page ph-${introPhase}` : "hero-page"}>
        {activeTab === "auto" ? (
          <AutoStage beats={splitBeats(sentence)} phase={introPhase} />
        ) : (
          <WorldStage world={activeTab} sentence={sentence} />
        )}
      </div>

      <div className="stage-tabs" role="tablist" aria-label="Choose a personality">
        {TAB_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === activeTab}
            className={`stage-tab${t === activeTab ? " active" : ""}`}
            onClick={() => selectTab(t)}
            style={{ ["--sw" as string]: WORLD_META[t].swatch }}
          >
            <i className="tab-dot" />
            {WORLD_META[t].tag}
          </button>
        ))}
      </div>

      <div className="stage-try">
        <span className="try-icon" aria-hidden="true">✎</span>
        <input
          ref={inputRef}
          className="stage-input"
          type="text"
          value={sentence}
          onChange={onEdit}
          onFocus={onFocusInput}
          placeholder="Try your own line…"
          aria-label="Type your own sentence to see it transform"
          maxLength={140}
        />
        {pending ? (
          <button type="button" className="try-life" onClick={giveLife}>
            ✦ Give it life
          </button>
        ) : sentence !== DEFAULT_SENTENCE ? (
          <button type="button" className="try-reset" onClick={reset}>
            reset
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default TryIt;
