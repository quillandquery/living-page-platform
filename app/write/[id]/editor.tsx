"use client";

import Link from "next/link";
import React, { useMemo, useState, useTransition } from "react";
import { annotate, toBlocks } from "@/lib/annotate";
import { FormatSelect } from "@/components/living/FormatSelect";
import { FormatRender } from "@/components/living/formats/render";
import { getBackdrop } from "@/lib/backdrops";
import { BACKDROP_NAMES, BACKDROPS } from "@/lib/backdrops";
import type { Block } from "@/lib/story-blocks.mjs";
import type { StoryRow } from "@/lib/types";
import { extractStoryProfile } from "@/lib/semantic-profile";
import { generateArtDirection, describeArtDirection, detectRegister } from "@/lib/art-direction/generate";
import { FORMATS, FORMAT_KEYS, fittingFormats, resolveFormat, inferFormat, curatedFormats, type FormatKey } from "@/lib/formats";
import { MOODS as ART_MOODS, MOOD_ATMOSPHERE, type MoodKey } from "@/lib/art-direction/atmosphere";
import {
  saveDraftAction, publishAction, unpublishAction, deleteStoryAction,
  createClaimLinkAction, revokeClaimLinkAction,
  type SaveInput,
} from "../actions";
import { track } from "@/lib/analytics/client";

/**
 * THE STUDIO — write-first (PRD v2 §10, §13, §14).
 *
 * Left: you write. Right: the page, alive — the world painted behind it, the
 * colour, the voices, lines arriving as you type. Everything technical is
 * folded into one quiet "Details". Nothing mentions beats or voice budgets.
 */

const PROMPT = "start anywhere — a smell, something someone said, the worst part, the thing you keep replaying.\n\ni thought i wanted to leave.\nturns out i just wanted someone to ask me to stay.";

// The Mood/World/Visuals dropdowns are the writer-facing surface (PRD §14);
// underneath, `lib/art-direction/generate.ts` is now the one engine that
// picks environment/atmosphere/art-style/artwork/ambient-motion/material/
// composition/signature together, so "auto" gets the full Story Visual
// System 2.0 treatment instead of an accent-and-density guess.
const MOODS = ["auto", ...ART_MOODS] as const;
type Mood = (typeof MOODS)[number];
const VISUALS = ["auto", "minimal", "illustrated", "collage", "maximal"] as const;
type Visual = (typeof VISUALS)[number];
const FORMATS_UI = ["auto", ...FORMAT_KEYS] as const;
type FmtSel = (typeof FORMATS_UI)[number];

const MOOD_SPEC = MOOD_ATMOSPHERE;
const VISUAL_DENSITY: Record<Exclude<Visual, "auto">, number> = { minimal: 2, illustrated: 6, collage: 8, maximal: 10 };

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
  beats[0].ink = "accent";  // the opening carries the world's primary colour
  // if still almost all plain, let one short punchy line shout
  if (voiced <= 1) {
    const punch = beats.slice(1).find((b) => b.voice === "speak" && b.text.split(/\s+/).length <= 9 && /[.!?]$/.test(b.text));
    if (punch) { punch.voice = "shout"; punch.ink = "accent2"; }
  }
  return out;
}

type Msg = { tone: "ok" | "bad"; text: string } | null;

export function Editor({ story, handle }: { story: StoryRow; handle: string }) {
  const [raw, setRaw] = useState(story.source);
  const [fmtSel, setFmt] = useState<FmtSel>("auto");
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
  const [reveal, setReveal] = useState(false);

  // — claim link (hand this piece to whoever actually wrote it) —
  const [claimToken, setClaimToken] = useState<string | null>(
    story.claim_status === "pending" ? story.claim_token : null,
  );
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const claimedBy = story.claim_status === "claimed"; // this row already changed hands once

  async function getClaimLink() {
    setClaimBusy(true);
    setClaimMsg(null);
    const res = await createClaimLinkAction(story.id);
    setClaimBusy(false);
    if (res.ok) setClaimToken(res.token);
    else setClaimMsg(res.message);
  }
  async function copyClaimLink() {
    if (!claimToken) return;
    const url = `${window.location.origin}/claim/${claimToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setClaimMsg("Copied.");
    } catch {
      setClaimMsg(url); // clipboard blocked — at least show it to copy by hand
    }
  }
  async function revokeClaim() {
    setClaimBusy(true);
    const res = await revokeClaimLinkAction(story.id);
    setClaimBusy(false);
    if (res.ok) { setClaimToken(null); setClaimMsg("Link revoked — it no longer opens."); }
    else setClaimMsg(res.message);
  }

  // The one engine, Auto or nudged: a manual World/Mood pick overrides just
  // that axis and still lets everything downstream (art style, artwork,
  // ambient motion, material, composition, signature) follow from it.
  const artDirection = useMemo(() => {
    const profile = extractStoryProfile(raw);
    return generateArtDirection(raw, profile, {
      environmentOverride: worldSel === "auto" ? undefined : worldSel,
      moodOverride: moodSel === "auto" ? undefined : (moodSel as MoodKey),
      visualIntensity: visSel === "auto" ? undefined : visSel,
      mode: story.type,
    });
  }, [raw, worldSel, moodSel, visSel, story.type]);

  // the register (narrative vs reflective) the words are in — the mode picks
  // it when decisive, the writing decides otherwise. Feeds the voice pass so
  // an essay/credo isn't read like a travel diary.
  const register = useMemo(() => detectRegister(raw, extractStoryProfile(raw), story.type), [raw, story.type]);

  const mood = artDirection.atmosphere.mood as Mood;
  const spec = MOOD_SPEC[mood as Exclude<Mood, "auto">];
  const world = artDirection.environment.key;
  const accent = artDirection.accent;
  const density = visSel === "auto" ? spec.density : VISUAL_DENSITY[visSel];
  const budget = spec.budget;
  const dark = getBackdrop(world)?.scheme === "dark";

  const blocks = useMemo(
    () => dramatize(toBlocks(annotate(raw, { doodleDensity: density, voiceBudget: budget / 100, register }))),
    [raw, density, budget, register],
  );

  // Format is the one explicit choice now (palette/style follow automatically).
  const fitting = useMemo(() => fittingFormats(blocks), [blocks]);
  const format = resolveFormat(fmtSel === "auto" ? undefined : fmtSel, blocks, { look: artDirection.look });
  // The engine's own auto pick (world-driven, via inferFormat) is a
  // different heuristic from curatedFormats' mood-affinity ranking below —
  // "or let us decide" in the format-select modal has to reset to THIS,
  // not to whatever ranks #2 by mood, or "auto" would mean two different
  // things in two different places.
  const autoKey = inferFormat(blocks, artDirection.look);
  // The mood-curated rail is a taste-driven top few, not every format that
  // fits — so a story's real auto pick, or whatever the writer explicitly
  // chose in the Format control, can fall outside it. Guarantee both are
  // always present, so the modal never shows a tile other than `format` as
  // selected (which used to happen silently, with Publish still saving the
  // real `format` underneath the mismatch).
  const curated = useMemo(() => {
    const base = curatedFormats(blocks, artDirection.atmosphere?.mood);
    const extra = Array.from(new Set([format, autoKey])).filter((k) => !base.includes(k));
    return extra.length ? [...base, ...extra] : base;
  }, [blocks, artDirection, format, autoKey]);
  const selValue = format;

  const lines = raw.trim() ? raw.trim().split(/\n+/).filter(Boolean).length : 0;
  const hint = lines === 0 ? "" : lines < 4 ? "Your page is taking shape." : "Keep going. We'll handle the rest.";

  // Curated photography (lib/media-library.ts) is auto-on by default —
  // it follows the same Visuals dial as artwork density (§14): a piece
  // dialled (or auto-inferred) to "minimal" stays text-and-doodle only,
  // everything else earns a photo or two from the story's world. No AI
  // call, no per-story cost (D1/D2) — this is a static, tagged library.
  const imagery = artDirection.visualIntensity !== "minimal";
  const input = (): SaveInput => ({
    id: story.id, place, date, fragment, accent,
    backdrop: world, veil, source: raw, blocks, imagery,
    art_direction: { ...artDirection, format: fmtSel === "auto" ? undefined : fmtSel },
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
        <Link href={`/@${handle}`} className="ed-logo">Living Page</Link>
        <span className="ed-save">{pending ? "saving…" : status ? status.text : "draft"}</span>
        <span className="ed-bar-r">
          {published ? <Link href={`/@${handle}/${story.slug}`} className="ed-link" target="_blank">view →</Link> : null}
          <button className="ed-see" disabled={!raw.trim() || pending} onClick={() => { run(saveDraftAction, "save"); try { sessionStorage.setItem("lp-preview", JSON.stringify({ place, date, fragment, accent, backdrop: world, veil, blocks, seed: story.id, artDirection })); } catch {} setReveal(true); }}>See it come alive →</button>
          <button className="ed-ghost" disabled={pending} onClick={() => run(saveDraftAction, "save")}>Save</button>
          <button className="ed-pub" disabled={!raw.trim() || pending} onClick={() => { run(saveDraftAction, "save"); try { sessionStorage.setItem("lp-preview", JSON.stringify({ place, date, fragment, accent, backdrop: world, veil, blocks, seed: story.id, artDirection })); } catch {} setReveal(true); }}>{published ? "Update" : "Publish"}</button>
        </span>
      </header>

      <div className="ed-grid">
        {/* — write — */}
        <section className="ed-write">
          <textarea className="ed-text" value={raw} placeholder={PROMPT} spellCheck
                    onChange={(e) => setRaw(e.target.value)} autoFocus />
          {hint ? <p className="ed-hint">{hint}</p> : null}

          <details className="ed-details" open>
            <summary>Details &amp; shaping</summary>
            <div className="ed-details-body">
              <div className="ed-row">
                <label className="ed-ctl">Format
                  <select value={fmtSel} onChange={(e) => { const v = e.target.value as FmtSel; setFmt(v); track("engine_control_changed", { control: "format", value: v, story_id: story.id }); }}>
                    {FORMATS_UI.map((f) => <option key={f} value={f}>{f === "auto" ? `auto (${FORMATS[format].label})` : FORMATS[f as FormatKey].label}{f !== "auto" && !fitting.includes(f as FormatKey) ? " — n/a" : ""}</option>)}
                  </select>
                </label>
                <label className="ed-ctl">Mood
                  <select value={moodSel} onChange={(e) => { const v = e.target.value as Mood; setMood(v); track("engine_control_changed", { control: "mood", value: v, story_id: story.id }); }}>
                    {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label className="ed-ctl">Visuals
                  <select value={visSel} onChange={(e) => { const v = e.target.value as Visual; setVis(v); track("engine_control_changed", { control: "visuals", value: v, story_id: story.id }); }}>
                    {VISUALS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
                <label className="ed-ctl">World
                  <select value={worldSel} onChange={(e) => { const v = e.target.value; setWorld(v); track("engine_control_changed", { control: "world", value: v, story_id: story.id }); }}>
                    <option value="auto">auto ({world})</option>
                    {BACKDROP_NAMES.map((n) => <option key={n} value={n}>{BACKDROPS[n].label}</option>)}
                  </select>
                </label>
              </div>
              <input className="ed-field" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Title (a place, a moment)" />
              <input className="ed-field" value={fragment} onChange={(e) => setFragment(e.target.value)} placeholder="One line to draw people in" />
              <input className="ed-field" value={date} onChange={(e) => setDate(e.target.value)} placeholder="Date (optional)" />
              <label className="ed-check"><input type="checkbox" checked={veil} onChange={(e) => setVeil(e.target.checked)} /> lines arrive as you scroll</label>

              {!published ? (
                <div className="ed-claim">
                  {claimedBy ? (
                    <p className="ed-claim-msg">This piece has already been claimed — it belongs to whoever claimed it now.</p>
                  ) : (
                    <>
                      <p className="ed-claim-label">not your words? hand this piece to whoever wrote them</p>
                      {claimToken ? (
                        <div className="ed-claim-row">
                          <code className="ed-claim-link">/claim/{claimToken}</code>
                          <button type="button" className="ed-mini" disabled={claimBusy} onClick={copyClaimLink}>copy link</button>
                          <button type="button" className="ed-mini" disabled={claimBusy} onClick={revokeClaim}>revoke</button>
                        </div>
                      ) : (
                        <button type="button" className="ed-mini" disabled={claimBusy} onClick={getClaimLink}>
                          {claimBusy ? "…" : "get a claim link"}
                        </button>
                      )}
                      {claimMsg ? <p className="ed-claim-msg">{claimMsg}</p> : null}
                    </>
                  )}
                </div>
              ) : null}

              {published ? <button className="ed-mini" disabled={pending} onClick={() => run(unpublishAction, "unpublish", false)}>unpublish</button> : null}
              <form action={deleteStoryAction.bind(null, story.id)}>
                <button className="ed-del" onClick={(e) => { if (!confirm("Delete this piece for good?")) e.preventDefault(); }}>delete this piece</button>
              </form>
            </div>
          </details>

          {/* development-only render plan (§45) — never shown to a reader */}
          <details className="ed-details">
            <summary>Art direction (debug)</summary>
            <pre className="ed-artdir">{describeArtDirection(artDirection)}</pre>
          </details>
        </section>

        {/* — the living page — */}
        <section className="ed-preview-col">
          <div className="ed-seg">
            <button onClick={() => setTab("page")} aria-selected={tab === "page"}>the page</button>
            <button onClick={() => setTab("words")} aria-selected={tab === "words"}>your words</button>
          </div>
          {tab === "page" ? (
            <div className={`ed-live${dark ? " dark" : ""}`} style={{ ["--accent" as string]: accent }} key={`${world}-${format}`}>
              {raw.trim() ? (
                // The live "coming alive" preview goes through the SAME
                // format renderer the reader page does (FormatRender), so
                // the "Format" control actually changes this stage instead
                // of a generic flow that never varied with it. `scoped`
                // keeps the world's palette local to this box rather than
                // painting :root, and `contain: paint` below (CSS) is what
                // keeps the format's fixed-position layers (backdrop, hero
                // subject, letterbox bars, …) inside this pane instead of
                // covering the whole editor.
                <FormatRender
                  format={format}
                  scoped
                  chrome={false}
                  veil={veil}
                  place={place}
                  date={date}
                  fragment={fragment}
                  accent={accent}
                  backdrop={world}
                  blocks={blocks}
                  artDirection={artDirection}
                  seed={story.id}
                />
              ) : (
                <p className="ed-blank">Your living page appears here as you write.</p>
              )}
            </div>
          ) : (
            <pre className="ed-words">{raw || "(nothing written yet)"}</pre>
          )}
        </section>
      </div>
      {reveal ? (
        <div className="ed-reveal">
          <FormatSelect
            data={{ place, date, fragment, accent, backdrop: world, veil, blocks, seed: story.id, artDirection }}
            formats={curated}
            value={selValue}
            autoKey={autoKey}
            onSelect={(k) => setFmt(k)}
            onClose={() => setReveal(false)}
            onPublish={() => { run(publishAction, "publish", true); }}
            publishing={pending}
            published={published}
          />
        </div>
      ) : null}
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
@media (min-width:900px){ .ed-grid{ height:calc(100vh - 3.6rem); min-height:0; } .ed-write{ overflow-y:auto; } }
.ed-write{ padding:5vh max(1.2rem,3.5vw); display:flex; flex-direction:column; gap:1.2rem; border-right:1px solid var(--line); background:var(--paper); }
.ed-text{ width:100%; min-height:52vh; resize:vertical; border:0; outline:0; background:transparent; color:var(--ink);
  font-family:var(--f-disp); font-size:1.5rem; line-height:1.6; }
.ed-text::placeholder{ color:var(--mute); font-family:var(--f-body); font-size:1.2rem; }
.ed-hint{ font-family:var(--f-mono); font-size:.7rem; letter-spacing:.04em; color:var(--mute); margin:0; }
.ed-details{ margin-top:1.4rem; border-top:1px solid var(--line); padding-top:1rem; }
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
.ed-artdir{ font-family:var(--f-mono); font-size:.66rem; line-height:1.6; color:var(--ink-soft); white-space:pre-wrap; margin:.6rem 0 0; }
.ed-claim{ display:flex; flex-direction:column; gap:.5rem; padding:.9rem; border:1px dashed var(--line); border-radius:10px; background:var(--paper-2); }
.ed-claim-label{ font-family:var(--f-mono); font-size:.66rem; letter-spacing:.04em; color:var(--mute); margin:0; }
.ed-claim-row{ display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
.ed-claim-link{ font-family:var(--f-mono); font-size:.78rem; color:var(--ink); background:var(--paper); border:1px solid var(--line); border-radius:6px; padding:.3rem .55rem; word-break:break-all; }
.ed-claim-msg{ font-family:var(--f-mono); font-size:.66rem; color:var(--electric); margin:0; }

.ed-preview-col{ display:flex; flex-direction:column; }
.ed-seg{ display:flex; gap:.2rem; padding:.8rem max(1rem,2vw); border-bottom:1px solid var(--line); background:var(--paper); }
.ed-seg button{ font-family:var(--f-mono); font-size:.64rem; letter-spacing:.1em; text-transform:uppercase; background:transparent; border:0; color:var(--mute); padding:.4rem .7rem; cursor:pointer; border-radius:6px; }
.ed-seg button[aria-selected="true"]{ background:var(--ink); color:var(--paper); }

/* the living page preview — a real world behind real voices */
.ed-live{ position:relative; flex:1; overflow-y:scroll; overflow-x:hidden; scrollbar-gutter:stable; padding:6vh 2vw;
  background: color-mix(in oklab, var(--accent) 7%, #FBF6EC);
  /* This box now renders a real format (FormatRender), and every format's
     world layers (backdrop, hero subject, material grain, a format's own
     full-bleed chrome like film's letterbox bars) are position:fixed,
     meant to fill whatever they're staged in. contain:paint makes THIS
     element that stage: it becomes the containing block for every fixed
     descendant and clips paint to its own box, so nothing escapes into the
     rest of the editor -- no per-layer override list to maintain as formats
     are added. */
  contain: paint; }
.ed-live.dark{ background:#14161B; color:#ECE8DF; }
.ed-live .frame{ max-width:34rem; }
.ed-live .flow{ gap:.2rem; }
.ed-blank{ font-family:var(--f-mono); font-size:.8rem; color:var(--mute); text-align:center; padding-top:8vh; }
/* single-column beats so voice sizes carry the transformation in a half-width panel */
.ed-live .beat{ display:block !important; padding-block:.5rem; animation:ed-rise .55s cubic-bezier(.2,.8,.3,1) both; }
.ed-live .words{ max-width:none !important; margin:0 auto; }
.ed-live .margin{ display:none; } /* margin doodles need the 3-track grid; hidden in the compact preview */
.ed-live.dark .v-speak, .ed-live.dark .v-whisper, .ed-live.dark .v-drift, .ed-live.dark .v-thought{ color:#ECE8DF; }
@keyframes ed-rise{ from{ opacity:0; transform:translateY(10px); } to{ opacity:1; transform:none; } }

.ed-words{ flex:1; overflow:auto; margin:0; padding:3vh max(1rem,2vw); font-family:var(--f-mono); font-size:.9rem; line-height:1.7; color:var(--ink-soft); white-space:pre-wrap; background:var(--paper-2); }

.ed-write, .ed-live, .ed-words{ scrollbar-width:thin; scrollbar-color: rgba(90,80,70,.5) transparent; }
.ed-write::-webkit-scrollbar, .ed-live::-webkit-scrollbar, .ed-words::-webkit-scrollbar{ width:12px; }
.ed-write::-webkit-scrollbar-thumb, .ed-live::-webkit-scrollbar-thumb, .ed-words::-webkit-scrollbar-thumb{ background:rgba(90,80,70,.5); border-radius:8px; border:3px solid transparent; background-clip:padding-box; }
.ed-write::-webkit-scrollbar-thumb:hover, .ed-live::-webkit-scrollbar-thumb:hover, .ed-words::-webkit-scrollbar-thumb:hover{ background:rgba(90,80,70,.78); background-clip:padding-box; }
.ed-live.dark{ scrollbar-color: rgba(236,232,223,.55) transparent; }
.ed-live.dark::-webkit-scrollbar-thumb{ background:rgba(236,232,223,.5); border:3px solid transparent; background-clip:padding-box; }
.ed-live.dark::-webkit-scrollbar-thumb:hover{ background:rgba(236,232,223,.8); background-clip:padding-box; }
.ed-see{ font-family:var(--f-mono); font-size:.66rem; letter-spacing:.08em; text-transform:uppercase; background:var(--electric); color:#fff; border:0; border-radius:999px; padding:.55rem 1.1rem; cursor:pointer; }
.ed-see:hover{ filter:brightness(1.08); }
.ed-see:disabled{ opacity:.5; cursor:default; }
.ed-reveal{ position:fixed; inset:0; z-index:100; overflow-y:auto; background:var(--paper); animation:ed-reveal-in .6s cubic-bezier(.2,.8,.25,1) both; }
@keyframes ed-reveal-in{ from{ opacity:0; } to{ opacity:1; } } /* opacity-only: a transform here would trap the fixed backdrop inside the overlay */
.ed-reveal-close{ position:fixed; top:1.1rem; left:1.1rem; z-index:101; font-family:var(--f-mono); font-size:.66rem; letter-spacing:.08em; text-transform:uppercase; background:rgba(20,18,16,.62); color:#fff; border:0; border-radius:999px; padding:.55rem 1rem; cursor:pointer; -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); }
.ed-reveal-close:hover{ background:rgba(20,18,16,.88); }
@media (max-width:900px){ .ed-grid{ grid-template-columns:1fr; } .ed-write{ border-right:0; border-bottom:1px solid var(--line); } .ed-live{ min-height:70vh; } }
@media (prefers-reduced-motion:reduce){ .ed-live .beat{ animation:none; } }
`;
