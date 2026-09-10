"use client";

import Link from "next/link";
import React, { useMemo, useState, useTransition } from "react";
import { annotate, toBlocks } from "@/lib/annotate";
import { Beat } from "@/components/living/Beat";
import { StoryFrame } from "@/components/living/StoryFrame";
import { Hold } from "@/components/living/Scene";
import { type Body, type Gesture, type Voice } from "@/lib/vocabulary";
import { BACKDROP_NAMES, BACKDROPS } from "@/lib/backdrops";
import type { Block } from "@/lib/story-blocks.mjs";
import type { StoryRow } from "@/lib/types";
import {
  saveDraftAction, publishAction, unpublishAction, deleteStoryAction,
  type SaveInput,
} from "../actions";

/**
 * THE STUDIO — write-first (PRD v2 §10, §13, §14).
 *
 * The writer writes prose. The engine reads it into a living page and picks
 * the look automatically (Auto). The only shaping controls are Mood and
 * Visuals; everything technical (world override, the veil, deleting) lives
 * under Advanced. Nothing the writer sees mentions beats, voice budget or
 * per-line voices. Nothing is destructive until Publish.
 */

const PROMPT = "Start anywhere. Don't worry about the beginning.";

/* ── Auto art direction (heuristic, in-session) ────────────────────────── */

const MOODS = ["auto", "quiet", "dreamy", "raw", "playful", "cinematic", "warm", "romantic", "restless", "chaotic"] as const;
type Mood = (typeof MOODS)[number];
const VISUALS = ["auto", "minimal", "illustrated", "collage", "maximal"] as const;
type Visual = (typeof VISUALS)[number];

const MOOD_SPEC: Record<Exclude<Mood, "auto">, { accent: string; density: number; budget: number }> = {
  quiet: { accent: "#4C6A8A", density: 2, budget: 18 },
  dreamy: { accent: "#7A6CE0", density: 5, budget: 34 },
  raw: { accent: "#D23B2E", density: 3, budget: 30 },
  playful: { accent: "#F2A73B", density: 7, budget: 34 },
  cinematic: { accent: "#2E6E8E", density: 5, budget: 26 },
  warm: { accent: "#C77D3A", density: 4, budget: 26 },
  romantic: { accent: "#D0567F", density: 4, budget: 30 },
  restless: { accent: "#2B5BD0", density: 6, budget: 34 },
  chaotic: { accent: "#E24A3B", density: 9, budget: 46 },
};
const VISUAL_DENSITY: Record<Exclude<Visual, "auto">, number> = { minimal: 1, illustrated: 5, collage: 7, maximal: 10 };

const MOOD_CUES: [Exclude<Mood, "auto">, RegExp][] = [
  ["chaotic", /\b(chaos|frantic|crowd|noise|everywhere|too much|panic|spinning)\b/i],
  ["raw", /\b(furious|angry|rage|hate|broke|broken|scream|slammed|hurt)\b/i],
  ["romantic", /\b(love|loved|kiss|held|heart|tender|close|skin|touch)\b/i],
  ["dreamy", /\b(dream|dreamt|floating|memory|remember|unreal|haze|drift)\b/i],
  ["quiet", /\b(silence|silent|quiet|still|alone|empty|slow|breath|nobody|calm)\b/i],
  ["playful", /\b(laugh|funny|silly|ridiculous|joke|grin|fun|delighted)\b/i],
  ["restless", /\b(couldn't sleep|awake|restless|racing|can't stop|nervous)\b/i],
];
const WORLD_CUES: [string, RegExp][] = [
  ["coast", /\b(beach|sea|ocean|coast|shore|sand|wave|surf|salt|tide|swim)\b/i],
  ["monsoon", /\b(rain|monsoon|storm|downpour|wet|thunder|drizzle|umbrella)\b/i],
  ["highland", /\b(mountain|hill|ghat|ridge|valley|cliff|peak|fog)\b/i],
  ["heat", /\b(desert|heat|noon|dust|dry|burn|scorching)\b/i],
  ["nightroad", /\b(night|midnight|road|drive|bus|highway|moon|stars|4am|asleep|dark)\b/i],
];
const WORLD_ACCENT: Record<string, string> = {
  coast: "#1C86C4", monsoon: "#3E8E9E", highland: "#4C6A8A", heat: "#D2691E",
  nightroad: "#2B3ED0", nightsky: "#2B3ED0",
};

const count = (re: RegExp, s: string) => (s.match(new RegExp(re.source, "gi")) ?? []).length;
function inferMood(t: string): Exclude<Mood, "auto"> {
  let best: Exclude<Mood, "auto"> = "warm", score = 0.4;
  for (const [m, re] of MOOD_CUES) { const n = count(re, t); if (n > score) { score = n; best = m; } }
  return best;
}
function inferWorld(t: string): string {
  for (const [w, re] of WORLD_CUES) if (re.test(t)) return w;
  return "coast"; // never "none" — a bright default
}

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

type Msg = { tone: "ok" | "bad"; text: string } | null;

export function Editor({ story, handle }: { story: StoryRow; handle: string }) {
  const [raw, setRaw] = useState(story.source);
  const [moodSel, setMood] = useState<Mood>("auto");
  const [visSel, setVis] = useState<Visual>("auto");
  const [worldSel, setWorld] = useState<string>("auto"); // "auto" or a world name
  const [veil, setVeil] = useState(story.veil);

  const [place, setPlace] = useState(story.place);
  const [date, setDate] = useState(story.date);
  const [fragment, setFragment] = useState(story.fragment);

  const [status, setStatus] = useState<Msg>(
    story.status === "published" ? { tone: "ok", text: "Published — live on your page." } : null,
  );
  const [published, setPublished] = useState(story.status === "published");
  const [tab, setTab] = useState<"read" | "words">("read");
  const [pending, start] = useTransition();

  // — Auto art direction, derived from the writing + the two controls —
  const mood = moodSel === "auto" ? inferMood(raw) : moodSel;
  const spec = MOOD_SPEC[mood];
  const world = worldSel === "auto" ? inferWorld(raw) : worldSel;
  const accent = moodSel === "auto" ? (WORLD_ACCENT[world] ?? spec.accent) : spec.accent;
  const density = visSel === "auto" ? spec.density : VISUAL_DENSITY[visSel];
  const budget = spec.budget;

  const blocks = useMemo(
    () => toBlocks(annotate(raw, { doodleDensity: density, voiceBudget: budget / 100 })),
    [raw, density, budget],
  );

  const lines = raw.trim() ? raw.trim().split(/\n+/).filter(Boolean).length : 0;
  const stateHint = lines === 0 ? "" : lines < 4 ? "Your page is taking shape." : "Keep going. We'll handle the rest.";

  const input = (): SaveInput => ({
    id: story.id, place, date, fragment, accent,
    backdrop: world === "none" ? null : world, veil,
    source: raw, blocks,
  });

  const run = (fn: (i: SaveInput) => Promise<{ ok: boolean; message?: string }>, verb: string, live?: boolean) =>
    start(async () => {
      const res = await fn(input());
      if (res.ok) {
        setStatus({ tone: "ok", text: live === true ? "Published — live on your page." : live === false ? "Back to a draft." : "Saved." });
        if (live !== undefined) setPublished(live);
      } else setStatus({ tone: "bad", text: res.message ?? `Could not ${verb}.` });
    });

  const title = (place || "untitled").toLowerCase();

  return (
    <main className="ed">
      <style>{CSS}</style>

      <header className="ed-bar">
        <Link href="/write" className="ed-logo">Living Page</Link>
        <span className="ed-save">{pending ? "saving…" : status ? status.text : "draft"}</span>
        <span className="ed-bar-r">
          {published ? <Link href={`/@${handle}/${story.slug}`} className="ed-link" target="_blank">view →</Link> : null}
          <button className="ed-ghost" disabled={pending} onClick={() => run(saveDraftAction, "save")}>Save</button>
          {published
            ? <button className="ed-ghost" disabled={pending} onClick={() => run(unpublishAction, "unpublish", false)}>Unpublish</button>
            : null}
          <button className="ed-pub" disabled={pending} onClick={() => run(publishAction, "publish", true)}>{published ? "Update" : "Publish"}</button>
        </span>
      </header>

      <div className="ed-grid">
        {/* — the writing stage — */}
        <section className="ed-write">
          <textarea className="ed-text" value={raw} placeholder={PROMPT} spellCheck
                    onChange={(e) => setRaw(e.target.value)} autoFocus />
          {stateHint ? <p className="ed-hint">{stateHint}</p> : null}

          <div className="ed-shape">
            <label className="ed-ctl">Mood
              <select value={moodSel} onChange={(e) => setMood(e.target.value as Mood)}>
                {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="ed-ctl">Visuals
              <select value={visSel} onChange={(e) => setVis(e.target.value as Visual)}>
                {VISUALS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>

          <div className="ed-meta">
            <input className="ed-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Where / what (title)" />
            <input className="ed-frag" value={fragment} onChange={(e) => setFragment(e.target.value)} placeholder="One line to draw people in" />
            <input className="ed-date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="Date" />
          </div>

          <details className="ed-adv">
            <summary>Advanced</summary>
            <div className="ed-adv-body">
              <label className="ed-ctl">World
                <select value={worldSel} onChange={(e) => setWorld(e.target.value)}>
                  <option value="auto">auto ({world})</option>
                  {BACKDROP_NAMES.filter((n) => n !== "none").map((n) => <option key={n} value={n}>{BACKDROPS[n].label}</option>)}
                </select>
              </label>
              <label className="ed-check"><input type="checkbox" checked={veil} onChange={(e) => setVeil(e.target.checked)} /> lines arrive as you scroll</label>
              <form action={deleteStoryAction.bind(null, story.id)}>
                <button className="ed-del" onClick={(e) => { if (!confirm("Delete this piece for good?")) e.preventDefault(); }}>delete this piece</button>
              </form>
            </div>
          </details>
        </section>

        {/* — the page, as a reader gets it — */}
        <section className="ed-preview-col">
          <div className="ed-seg">
            <button onClick={() => setTab("read")} aria-selected={tab === "read"}>the page</button>
            <button onClick={() => setTab("words")} aria-selected={tab === "words"}>your words</button>
          </div>
          {status ? <p className={`ed-msg ${status.tone === "bad" ? "bad" : ""}`}>{status.text}</p> : null}
          {tab === "read" ? (
            <div className="preview" style={{ ["--accent" as string]: accent }}>
              <StoryFrame veil={false} accent={accent}><BlockPreview blocks={blocks} /></StoryFrame>
            </div>
          ) : (
            <pre className="ed-words">{raw || "(nothing written yet)"}</pre>
          )}
        </section>
      </div>
    </main>
  );
}

const CSS = `
.ed{ --paper:#FBF6EC; --paper-2:#fff; --ink:#1A1816; --ink-soft:#4A4642; --mute:#8A837A; --line:#E7DFCE; --electric:#2D6BF0;
  --f-disp:var(--font-disp),Georgia,serif; --f-body:var(--font-body),Georgia,serif; --f-hand:var(--font-hand),cursive;
  --f-mono:var(--font-mono),ui-monospace,monospace; background:var(--paper); color:var(--ink); min-height:100vh; font-family:var(--f-body); }
.ed-bar{ display:flex; align-items:center; gap:1rem; padding:.9rem max(1rem,3vw); border-bottom:1px solid var(--line); position:sticky; top:0; background:var(--paper); z-index:5; }
.ed-logo{ font-family:var(--f-hand); font-size:1.3rem; color:inherit; text-decoration:none; }
.ed-save{ font-family:var(--f-mono); font-size:.68rem; letter-spacing:.06em; color:var(--mute); }
.ed-bar-r{ margin-left:auto; display:flex; align-items:center; gap:.6rem; }
.ed-link{ font-family:var(--f-mono); font-size:.68rem; text-transform:uppercase; letter-spacing:.08em; color:var(--electric); text-decoration:none; }
.ed-ghost{ font-family:var(--f-mono); font-size:.66rem; letter-spacing:.08em; text-transform:uppercase; background:transparent; border:1px solid var(--line); color:var(--ink-soft); border-radius:999px; padding:.5rem .9rem; cursor:pointer; }
.ed-ghost:hover{ border-color:var(--electric); color:var(--electric); }
.ed-pub{ font-family:var(--f-mono); font-size:.66rem; letter-spacing:.08em; text-transform:uppercase; background:var(--ink); color:var(--paper); border:0; border-radius:999px; padding:.55rem 1.1rem; cursor:pointer; }
.ed-pub:hover{ background:var(--electric); }

.ed-grid{ display:grid; grid-template-columns:1fr 1fr; gap:0; min-height:calc(100vh - 3.5rem); }
.ed-write{ padding:4vh max(1rem,3vw); display:flex; flex-direction:column; gap:1.1rem; border-right:1px solid var(--line); }
.ed-text{ width:100%; min-height:44vh; resize:vertical; border:0; outline:0; background:transparent; color:var(--ink);
  font-family:var(--f-body); font-size:1.3rem; line-height:1.6; }
.ed-text::placeholder{ color:var(--mute); }
.ed-hint{ font-family:var(--f-mono); font-size:.7rem; letter-spacing:.04em; color:var(--mute); margin:0; }
.ed-shape{ display:flex; gap:.8rem; flex-wrap:wrap; border-top:1px solid var(--line); padding-top:1.1rem; }
.ed-ctl{ display:flex; flex-direction:column; gap:.3rem; font-family:var(--f-mono); font-size:.64rem; letter-spacing:.1em; text-transform:uppercase; color:var(--mute); }
.ed-ctl select{ font-family:var(--f-body); font-size:.95rem; text-transform:none; letter-spacing:0; color:var(--ink);
  background:var(--paper-2); border:1px solid var(--line); border-radius:8px; padding:.45rem .6rem; }
.ed-meta{ display:flex; flex-direction:column; gap:.5rem; }
.ed-meta input{ font-family:var(--f-body); font-size:1rem; color:var(--ink); background:var(--paper-2); border:1px solid var(--line); border-radius:8px; padding:.55rem .7rem; }
.ed-place{ font-family:var(--f-disp) !important; font-size:1.2rem !important; }
.ed-adv{ border-top:1px solid var(--line); padding-top:.8rem; }
.ed-adv summary{ font-family:var(--f-mono); font-size:.66rem; letter-spacing:.1em; text-transform:uppercase; color:var(--mute); cursor:pointer; }
.ed-adv-body{ display:flex; flex-direction:column; gap:.9rem; padding-top:1rem; }
.ed-check{ display:flex; align-items:center; gap:.5rem; font-size:.9rem; color:var(--ink-soft); }
.ed-del{ background:none; border:0; color:var(--mute); font-family:var(--f-mono); font-size:.64rem; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; padding:0; text-align:left; }
.ed-del:hover{ color:#C0392B; }

.ed-preview-col{ display:flex; flex-direction:column; background:var(--paper-2); }
.ed-seg{ display:flex; gap:.2rem; padding:.8rem max(1rem,2vw); border-bottom:1px solid var(--line); }
.ed-seg button{ font-family:var(--f-mono); font-size:.64rem; letter-spacing:.1em; text-transform:uppercase; background:transparent; border:0; color:var(--mute); padding:.4rem .7rem; cursor:pointer; border-radius:6px; }
.ed-seg button[aria-selected="true"]{ background:var(--ink); color:var(--paper); }
.ed-msg{ font-family:var(--f-mono); font-size:.66rem; letter-spacing:.04em; color:var(--electric); margin:.6rem max(1rem,2vw) 0; }
.ed-msg.bad{ color:#C0392B; }
.ed .preview{ flex:1; overflow:auto; padding:2vh 1vw; }
.ed-words{ flex:1; overflow:auto; margin:0; padding:2vh max(1rem,2vw); font-family:var(--f-mono); font-size:.9rem; line-height:1.7; color:var(--ink-soft); white-space:pre-wrap; }

@media (max-width:900px){ .ed-grid{ grid-template-columns:1fr; } .ed-write{ border-right:0; border-bottom:1px solid var(--line); } .ed .preview{ min-height:60vh; } }
`;
