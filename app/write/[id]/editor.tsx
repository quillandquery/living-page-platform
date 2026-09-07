"use client";

import Link from "next/link";
import React, { useMemo, useState, useTransition } from "react";
import { analyse, annotate, toBlocks } from "@/lib/annotate";
import { Beat } from "@/components/living/Beat";
import { StoryFrame } from "@/components/living/StoryFrame";
import { Hold } from "@/components/living/Scene";
import { VOICES, type Body, type Gesture, type Voice } from "@/lib/vocabulary";
import { BACKDROP_NAMES, BACKDROPS } from "@/lib/backdrops";
import type { Block } from "@/lib/story-blocks.mjs";
import type { StoryRow } from "@/lib/types";
import {
  saveDraftAction, publishAction, unpublishAction, deleteStoryAction,
  type SaveInput,
} from "../actions";

/**
 * THE STUDIO.
 *
 * Write the thing badly first, in prose, in the left column. The engine reads
 * it and gives every line a voice — the 70/20/10 shape is the default, not a
 * discipline you have to keep. The right column is the page as a reader will
 * get it. If the machine is wrong (it often is), Refine lets you argue with it
 * line by line. Nothing here is destructive until you say publish.
 */

const PLACEHOLDER = `Write it badly first. One line at a time — the line is the unit, not the paragraph.

Leave a blank line where a reader should stop.

Don't think about how it looks. That's the engine's job. Just say the true thing.`;

/** The preview renders the same blocks that get saved. */
function BlockPreview({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === "hold") return <Hold key={i} beats={Math.min(b.beats, 2)} />;
        if (b.kind === "raw") return <p key={i} className="blk-kept-line">{b.text}</p>;
        return (
          <Beat key={i} voice={b.voice as Voice} body={b.body as Body | undefined}
                gesture={b.gesture as Gesture | undefined} doodle={b.doodle}
                side={b.side === "left" ? "left" : "right"} seed={i * 7 + 3}>
            {b.text}
          </Beat>
        );
      })}
    </>
  );
}

export function Editor({ story, handle }: { story: StoryRow; handle: string }) {
  const [raw, setRaw] = useState(story.source);
  const [density, setDensity] = useState(5);
  const [budget, setBudget] = useState(30);
  const [mode, setMode] = useState<"auto" | "refine">(story.source ? "auto" : "refine");
  const [refined, setRefined] = useState<Block[]>(story.blocks);

  const [place, setPlace] = useState(story.place);
  const [date, setDate] = useState(story.date);
  const [fragment, setFragment] = useState(story.fragment);
  const [accent, setAccent] = useState(story.accent);
  const [backdrop, setBackdrop] = useState(story.backdrop ?? "none");
  const [veil, setVeil] = useState(story.veil);

  const [status, setStatus] = useState<StoryStatusMsg>(
    story.status === "published" ? { tone: "ok", text: "Published — live on your page." } : null,
  );
  const [published, setPublished] = useState(story.status === "published");
  const [tab, setTab] = useState<"read" | "prose">("read");
  const [pending, start] = useTransition();

  const autoBlocks = useMemo(
    () => toBlocks(annotate(raw, { doodleDensity: density, voiceBudget: budget / 100 })),
    [raw, density, budget],
  );
  const blocks = mode === "auto" ? autoBlocks : refined;
  const r = useMemo(() => analyse(blocks), [blocks]);

  const patch = (i: number, next: Partial<Extract<Block, { kind: "beat" }>> & { beats?: number }) =>
    setRefined((bs) => bs.map((b, k) => (k === i ? ({ ...b, ...next } as Block) : b)));

  const input = (): SaveInput => ({
    id: story.id, place, date, fragment, accent,
    backdrop: backdrop === "none" ? null : backdrop, veil,
    source: raw, blocks,
  });

  const toRefine = () => { setRefined(autoBlocks); setMode("refine"); };
  const toAuto = () => setMode("auto");

  const run = (fn: (i: SaveInput) => Promise<{ ok: boolean; message?: string; slug?: string }>, verb: string, live?: boolean) =>
    start(async () => {
      const res = await fn(input());
      if (res.ok) {
        setStatus({ tone: "ok", text: live === true ? "Published — live on your page." : live === false ? "Unpublished — back to a draft." : "Saved." });
        if (live !== undefined) setPublished(live);
      } else {
        setStatus({ tone: "bad", text: res.message ?? `Could not ${verb}.` });
      }
    });

  const slug = story.slug.startsWith("untitled-") ? "(slug set on save)" : story.slug;

  return (
    <main className="studio" style={{ ["--accent" as string]: accent }}>
      <header className="studio-bar">
        <Link href="/write" className="back" style={{ marginLeft: 0 }}>the desk</Link>
        <span className="studio-mark">the studio</span>
        <span className="studio-slug">{published ? <Link href={`/@${handle}/${story.slug}`}>@{handle}/{story.slug}</Link> : slug}</span>
        <span style={{ flex: 1 }} />
        <span className="stamp">{r.total} beats · {Math.round(r.speakShare * 100)}% plain</span>
      </header>

      <div className="studio-grid">
        <section className="studio-col">
          <div className="mode-seg">
            <button onClick={toAuto} aria-selected={mode === "auto"}>write</button>
            <button onClick={toRefine} aria-selected={mode === "refine"}>refine</button>
          </div>

          {mode === "auto" ? (
            <>
              <label className="lab" htmlFor="draft">the draft — the engine reads this into voices</label>
              <textarea id="draft" className="draft" value={raw} placeholder={PLACEHOLDER}
                        onChange={(e) => setRaw(e.target.value)} spellCheck />
              <div className="knob">
                <div className="knob-row"><span className="lab">living margin</span><output>{density}</output></div>
                <input type="range" min={0} max={10} value={density} onChange={(e) => setDensity(+e.target.value)} />
              </div>
              <div className="knob">
                <div className="knob-row"><span className="lab">voice budget</span><output>{budget}%</output></div>
                <input type="range" min={10} max={60} value={budget} onChange={(e) => setBudget(+e.target.value)} />
                <p className="hint">The share of lines allowed to be anything other than a plain sentence. Past about a third, the page stops meaning it.</p>
              </div>
            </>
          ) : (
            <>
              <span className="lab">the beats — argue with the machine</span>
              <div className="blocks">
                {refined.map((b, i) =>
                  b.kind === "raw" ? (
                    <div key={i} className="blk blk-kept"><span className="blk-tag">kept as written</span><pre>{b.text}</pre></div>
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
            <label className="lab">place<input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="GOKARNA" /></label>
            <label className="lab">date<input value={date} onChange={(e) => setDate(e.target.value)} placeholder="14.03.2026" /></label>
            <label className="lab" style={{ gridColumn: "1 / -1" }}>the doorway line<input value={fragment} onChange={(e) => setFragment(e.target.value)} placeholder="one line you'd say out loud" /></label>
            <label className="lab">accent<input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} /></label>
            <label className="lab">world
              <select value={backdrop} onChange={(e) => setBackdrop(e.target.value)}>
                {BACKDROP_NAMES.map((n) => <option key={n} value={n}>{BACKDROPS[n].label}</option>)}
              </select>
            </label>
            <label className="lab lab-check"><input type="checkbox" checked={veil} onChange={(e) => setVeil(e.target.checked)} /> veil — lines arrive as you scroll</label>
          </div>

          <div className="bar">
            <div className="bar-track"><i style={{ width: `${r.speakShare * 100}%` }} /></div>
            <ul className="notes">{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            <p className="hint">{r.holds} pauses · longest run without one: {r.longestRunWithoutHold} · margin used on {r.interactions} lines · voices: {r.voicesUsed.join(", ")}</p>
          </div>
        </section>

        <section className="studio-col studio-out">
          <div className="seg">
            <button onClick={() => setTab("read")} aria-selected={tab === "read"}>read it</button>
            <button onClick={() => setTab("prose")} aria-selected={tab === "prose"}>your words</button>
            <span style={{ flex: 1 }} />
            <button className="ghost" disabled={pending} onClick={() => run(saveDraftAction, "save")}>{pending ? "…" : "save draft"}</button>
            {published
              ? <button className="ghost" disabled={pending} onClick={() => run(unpublishAction, "unpublish", false)}>unpublish</button>
              : null}
            <button className="act" disabled={pending} onClick={() => run(publishAction, "publish", true)}>{published ? "update" : "publish"}</button>
          </div>

          {status ? <p className={`say say-${status.tone}`}>{status.text}</p> : null}

          {tab === "read" ? (
            <div className="preview">
              <StoryFrame veil={false} accent={accent}><BlockPreview blocks={blocks} /></StoryFrame>
            </div>
          ) : (
            <pre className="mdx-out">{raw || "(nothing written yet)"}</pre>
          )}

          <div className="danger">
            <form action={deleteStoryAction.bind(null, story.id)}>
              <button className="linklike danger-link" onClick={(e) => { if (!confirm("Delete this piece for good?")) e.preventDefault(); }}>delete this piece</button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

type StoryStatusMsg = { tone: "ok" | "bad"; text: string } | null;
