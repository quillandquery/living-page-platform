"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { analyse, annotate, toBlocks } from "@/lib/annotate";
import { serializeStory } from "@/lib/story-blocks.mjs";
import type { Block } from "@/lib/story-blocks.mjs";
import { Beat } from "@/components/living/Beat";
import { StoryFrame } from "@/components/living/StoryFrame";
import { Hold } from "@/components/living/Scene";
import { VOICES, type Body, type Gesture, type Voice } from "@/lib/vocabulary";
import { openStory, saveStory, studioIndex } from "./actions";
import type { StoryMeta } from "@/lib/vocabulary";

const DRAFT = `The bus leaves Majestic at nine and nobody tells you it will not stop.

I have been awake for six hours pretending to sleep.
Outside, the Ghats are doing something to the dark. Not lifting it. Just thinning it, the way milk thins tea.

The conductor knows my stop before I do. He has been counting women.

Somewhere near Kumta the road forgets itself.

The sea arrives before I see it. Salt first.
I get down. The bus goes on without me, red lights going small.

Nobody knows where I am.
Not in the frightening way. In the other way.`;

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * The preview renders the same blocks that get written to disk. It cannot
 * render a `raw` block — that is MDX source, and compiling MDX is the
 * bundler's job — so it says so instead of pretending. Seeing the parts the
 * editor is holding rather than modelling is the point: those are the parts
 * saving cannot damage.
 */
function BlockPreview({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === "hold") return <Hold key={i} beats={Math.min(b.beats, 2)} />;
        if (b.kind === "raw") return <p key={i} className="blk-kept-line">{b.text}</p>;
        return (
          <Beat
            key={i}
            voice={b.voice as Voice}
            body={b.body as Body | undefined}
            gesture={b.gesture as Gesture | undefined}
            doodle={b.doodle}
            side={b.side === "left" ? "left" : "right"}
            seed={i * 7 + 3}
          >
            {b.text}
          </Beat>
        );
      })}
    </>
  );
}

export default function Studio() {
  // the draft half — a blank page and an argument with the first pass
  const [raw, setRaw] = useState(DRAFT);
  const [density, setDensity] = useState(5);
  const [budget, setBudget] = useState(30);

  // the file half — a story that already exists, opened back up
  const [mode, setMode] = useState<"draft" | "file">("draft");
  const [fileBlocks, setFileBlocks] = useState<Block[]>([]);
  const [openSlug, setOpenSlug] = useState("");

  const [place, setPlace] = useState("GOKARNA");
  const [date, setDate] = useState("14.03.2026");
  const [fragment, setFragment] = useState("The night bus, and the ten minutes after I got down.");
  const [accent, setAccent] = useState("#2B3ED0");

  const [index, setIndex] = useState<StoryMeta[]>([]);
  const [canWrite, setCanWrite] = useState(true);
  const [tab, setTab] = useState<"read" | "mdx">("read");
  const [status, setStatus] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshIndex = useCallback(() => {
    studioIndex().then(({ stories, canWrite }) => { setIndex(stories); setCanWrite(canWrite); });
  }, []);
  useEffect(refreshIndex, [refreshIndex]);

  const draftBlocks = useMemo(
    () => toBlocks(annotate(raw, { doodleDensity: density, voiceBudget: budget / 100 })),
    [raw, density, budget],
  );

  const blocks = mode === "file" ? fileBlocks : draftBlocks;
  const slug = mode === "file" ? openSlug : (slugify(place) || "untitled");
  const r = useMemo(() => analyse(blocks), [blocks]);
  const source = useMemo(
    () => serializeStory({ place, date, fragment, accent }, blocks),
    [place, date, fragment, accent, blocks],
  );

  const patch = (i: number, next: Partial<Extract<Block, { kind: "beat" }>> & { beats?: number }) =>
    setFileBlocks((bs) => bs.map((b, k) => (k === i ? ({ ...b, ...next } as Block) : b)));

  const open = async (s: string) => {
    if (!s) { setMode("draft"); setOpenSlug(""); setStatus(null); return; }
    const story = await openStory(s);
    if (!story) { setStatus({ tone: "bad", text: `Could not read ${s}.mdx.` }); return; }
    setMode("file");
    setOpenSlug(story.meta.slug);
    setFileBlocks(story.blocks);
    setPlace(story.meta.place);
    setDate(story.meta.date);
    setFragment(story.meta.fragment);
    setAccent(story.meta.accent);
    setConfirming(false);
    const kept = story.blocks.filter((b) => b.kind === "raw").length;
    setStatus({
      tone: "ok",
      text: kept
        ? `${story.meta.slug}.mdx — ${story.blocks.length} blocks, ${kept} kept as written.`
        : `${story.meta.slug}.mdx — ${story.blocks.length} blocks.`,
    });
  };

  const save = async (overwrite: boolean) => {
    setBusy(true);
    const res = await saveStory({ slug, place, date, fragment, accent, blocks }, overwrite);
    setBusy(false);
    if (res.ok) {
      setConfirming(false);
      setMode("file");
      setOpenSlug(res.slug);
      setFileBlocks(blocks);
      setStatus({ tone: "ok", text: `${res.created ? "Wrote" : "Saved"} content/stories/${res.slug}.mdx` });
      refreshIndex();
      return;
    }
    if (res.reason === "exists") { setConfirming(true); setStatus({ tone: "bad", text: `${res.message} Save again to overwrite it.` }); return; }
    setStatus({ tone: "bad", text: res.message });
  };

  return (
    <main className="studio" style={{ ["--accent" as string]: accent }}>
      <header className="studio-bar">
        <Link href="/" className="back" style={{ marginLeft: 0 }}>places</Link>
        <span className="studio-mark">the studio</span>
        <label className="lab studio-open">
          <select value={mode === "file" ? openSlug : ""} onChange={(e) => open(e.target.value)}>
            <option value="">a new piece</option>
            {index.map((m) => <option key={m.slug} value={m.slug}>{m.slug}.mdx</option>)}
          </select>
        </label>
        <span style={{ flex: 1 }} />
        <span className="stamp">{r.total} beats · {Math.round(r.speakShare * 100)}% plain</span>
      </header>

      <div className="studio-grid">
        <section className="studio-col">
          {mode === "draft" ? (
            <>
              <label className="lab" htmlFor="draft">the draft — write it badly first</label>
              <textarea id="draft" className="draft" value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false} />
            </>
          ) : (
            <>
              <span className="lab">the beats — {openSlug}.mdx</span>
              <div className="blocks">
                {fileBlocks.map((b, i) =>
                  b.kind === "raw" ? (
                    <div key={i} className="blk blk-kept">
                      <span className="blk-tag">kept as written</span>
                      <pre>{b.text}</pre>
                    </div>
                  ) : b.kind === "hold" ? (
                    <div key={i} className="blk blk-hold">
                      <span className="blk-tag">silence</span>
                      <input type="number" min={1} max={6} value={b.beats}
                             onChange={(e) => patch(i, { beats: Math.max(1, Math.min(6, +e.target.value)) })} />
                    </div>
                  ) : (
                    <div key={i} className="blk">
                      <div className="blk-head">
                        <select value={b.voice} onChange={(e) => patch(i, { voice: e.target.value as Voice })}>
                          {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <input className="blk-doodle" placeholder="doodle" value={b.doodle ?? ""}
                               onChange={(e) => patch(i, { doodle: e.target.value || undefined })} />
                      </div>
                      <textarea className="blk-text" rows={2} value={b.text}
                                onChange={(e) => patch(i, { text: e.target.value })} />
                    </div>
                  ),
                )}
              </div>
            </>
          )}

          <div className="meta-grid">
            <label className="lab">place<input value={place} onChange={(e) => setPlace(e.target.value)} /></label>
            <label className="lab">date<input value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="lab" style={{ gridColumn: "1 / -1" }}>the doorway line<input value={fragment} onChange={(e) => setFragment(e.target.value)} /></label>
            <label className="lab">accent<input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} /></label>
          </div>

          {mode === "draft" ? (
            <>
              <div className="knob">
                <div className="knob-row"><span className="lab">living margin</span><output>{density}</output></div>
                <input type="range" min={0} max={10} value={density} onChange={(e) => setDensity(+e.target.value)} />
              </div>
              <div className="knob">
                <div className="knob-row"><span className="lab">voice budget</span><output>{budget}%</output></div>
                <input type="range" min={10} max={60} value={budget} onChange={(e) => setBudget(+e.target.value)} />
                <p className="hint">The share of lines allowed to be anything other than SPEAK. Past about a third, the page stops meaning it.</p>
              </div>
            </>
          ) : null}

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
            <button className="act" disabled={!canWrite || busy} onClick={() => save(confirming)}>
              {busy ? "writing…" : confirming ? "overwrite it" : `write ${slug}.mdx`}
            </button>
          </div>

          {status ? <p className={`say say-${status.tone}`}>{status.text}</p> : null}
          {!canWrite ? <p className="say say-bad">The studio does not write in production.</p> : null}

          {tab === "read" ? (
            <div className="preview">
              <StoryFrame veil={false} accent={accent}>
                <BlockPreview blocks={blocks} />
              </StoryFrame>
            </div>
          ) : (
            <pre className="mdx-out">{source}</pre>
          )}
        </section>
      </div>
    </main>
  );
}
