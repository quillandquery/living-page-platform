"use client";

import Link from "next/link";
import React, { useMemo, useState, useTransition } from "react";
import { annotate, toBlocks } from "@/lib/annotate";
import { Beat } from "@/components/living/Beat";
import { Hold } from "@/components/living/Scene";
import { Backdrop } from "@/components/living/Backdrop";
import { getBackdrop } from "@/lib/backdrops";
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
 * Left: you write. Right: the page, alive — the world painted behind it, the
 * colour, the voices, lines arriving as you type. Everything technical is
 * folded into one quiet "Details". Nothing mentions beats or voice budgets.
 */

const PROMPT = "Start anywhere. Don't worry about the beginning.";

const MOODS = ["auto", "quiet", "dreamy", "raw", "playful", "cinematic", "warm", "romantic", "restless", "chaotic"] as const;
type Mood = (typeof MOODS)[number];
const VISUALS = ["auto", "minimal", "illustrated", "collage", "maximal"] as const;
type Visual = (typeof VISUALS)[number];

// mood → colour + how alive the margins are + how many lines may leave plain
const MOOD_SPEC: Record<Exclude<Mood, "auto">, { accent: string; density: number; budget: number }> = {
  quiet: { accent: "#4C6A8A", density: 3, budget: 30 },
  dreamy: { accent: "#7A6CE0", density: 6, budget: 46 },
  raw: { accent: "#D23B2E", density: 5, budget: 46 },
  playful: { accent: "#E68A2E", density: 8, budget: 48 },
  cinematic: { accent: "#2E6E8E", density: 6, budget: 40 },
  warm: { accent: "#C77D3A", density: 6, budget: 42 },
  romantic: { accent: "#D0567F", density: 5, budget: 42 },
  restless: { accent: "#2B5BD0", density: 7, budget: 48 },
  chaotic: { accent: "#E24A3B", density: 9, budget: 56 },
};
const VISUAL_DENSITY: Record<Exclude<Visual, "auto">, number> = { minimal: 2, illustrated: 6, collage: 8, maximal: 10 };

const MOOD_CUES: [Exclude<Mood, "auto">, RegExp][] = [
  ["chaotic", /\b(chaos|frantic|crowd|noise|everywhere|too much|panic|spinning)\b/i],
  ["raw", /\b(furious|angry|rage|grief|cried|crying|broke|broken|scream|hurt|heartache)\b/i],
  ["romantic", /\b(love|loved|kiss|held|heart|tender|close|skin|touch)\b/i],
  ["dreamy", /\b(dream|dreamt|floating|memory|remember|unreal|haze|drift|sabbatical)\b/i],
  ["quiet", /\b(silence|silent|quiet|still|alone|empty|slow|breath|nobody|calm)\b/i],
  ["playful", /\b(laugh|funny|silly|ridiculous|joke|grin|fun|delighted)\b/i],
  ["restless", /\b(couldn't sleep|awake|restless|racing|can't stop|nervous|not right)\b/i],
];
const WORLD_CUES: [string, RegExp][] = [
  ["forest", /\b(forest|jungle|trees?|woods|leaves|trail|moss|pine)\b/i],
  ["monsoon", /\b(monsoon|downpour|thunder|storm|flood|drizzle)\b/i],
  ["dreamscape", /\b(dream|dreamt|surreal|floating|unreal|imagine|sabbatical)\b/i],
  ["nightcity", /\b(neon|nightlife|club|streetlight)\b/i],
  ["nightroad", /\b(night|midnight|road|drive|cab|bus|airport|highway|moon|stars|4am|asleep)\b/i],
  ["coast", /\b(beach|sea|ocean|coast|shore|sand|wave|surf|salt|tide|swim)\b/i],
  ["window", /\b(window|caf[eé]|coffee|glass|watching|indoors|inside)\b/i],
  ["cafe", /\b(kitchen|bedroom|home|lamp|bed|tea|apartment|sofa|office|corporate|desk)\b/i],
  ["meadow", /\b(field|meadow|flowers?|grass|picnic|wildflower|garden|bloom)\b/i],
  ["highland", /\b(mountain|hill|ghat|ridge|valley|cliff|peak|fog)\b/i],
  ["heat", /\b(desert|heat|noon|dust|scorching|dune)\b/i],
  ["dawn", /\b(dawn|sunrise|morning|first light|rooster)\b/i],
  ["city", /\b(city|street|downtown|traffic|crowd|sidewalk|avenue|market|bangalore)\b/i],
];
const WORLD_ACCENT: Record<string, string> = {
  coast: "#1C86C4", forest: "#2E7D4F", highland: "#4C6A8A", meadow: "#C9962B", heat: "#D2691E",
  dawn: "#E0876B", city: "#3A5BD0", window: "#5B7C99", cafe: "#C77D3A", monsoon: "#3E8E9E",
  nightcity: "#B65CC0", nightroad: "#2B3ED0", nightsky: "#2B3ED0", dreamscape: "#7A6CE0",
};

const count = (re: RegExp, s: string) => (s.match(new RegExp(re.source, "gi")) ?? []).length;
function inferMood(t: string): Exclude<Mood, "auto"> {
  let best: Exclude<Mood, "auto"> = "warm", score = 0.4;
  for (const [m, re] of MOOD_CUES) { const n = count(re, t); if (n > score) { score = n; best = m; } }
  return best;
}
function inferWorld(t: string): string {
  for (const [w, re] of WORLD_CUES) if (re.test(t)) return w;
  return "dawn";
}

/**
 * Guarantee the page reads as transformed, not as a copy of the textarea:
 * the opening line lands as a display line, and a later short, emphatic line
 * lands large. Only nudges when the engine left everything plain.
 */
function dramatize(blocks: Block[]): Block[] {
  const out = blocks.map((b) => ({ ...b })) as Block[];
  const beats = out.filter((b) => b.kind === "beat") as Extract<Block, { kind: "beat" }>[];
  if (!beats.length) return out;
  const voiced = beats.filter((b) => b.voice !== "speak").length;
  // opening → a quiet declaration
  if (beats[0].voice === "speak") beats[0].voice = "listen";
  // if still almost all plain, let one short punchy line shout
  if (voiced <= 1) {
    const punch = beats.slice(1).find((b) => b.voice === "speak" && b.text.split(/\s+/).length <= 9 && /[.!?]$/.test(b.text));
    if (punch) punch.voice = "shout";
  }
  return out;
}

function LivePreview({ blocks }: { blocks: Block[] }) {
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
  const [worldSel, setWorld] = useState<string>("auto");
  const [veil, setVeil] = useState(story.veil);

  const [place, setPlace] = useState(story.place);
  const [date, setDate] = useState(story.date);
  const [fragment, setFragment] = useState(story.fragment);

  const [status, setStatus] = useState<Msg>(
    story.status === "published" ? { tone: "ok", text: "Published — live on your page." } : null,
  );
  const [published, setPublished] = useState(story.status === "published");
  const [tab, setTab] = useState<"page" | "words">("page");
  const [pending, start] = useTransition();

  const mood = moodSel === "auto" ? inferMood(raw) : moodSel;
  const spec = MOOD_SPEC[mood];
  const world = worldSel === "auto" ? inferWorld(raw) : worldSel;
  const accent = moodSel === "auto" ? (WORLD_ACCENT[world] ?? spec.accent) : spec.accent;
  const density = visSel === "auto" ? spec.density : VISUAL_DENSITY[visSel];
  const budget = spec.budget;
  const dark = getBackdrop(world)?.scheme === "dark";

  const blocks = useMemo(
    () => dramatize(toBlocks(annotate(raw, { doodleDensity: density, voiceBudget: budget / 100 }))),
    [raw, density, budget],
  );

  const lines = raw.trim() ? raw.trim().split(/\n+/).filter(Boolean).length : 0;
  const hint = lines === 0 ? "" : lines < 4 ? "Your page is taking shape." : "Keep going. We'll handle the rest.";

  const input = (): SaveInput => ({
    id: story.id, place, date, fragment, accent,
    backdrop: world, veil, source: raw, blocks,
  });

  const run = (fn: (i: SaveInput) => Promise<{ ok: boolean; message?: string }>, verb: string, live?: boolean) =>
    start(async () => {
      const res = await fn(input());
      if (res.ok) {
        setStatus({ tone: "ok", text: live === true ? "Published — live on your page." : live === false ? "Back to a draft." : "Saved." });
        if (live !== undefined) setPublished(live);
      } else setStatus({ tone: "bad", text: res.message ?? `Could not ${verb}.` });
    });

  return (
    <main className="ed">
      <style>{CSS}</style>

      <header className="ed-bar">
        <Link href="/write" className="ed-logo">Living Page</Link>
        <span className="ed-save">{pending ? "saving…" : status ? status.text : "draft"}</span>
        <span className="ed-bar-r">
          {published ? <Link href={`/@${handle}/${story.slug}`} className="ed-link" target="_blank">view →</Link> : null}
          <button className="ed-ghost" disabled={pending} onClick={() => run(saveDraftAction, "save")}>Save</button>
          <button className="ed-pub" disabled={pending} onClick={() => run(publishAction, "publish", true)}>{published ? "Update" : "Publish"}</button>
        </span>
      </header>

      <div className="ed-grid">
        {/* — write — */}
        <section className="ed-write">
          <textarea className="ed-text" value={raw} placeholder={PROMPT} spellCheck
                    onChange={(e) => setRaw(e.target.value)} autoFocus />
          {hint ? <p className="ed-hint">{hint}</p> : null}

          <details className="ed-details">
            <summary>Details &amp; shaping</summary>
            <div className="ed-details-body">
              <div className="ed-row">
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
                <label className="ed-ctl">World
                  <select value={worldSel} onChange={(e) => setWorld(e.target.value)}>
                    <option value="auto">auto ({world})</option>
                    {BACKDROP_NAMES.map((n) => <option key={n} value={n}>{BACKDROPS[n].label}</option>)}
                  </select>
                </label>
              </div>
              <input className="ed-field" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Title (a place, a moment)" />
              <input className="ed-field" value={fragment} onChange={(e) => setFragment(e.target.value)} placeholder="One line to draw people in" />
              <input className="ed-field" value={date} onChange={(e) => setDate(e.target.value)} placeholder="Date (optional)" />
              <label className="ed-check"><input type="checkbox" checked={veil} onChange={(e) => setVeil(e.target.checked)} /> lines arrive as you scroll</label>
              {published ? <button className="ed-mini" disabled={pending} onClick={() => run(unpublishAction, "unpublish", false)}>unpublish</button> : null}
              <form action={deleteStoryAction.bind(null, story.id)}>
                <button className="ed-del" onClick={(e) => { if (!confirm("Delete this piece for good?")) e.preventDefault(); }}>delete this piece</button>
              </form>
            </div>
          </details>
        </section>

        {/* — the living page — */}
        <section className="ed-preview-col">
          <div className="ed-seg">
            <button onClick={() => setTab("page")} aria-selected={tab === "page"}>the page</button>
            <button onClick={() => setTab("words")} aria-selected={tab === "words"}>your words</button>
          </div>
          {tab === "page" ? (
            <div className={`ed-live${dark ? " dark" : ""}`} style={{ ["--accent" as string]: accent }} key={world}>
              <Backdrop name={world} seed={story.id} />
              <div className="ed-flow">
                {raw.trim() ? <LivePreview blocks={blocks} /> : <p className="ed-blank">Your living page appears here as you write.</p>}
              </div>
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

.ed-grid{ display:grid; grid-template-columns:1fr 1fr; min-height:calc(100vh - 3.5rem); }
.ed-write{ padding:5vh max(1.2rem,3.5vw); display:flex; flex-direction:column; gap:1.2rem; border-right:1px solid var(--line); }
.ed-text{ width:100%; min-height:52vh; resize:vertical; border:0; outline:0; background:transparent; color:var(--ink);
  font-family:var(--f-disp); font-size:1.5rem; line-height:1.6; }
.ed-text::placeholder{ color:var(--mute); font-family:var(--f-body); font-size:1.2rem; }
.ed-hint{ font-family:var(--f-mono); font-size:.7rem; letter-spacing:.04em; color:var(--mute); margin:0; }
.ed-details{ margin-top:auto; border-top:1px solid var(--line); padding-top:1rem; }
.ed-details summary{ font-family:var(--f-mono); font-size:.66rem; letter-spacing:.1em; text-transform:uppercase; color:var(--mute); cursor:pointer; }
.ed-details-body{ display:flex; flex-direction:column; gap:.8rem; padding-top:1.1rem; }
.ed-row{ display:flex; gap:.7rem; flex-wrap:wrap; }
.ed-ctl{ display:flex; flex-direction:column; gap:.3rem; font-family:var(--f-mono); font-size:.6rem; letter-spacing:.1em; text-transform:uppercase; color:var(--mute); }
.ed-ctl select{ font-family:var(--f-body); font-size:.9rem; text-transform:none; letter-spacing:0; color:var(--ink); background:var(--paper-2); border:1px solid var(--line); border-radius:8px; padding:.4rem .55rem; }
.ed-field{ font-family:var(--f-body); font-size:1rem; color:var(--ink); background:var(--paper-2); border:1px solid var(--line); border-radius:8px; padding:.55rem .7rem; }
.ed-check{ display:flex; align-items:center; gap:.5rem; font-size:.88rem; color:var(--ink-soft); }
.ed-mini{ align-self:flex-start; font-family:var(--f-mono); font-size:.62rem; letter-spacing:.08em; text-transform:uppercase; background:transparent; border:1px solid var(--line); color:var(--ink-soft); border-radius:999px; padding:.4rem .8rem; cursor:pointer; }
.ed-del{ background:none; border:0; color:var(--mute); font-family:var(--f-mono); font-size:.62rem; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; padding:0; text-align:left; }
.ed-del:hover{ color:#C0392B; }

.ed-preview-col{ display:flex; flex-direction:column; }
.ed-seg{ display:flex; gap:.2rem; padding:.8rem max(1rem,2vw); border-bottom:1px solid var(--line); background:var(--paper); }
.ed-seg button{ font-family:var(--f-mono); font-size:.64rem; letter-spacing:.1em; text-transform:uppercase; background:transparent; border:0; color:var(--mute); padding:.4rem .7rem; cursor:pointer; border-radius:6px; }
.ed-seg button[aria-selected="true"]{ background:var(--ink); color:var(--paper); }

/* the living page preview — a real world behind real voices */
.ed-live{ position:relative; flex:1; overflow:auto; padding:6vh 2vw;
  background: color-mix(in oklab, var(--accent) 7%, #FBF6EC); }
.ed-live.dark{ background:#14161B; color:#ECE8DF; }
.ed-live .backdrop{ position:absolute !important; }
.ed-flow{ position:relative; z-index:1; max-width:34rem; margin:0 auto; display:flex; flex-direction:column; gap:.2rem; }
.ed-blank{ font-family:var(--f-mono); font-size:.8rem; color:var(--mute); text-align:center; }
/* single-column beats so voice sizes carry the transformation in a half-width panel */
.ed-live .beat{ display:block !important; padding-block:.5rem; animation:ed-rise .55s cubic-bezier(.2,.8,.3,1) both; }
.ed-live .words{ max-width:none !important; margin:0 auto; }
.ed-live .margin{ display:none; } /* margin doodles need the 3-track grid; hidden in the compact preview */
.ed-live.dark .v-speak, .ed-live.dark .v-whisper, .ed-live.dark .v-drift, .ed-live.dark .v-thought{ color:#ECE8DF; }
@keyframes ed-rise{ from{ opacity:0; transform:translateY(10px); } to{ opacity:1; transform:none; } }

.ed-words{ flex:1; overflow:auto; margin:0; padding:3vh max(1rem,2vw); font-family:var(--f-mono); font-size:.9rem; line-height:1.7; color:var(--ink-soft); white-space:pre-wrap; background:var(--paper-2); }

@media (max-width:900px){ .ed-grid{ grid-template-columns:1fr; } .ed-write{ border-right:0; border-bottom:1px solid var(--line); } .ed-live{ min-height:70vh; } }
@media (prefers-reduced-motion:reduce){ .ed-live .beat{ animation:none; } }
`;
