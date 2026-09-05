"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { annotate, report, toMDX } from "@/lib/annotate";
import { Beat } from "@/components/living/Beat";
import { StoryFrame } from "@/components/living/StoryFrame";
import { Hold } from "@/components/living/Scene";
import type { Voice } from "@/lib/vocabulary";

const DRAFT = `The bus leaves Majestic at nine and nobody tells you it will not stop.

I have been awake for six hours pretending to sleep.
Outside, the Ghats are doing something to the dark. Not lifting it. Just thinning it, the way milk thins tea.

The conductor knows my stop before I do. He has been counting women.

Somewhere near Kumta the road forgets itself.

The sea arrives before I see it. Salt first.
I get down. The bus goes on without me, red lights going small.

Nobody knows where I am.
Not in the frightening way. In the other way.`;

export default function Studio() {
  const [raw, setRaw] = useState(DRAFT);
  const [place, setPlace] = useState("GOKARNA");
  const [date, setDate] = useState("14.03.2026");
  const [fragment, setFragment] = useState("The night bus, and the ten minutes after I got down.");
  const [accent, setAccent] = useState("#2B3ED0");
  const [density, setDensity] = useState(5);
  const [budget, setBudget] = useState(30);
  const [tab, setTab] = useState<"read" | "mdx">("read");
  const [copied, setCopied] = useState(false);

  const beats = useMemo(
    () => annotate(raw, { doodleDensity: density, voiceBudget: budget / 100 }),
    [raw, density, budget],
  );
  const r = useMemo(() => report(beats), [beats]);
  const slug = place.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
  const mdx = useMemo(() => toMDX({ slug, place, date, fragment, accent }, beats), [slug, place, date, fragment, accent, beats]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(mdx); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  };

  return (
    <main className="studio" style={{ ["--accent" as string]: accent }}>
      <header className="studio-bar">
        <Link href="/" className="back" style={{ marginLeft: 0 }}>places</Link>
        <span className="studio-mark">the studio</span>
        <span style={{ flex: 1 }} />
        <span className="stamp">{r.total} beats · {Math.round(r.speakShare * 100)}% plain</span>
      </header>

      <div className="studio-grid">
        <section className="studio-col">
          <label className="lab" htmlFor="draft">the draft — write it badly first</label>
          <textarea id="draft" className="draft" value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false} />

          <div className="meta-grid">
            <label className="lab">place<input value={place} onChange={(e) => setPlace(e.target.value)} /></label>
            <label className="lab">date<input value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="lab" style={{ gridColumn: "1 / -1" }}>the doorway line<input value={fragment} onChange={(e) => setFragment(e.target.value)} /></label>
            <label className="lab">accent<input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} /></label>
          </div>

          <div className="knob">
            <div className="knob-row"><span className="lab">living margin</span><output>{density}</output></div>
            <input type="range" min={0} max={10} value={density} onChange={(e) => setDensity(+e.target.value)} />
          </div>
          <div className="knob">
            <div className="knob-row"><span className="lab">voice budget</span><output>{budget}%</output></div>
            <input type="range" min={10} max={60} value={budget} onChange={(e) => setBudget(+e.target.value)} />
            <p className="hint">The share of lines allowed to be anything other than SPEAK. Past about a third, the page stops meaning it.</p>
          </div>

          <div className="bar">
            <div className="bar-track">
              <i style={{ width: `${r.speakShare * 100}%` }} />
            </div>
            <ul className="notes">{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            <p className="hint">
              {r.holds} pauses · longest run without one: {r.longestRunWithoutHold} · margin used on {r.interactions} lines ·
              voices: {r.voicesUsed.join(", ")}
            </p>
          </div>
        </section>

        <section className="studio-col studio-out">
          <div className="seg">
            <button onClick={() => setTab("read")} aria-selected={tab === "read"}>read it</button>
            <button onClick={() => setTab("mdx")} aria-selected={tab === "mdx"}>the mdx</button>
            <span style={{ flex: 1 }} />
            <button className="act" onClick={copy}>{copied ? "copied" : `copy ${slug}.mdx`}</button>
          </div>

          {tab === "read" ? (
            <div className="preview">
              <StoryFrame veil={false} accent={accent}>
                {beats.map((b, i) =>
                  b.hold ? <Hold key={i} beats={1} /> : (
                    <Beat key={i} voice={b.voice as Voice} body={b.body} gesture={b.gesture}
                          doodle={b.doodle} side={b.side} seed={i * 7 + 3}>
                      {b.text}
                    </Beat>
                  ),
                )}
              </StoryFrame>
            </div>
          ) : (
            <pre className="mdx-out">{mdx}</pre>
          )}
        </section>
      </div>
    </main>
  );
}
