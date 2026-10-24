"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { createStoryAction, type StoryMode } from "@/app/write/actions";
import { MEDIUM_LABELS } from "@/lib/living/cast";
import { LivingEmbed } from "@/components/living/LivingEmbed";
import { WORLDS } from "@/lib/living/worlds";
import { track } from "@/lib/analytics/client";

/**
 * WRITER ENTRY — the two-stage journey (D9/D11).
 *   1 · WRITE   — paste; the editor reads automatically and surfaces Fixes
 *                 (mechanical, apply-all) and Sharpen (evocative, per-card),
 *                 voice intact. It looks like effort because it is.
 *   2 · REVEAL  — one "Bring it to life" → the living page. A single RESTYLE
 *                 control holds the three mutually-exclusive looks:
 *                 Auto (fast cast+palette) · Bespoke (Opus page) · Yours (pick).
 */

type Sharpen = { anchor: string; mode: "replace" | "add"; question: string; suggestion: string };
type Sug = { title: string; cleaned: string; notes: string; sharpen: Sharpen[] };
type Palette = { scheme?: "light" | "dark"; ground?: string; accent?: string; warm?: string; ambient?: "stars" | "rain" | "fog" | "motes" | "none"; silhouette?: string };

// Locate an anchor the model gave us inside the writer's actual text. The model
// quotes the anchor back approximately — a curly apostrophe where the text has a
// straight one, different capitalisation, collapsed spacing, an em-dash for a
// hyphen — so a literal indexOf misses and the suggestion silently no-ops. We
// match on a NORMALISED copy of the text while keeping a map back to the real
// offsets, so edits land on the original characters. Returns null only when the
// anchor genuinely isn't there.
function normMap(s: string): { norm: string; map: number[] } {
  let norm = ""; const map: number[] = []; let prevWs = false;
  for (let i = 0; i < s.length; i++) {
    let c = s[i];
    if (c === "’" || c === "‘" || c === "ʼ" || c === "`") c = "'";
    else if (c === "“" || c === "”") c = '"';
    else if (c === "–" || c === "—") c = "-";
    else if (c === "…") c = ".";
    if (/\s/.test(c)) { if (prevWs) continue; norm += " "; map.push(i); prevWs = true; }
    else { norm += c.toLowerCase(); map.push(i); prevWs = false; }
  }
  return { norm, map };
}
// token = a normalised word with its real offsets in the source text.
function tokenize(s: string): { w: string; i: number; j: number }[] {
  const out: { w: string; i: number; j: number }[] = [];
  const re = /\S+/g; let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const w = normMap(m[0]).norm.replace(/[^a-z0-9']/g, "");
    if (w) out.push({ w, i: m.index, j: m.index + m[0].length });
  }
  return out;
}
function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// two tokens count as "the same word" if equal or within a small edit distance
// (so a typo in the raw text still matches the model's corrected anchor).
const tokenEq = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 4 && lev(a, b) <= 2);

function findAnchor(text: string, anchorRaw: string): { start: number; end: number } | null {
  const anchor = anchorRaw.replace(/^[\s"'“”‘’.…]+|[\s"'“”‘’.…]+$/g, "");
  if (!anchor) return null;
  // 1) fast path: exact, normalised substring (quotes/case/spacing tolerant).
  const A = normMap(text);
  const needle = normMap(anchor).norm.trim();
  if (needle) {
    const idx = A.norm.indexOf(needle);
    if (idx >= 0) return { start: A.map[idx], end: A.map[idx + needle.length - 1] + 1 };
  }
  // 2) fuzzy path: best window of word-tokens, tolerating typos & a dropped word.
  const at = tokenize(text), bw = tokenize(anchor).map((t) => t.w);
  if (!bw.length || !at.length) return null;
  let best = { score: 0, s: -1, e: -1 };
  for (let p = 0; p + bw.length <= at.length; p++) {
    let sc = 0;
    for (let k = 0; k < bw.length; k++) if (tokenEq(at[p + k].w, bw[k])) sc++;
    if (sc > best.score) best = { score: sc, s: at[p].i, e: at[p + bw.length - 1].j };
  }
  return best.score >= Math.max(1, Math.ceil(bw.length * 0.6)) ? { start: best.s, end: best.e } : null;
}
const applyReplace = (t: string, anchor: string, to: string) => { const m = findAnchor(t, anchor); return m ? t.slice(0, m.start) + to + t.slice(m.end) : t; };
const applyAdd = (t: string, anchor: string, line: string) => {
  const m = findAnchor(t, anchor); if (!m) return t.replace(/\s*$/, "") + "\n\n" + line;
  let end = t.indexOf("\n\n", m.end); if (end < 0) end = t.length;
  return t.slice(0, end).replace(/\s+$/, "") + "\n\n" + line + t.slice(end);
};
const applySharpenTo = (t: string, s: Sharpen, replacement: string) => s.mode === "add" ? applyAdd(t, s.anchor, replacement) : applyReplace(t, s.anchor, replacement);

const DEFAULT_PLACEHOLDER = "start anywhere — a smell, something someone said, the worst part, the thing you keep replaying.\n\nseparate paragraphs with a blank line.";
const STASH = "lp-make";

function MakeInner() {
  const searchParams = useSearchParams();
  const [pending, startCreate] = useTransition();
  const [stage, setStage] = useState<"write" | "reveal">("write");
  const [mode, setMode] = useState<StoryMode>("story");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  // ── Write stage: the editor's suggestions ──
  const [sug, setSug] = useState<Sug | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [showSharpen, setShowSharpen] = useState(false);
  const [editingSharpen, setEditingSharpen] = useState<number | null>(null);
  const [customText, setCustomText] = useState("");
  const [prevText, setPrevText] = useState<string | null>(null);
  const [justApplied, setJustApplied] = useState<string | null>(null); // transient "✓ applied" confirmation
  const suggestedFor = useRef("");

  // clear the applied-confirmation after a moment
  useEffect(() => { if (!justApplied) return; const t = setTimeout(() => setJustApplied(null), 2600); return () => clearTimeout(t); }, [justApplied]);

  // ── Reveal stage: the look ──
  const [worldSel, setWorldSel] = useState<string>("auto");
  const [aiPalette, setAiPalette] = useState<Palette | null>(null);
  const [genHtml, setGenHtml] = useState<string | null>(null);
  const [castBusy, setCastBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [restyleOpen, setRestyleOpen] = useState(false);
  const castedFor = useRef("");
  const autoFired = useRef(false);

  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  // rehydrate a draft from before an auth bounce
  useEffect(() => {
    try { const raw = sessionStorage.getItem(STASH); if (raw) { const d = JSON.parse(raw) as { mode?: StoryMode; title?: string; text?: string }; if (d.mode) setMode(d.mode); if (d.title) setTitle(d.title); if (d.text) setText(d.text); } } catch {}
  }, []);

  // AUTO-SUGGEST on paste/pause (Sonnet). Debounced; only when the words changed.
  useEffect(() => {
    if (stage !== "write") return;
    if (words < 12 || text === suggestedFor.current) return;
    const t = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await fetch("/api/brain/suggest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, title }) });
        const data = await res.json();
        suggestedFor.current = text;
        if (data.ok) setSug({ title: data.title, cleaned: data.cleaned, notes: data.notes, sharpen: data.sharpen });
      } catch {} finally { setSuggesting(false); }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, stage]);

  const applyReshape = () => {
    if (!sug || sug.cleaned.trim() === text.trim()) return;
    // Mark the reshaped text as already-suggested so the auto-suggest effect does
    // NOT immediately re-run and resurface the same chip/cards — that re-ask was
    // what made a landed reshape feel like it "reverted". The sharpen cards we
    // already have still anchor fine to the reshaped text.
    setPrevText(text); suggestedFor.current = sug.cleaned; setText(sug.cleaned); setJustApplied("tidied & reshaped into paragraphs");
  };
  // forceOnMiss: when even the normalised matcher can't find a "replace"
  // anchor, append the line rather than no-op, so the click always does
  // something and the card can clear. Used by the explicit "apply mine" path.
  const applyS = (i: number, replacement: string, forceOnMiss = false) => {
    if (!sug || !replacement.trim()) return; const s = sug.sharpen[i];
    let next = applySharpenTo(text, s, replacement.trim());
    if (next === text) {
      // Couldn't locate the line. First try: open type-yourself seeded with the
      // suggestion so the writer can place it — never a silent no-op.
      if (!forceOnMiss) { setEditingSharpen(i); setCustomText(replacement.trim()); return; }
      // They confirmed anyway: append it so the thought isn't lost.
      next = text.replace(/\s*$/, "") + "\n\n" + replacement.trim();
    }
    setPrevText(text); suggestedFor.current = next; setText(next);
    setEditingSharpen(null); setSug({ ...sug, sharpen: sug.sharpen.filter((_, j) => j !== i) });
    setJustApplied("added to your story — see it in the preview");
  };
  const useSharpen = (i: number) => { if (sug) applyS(i, sug.sharpen[i].suggestion); };
  const applyCustom = (i: number) => applyS(i, customText, true);
  const dismissSharpen = (i: number) => { setEditingSharpen(null); if (sug) setSug({ ...sug, sharpen: sug.sharpen.filter((_, j) => j !== i) }); };
  const startTypeYourself = (i: number) => { if (!sug) return; setEditingSharpen(i); setCustomText(sug.sharpen[i].suggestion); };
  const undo = () => { if (prevText != null) { suggestedFor.current = prevText; setText(prevText); setPrevText(null); } };

  // ── Reveal: Auto cast (Sonnet, fast) ──
  const castAI = async () => {
    if (!text.trim() || castBusy) return;
    setCastBusy(true); setNote("reading your story…"); setGenHtml(null);
    try {
      const res = await fetch("/api/brain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, title }) });
      const data = await res.json();
      castedFor.current = text;
      if (data.ok) { setWorldSel(data.cast.style); setAiPalette(data.cast.palette ?? null); setNote(`✨ ${data.cast.style} — ${data.cast.rationale}`); }
      else if (data.reason === "no-key") setNote("Add ANTHROPIC_API_KEY to .env.local and restart.");
      else setNote(`Couldn't read it (${data.reason}) — showing the live engine.`);
    } catch { setNote("The brain is unreachable right now."); } finally { setCastBusy(false); }
  };

  const bringToLife = () => {
    setStage("reveal");
    if (castedFor.current !== text && !genHtml) castAI(); // land on Auto
  };

  const cont = () => {
    try { sessionStorage.setItem(STASH, JSON.stringify({ mode, title, text })); } catch {}
    track("make_continue", { mode, world: worldSel, words });
    startCreate(() => { createStoryAction(mode, { source: text, title, world: worldSel in WORLDS ? worldSel : null }); });
  };

  // resume after auth
  useEffect(() => {
    if (autoFired.current) return;
    const m = searchParams.get("mode");
    if (m && ["story", "moment", "thought", "freeform"].includes(m)) {
      autoFired.current = true;
      let d: { mode?: StoryMode; title?: string; text?: string } = {};
      try { d = JSON.parse(sessionStorage.getItem(STASH) ?? "{}"); } catch {}
      startCreate(() => { createStoryAction((d.mode ?? (m as StoryMode)), { source: d.text ?? "", title: d.title ?? "", world: null }); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const canReshape = !!(sug && sug.cleaned.trim() !== text.trim());
  const nSharp = sug?.sharpen.length ?? 0;

  return (
    <main className="mk" data-stage={stage}>
      <style>{CSS}</style>
      <nav className="mk-nav">
        <Link href="/" className="mk-logo">Living Page</Link>
        <span className="mk-steps">
          <b className={stage === "write" ? "on" : ""}>1 · Write</b> <i>→</i> <b className={stage === "reveal" ? "on" : ""}>2 · Reveal</b>
        </span>
        {stage === "write" ? (
          <button className="mk-cta mk-shimmer" onClick={bringToLife} disabled={!text.trim()} type="button"><span>Bring it to life →</span></button>
        ) : (
          <span className="mk-navr">
            <button className="mk-ghost" onClick={() => setStage("write")} type="button">← Edit</button>
            <button className="mk-cta" onClick={cont} disabled={!text.trim() || pending} type="button">{pending ? "opening…" : "Continue →"}</button>
          </span>
        )}
      </nav>

      {stage === "write" ? (
        <section className="mk-write-grid">
          <div className="mk-compose">
          {/* the editor's presence */}
          <div className="mk-voice">
            <span className={`mk-dot${suggesting ? " busy" : ""}`} />
            <div className="mk-voice-body">
              {words < 12 ? (
                <><div className="mk-voice-h">Tell it how it happened.</div><div className="mk-voice-sub">Paste or write — I'll read along and help as you go.</div></>
              ) : suggesting && !sug ? (
                <><div className="mk-voice-h">Reading your story…</div><div className="mk-voice-sub">one moment</div></>
              ) : !canReshape && nSharp === 0 ? (
                <><div className="mk-voice-h">Looks clean to me.</div><div className="mk-voice-sub">Ready whenever you are — bring it to life.</div></>
              ) : (
                <>
                  <div className="mk-voice-h">I read your story{suggesting ? " again…" : " — twice."}</div>
                  <div className="mk-voice-sub">{sug?.notes || (canReshape ? "I'd tidy the spelling and shape the breaks." : "")}{nSharp ? `${sug?.notes || canReshape ? " " : ""}And ${nSharp} place${nSharp > 1 ? "s" : ""} it could hit harder.` : ""}</div>
                  <div className="mk-chips">
                    {canReshape ? <button className="mk-chip fix" onClick={applyReshape} type="button">✦ tidy &amp; reshape</button> : null}
                    {nSharp ? <button className={`mk-chip sharp${showSharpen ? " on" : ""}`} onClick={() => setShowSharpen((v) => !v)} type="button"><b>{nSharp}</b> ways to make it sing</button> : null}
                    {sug?.title && !title ? <button className="mk-chip title" onClick={() => setTitle(sug.title)} type="button">title: “{sug.title}”</button> : null}
                    {prevText != null ? <button className="mk-undo" onClick={undo} type="button">⟲ undo</button> : null}
                  </div>
                  {justApplied ? <div className="mk-applied">✓ {justApplied}</div> : null}
                </>
              )}
            </div>
          </div>

          {/* sharpen cards — a suggestion, type-yourself, or keep mine */}
          {showSharpen && nSharp ? (
            <div className="mk-sharpen">
              {sug!.sharpen.map((s, i) => (
                <div key={i} className="mk-sc">
                  <div className="mk-sc-q">{s.question} <span className="mk-sc-mode">{s.mode === "add" ? "add a line" : "sharpen"}</span></div>
                  <div className="mk-sc-ph">{s.mode === "add" ? "after " : ""}“…{s.anchor}…”</div>
                  {editingSharpen === i ? (
                    <>
                      <textarea className="mk-sc-input" value={customText} onChange={(e) => setCustomText(e.target.value)} rows={2} autoFocus />
                      <div className="mk-sc-row">
                        <button className="mk-sc-use" onClick={() => applyCustom(i)} type="button">✓ apply mine</button>
                        <button className="mk-sc-x" onClick={() => setEditingSharpen(null)} type="button">cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mk-sc-sug">{s.suggestion}</div>
                      <div className="mk-sc-row">
                        <button className="mk-sc-use" onClick={() => useSharpen(i)} type="button">✓ use this</button>
                        <button className="mk-sc-ghost" onClick={() => startTypeYourself(i)} type="button">✎ type yourself</button>
                        <button className="mk-sc-x" onClick={() => dismissSharpen(i)} type="button">keep mine</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <p className="mk-field">Title</p>
          <input className="mk-title-in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" />
          <p className="mk-field">Your story</p>
          <textarea className="mk-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={DEFAULT_PLACEHOLDER} />
          <div className="mk-foot"><span>{words} {words === 1 ? "word" : "words"}</span></div>
          </div>

          {/* the live AUTO world, forming as you write (free, heuristic) */}
          <div className="mk-live">
            {text.trim()
              ? <LivingEmbed text={text} title={title || undefined} eyebrow="A living page" world={worldSel === "auto" ? undefined : worldSel} />
              : <div className="mk-live-empty"><p>your living page forms here as you write</p></div>}
          </div>
        </section>
      ) : (
        <section className="mk-reveal">
          <div className="mk-stage-embed">
            <LivingEmbed text={text} title={title || undefined} eyebrow="A living page" world={worldSel === "auto" ? undefined : worldSel} palette={aiPalette} html={genHtml} />
          </div>

          {/* the one RESTYLE control — Auto / Bespoke / Yours */}
          <div className="mk-restyle">
            <button className="mk-restyle-btn" onClick={() => setRestyleOpen((v) => !v)} type="button">
              {castBusy ? "reading…" : "✧ Restyle"}
            </button>
            {restyleOpen ? (
              <div className="mk-restyle-menu">
                <button onClick={() => { setRestyleOpen(false); setGenHtml(null); castAI(); }} type="button">
                  <b>Auto</b><span>read it and cast the right world — instant</span>
                </button>
                <div className="mk-restyle-yours">
                  <b>Yours</b>
                  <select value={worldSel} onChange={(e) => { setWorldSel(e.target.value); setAiPalette(null); setGenHtml(null); setRestyleOpen(false); }}>
                    <option value="auto">auto</option>
                    <optgroup label="worlds">{Object.values(WORLDS).map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}</optgroup>
                    <optgroup label="mediums">{Object.entries(MEDIUM_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</optgroup>
                  </select>
                </div>
              </div>
            ) : null}
          </div>
          {note ? <p className="mk-note">{note}</p> : null}
        </section>
      )}
    </main>
  );
}

export default function Make() {
  return <Suspense fallback={<main className="mk" />}><MakeInner /></Suspense>;
}

const CSS = `
.mk{ --paper:#FBF6EC; --paper-2:#fff; --ink:#1A1816; --ink-soft:#4A4642; --mute:#8A837A; --line:#E7DFCE; --electric:#2D6BF0; --fix:#C0443A; --warm:#E7A33C; --good:#3E8E5A;
  --f-disp:var(--font-disp),Georgia,serif; --f-body:var(--font-body),Georgia,serif; --f-hand:var(--font-hand),cursive; --f-mono:var(--font-mono),ui-monospace,monospace;
  min-height:100vh; background:var(--paper); color:var(--ink); font-family:var(--f-body); display:flex; flex-direction:column; }
.mk[data-stage="reveal"]{ height:100vh; overflow:hidden; }
.mk-nav{ display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem max(1rem,4vw); border-bottom:1px solid var(--line); background:var(--paper); z-index:5; }
.mk-logo{ font-family:var(--f-hand); font-size:1.5rem; color:inherit; text-decoration:none; }
.mk-steps{ font-family:var(--f-mono); font-size:.68rem; letter-spacing:.1em; text-transform:uppercase; color:var(--mute); display:flex; gap:.5rem; align-items:center; }
.mk-steps b{ font-weight:400; } .mk-steps b.on{ color:var(--electric); } .mk-steps i{ opacity:.5; font-style:normal; }
.mk-navr{ display:flex; gap:.6rem; align-items:center; }
.mk-cta{ font-family:var(--f-mono); font-size:.72rem; letter-spacing:.06em; text-transform:uppercase; background:var(--ink); color:var(--paper); border:none; border-radius:999px; padding:.65rem 1.2rem; cursor:pointer; }
.mk-cta:disabled{ opacity:.4; cursor:default; }
.mk-ghost{ font-family:var(--f-mono); font-size:.7rem; letter-spacing:.04em; background:transparent; border:1px solid var(--line); color:var(--ink-soft); border-radius:999px; padding:.55rem 1rem; cursor:pointer; }

/* WRITE — split: composer left, the live auto world right */
.mk-write-grid{ flex:1; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.05fr); min-height:0; }
.mk-compose{ padding:4vh max(1.2rem,3vw) 9vh; }
.mk-compose .mk-voice, .mk-compose .mk-sharpen, .mk-compose .mk-field, .mk-compose .mk-title-in, .mk-compose .mk-text, .mk-compose .mk-foot{ max-width:42rem; }
.mk-live{ position:relative; border-left:1px solid var(--line); background:#0a0912; min-height:0; overflow:hidden; }
.mk-live iframe{ width:100%; height:100%; border:0; display:block; }
.mk-live-empty{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; text-align:center; padding:0 2rem; }
.mk-live-empty p{ color:rgba(255,255,255,.4); font-family:var(--f-mono); font-size:.72rem; letter-spacing:.1em; text-transform:uppercase; }
@media (min-width:900px){ .mk[data-stage="write"]{ height:100vh; overflow:hidden; } .mk-compose{ overflow-y:auto; } }
@media (max-width:900px){ .mk-write-grid{ grid-template-columns:1fr; } .mk-live{ border-left:none; border-top:1px solid var(--line); min-height:46vh; } }

/* shimmer on the reveal button */
.mk-shimmer{ position:relative; overflow:hidden; }
.mk-shimmer > span{ position:relative; z-index:1; }
.mk-shimmer::after{ content:""; position:absolute; inset:0; background:linear-gradient(110deg, transparent 30%, rgba(255,255,255,.4) 50%, transparent 70%); transform:translateX(-130%); animation:mk-shim 3.4s ease-in-out infinite; }
.mk-shimmer:disabled::after{ display:none; }
@keyframes mk-shim{ 0%{ transform:translateX(-130%) } 55%,100%{ transform:translateX(130%) } }
.mk-voice{ display:flex; gap:.85rem; align-items:flex-start; background:var(--paper-2); border:1px solid var(--line); border-radius:14px; padding:1rem 1.2rem; margin-bottom:2.2rem; box-shadow:0 6px 20px rgba(120,100,60,.06); }
.mk-dot{ width:12px; height:12px; border-radius:50%; margin-top:.4rem; flex:none; background:var(--good); box-shadow:0 0 0 0 rgba(62,142,90,.5); animation:mk-pulse 2.4s infinite; }
.mk-dot.busy{ background:var(--electric); box-shadow:0 0 0 0 rgba(45,107,240,.5); animation:mk-pulse 1s infinite; }
@keyframes mk-pulse{ 0%{box-shadow:0 0 0 0 rgba(62,142,90,.5)} 70%{box-shadow:0 0 0 8px rgba(62,142,90,0)} 100%{box-shadow:0 0 0 0 rgba(62,142,90,0)} }
.mk-voice-h{ font-family:var(--f-disp); font-size:1.3rem; line-height:1.2; }
.mk-voice-sub{ color:var(--ink-soft); font-size:.98rem; margin-top:.2rem; }
.mk-chips{ display:flex; gap:.5rem; margin-top:.85rem; flex-wrap:wrap; align-items:center; }
.mk-chip{ font-family:var(--f-mono); font-size:.68rem; letter-spacing:.03em; border:1px solid var(--line); background:var(--paper); border-radius:999px; padding:.45rem .85rem; cursor:pointer; display:inline-flex; gap:.45rem; align-items:center; color:var(--ink-soft); }
.mk-chip b{ color:#fff; border-radius:999px; padding:0 .45rem; font-size:.66rem; }
.mk-chip.fix{ border-color:var(--fix); color:var(--fix); } .mk-chip.fix b{ background:var(--fix); }
.mk-chip.sharp{ border-color:var(--warm); color:#a56a16; } .mk-chip.sharp b{ background:var(--warm); } .mk-chip.sharp.on{ background:#fbeedd; }
.mk-chip.title{ border-style:dashed; }
.mk-undo{ font-family:var(--f-mono); font-size:.68rem; background:none; border:none; color:var(--mute); text-decoration:underline; cursor:pointer; }
.mk-applied{ font-family:var(--f-mono); font-size:.72rem; color:var(--good); margin-top:.6rem; animation:mkFade .3s ease; }
@keyframes mkFade{ from{ opacity:0; transform:translateY(-3px); } to{ opacity:1; transform:none; } }

.mk-sharpen{ display:flex; flex-direction:column; gap:.7rem; margin-bottom:2rem; }
.mk-sc{ background:var(--paper-2); border:1px solid var(--line); border-left:3px solid var(--warm); border-radius:10px; padding:.85rem 1rem; }
.mk-sc-q{ font-family:var(--f-disp); font-size:1.1rem; color:#a56a16; }
.mk-sc-mode{ font-family:var(--f-mono); font-size:.56rem; letter-spacing:.1em; text-transform:uppercase; color:#fff; background:var(--warm); border-radius:999px; padding:.1rem .5rem; vertical-align:middle; }
.mk-sc-ph{ font-family:var(--f-mono); font-size:.72rem; color:var(--mute); margin:.3rem 0; }
.mk-sc-sug{ font-style:italic; font-size:1.05rem; }
.mk-sc-row{ display:flex; gap:.5rem; margin-top:.7rem; }
.mk-sc-use{ font-family:var(--f-mono); font-size:.66rem; background:var(--good); color:#fff; border:none; border-radius:999px; padding:.4rem .85rem; cursor:pointer; }
.mk-sc-x{ font-family:var(--f-mono); font-size:.66rem; background:transparent; border:1px solid var(--line); color:var(--ink-soft); border-radius:999px; padding:.4rem .85rem; cursor:pointer; }
.mk-sc-ghost{ font-family:var(--f-mono); font-size:.66rem; background:transparent; border:1px solid var(--warm); color:#a56a16; border-radius:999px; padding:.4rem .85rem; cursor:pointer; }
.mk-sc-input{ width:100%; margin-top:.5rem; border:1px solid var(--line); border-radius:8px; padding:.55rem .65rem; font-family:var(--f-body); font-size:1.05rem; line-height:1.5; resize:vertical; outline:none; background:var(--paper); color:var(--ink); }

.mk-field{ font-family:var(--f-mono); font-size:.62rem; letter-spacing:.14em; text-transform:uppercase; color:var(--mute); margin:0 0 .4rem; }
.mk-title-in{ font-family:var(--f-disp); font-size:2rem; border:none; border-bottom:1px solid var(--line); background:transparent; width:100%; padding:.1rem 0 .5rem; margin-bottom:1.8rem; outline:none; color:var(--ink); }
.mk-text{ width:100%; min-height:40vh; resize:vertical; border:none; outline:none; background:transparent; color:var(--ink); font-family:var(--f-body); font-size:1.28rem; line-height:1.8; }
.mk-text::placeholder{ color:var(--mute); }
.mk-foot{ margin-top:1rem; font-family:var(--f-mono); font-size:.7rem; letter-spacing:.05em; color:var(--mute); }

/* REVEAL */
.mk-reveal{ flex:1; position:relative; min-height:0; background:#0a0912; }
.mk-stage-embed{ position:absolute; inset:0; }
.mk-stage-embed iframe{ width:100%; height:100%; border:0; display:block; }
.mk-restyle{ position:absolute; top:1rem; right:1rem; z-index:10; }
.mk-restyle-btn{ font-family:var(--f-mono); font-size:.72rem; letter-spacing:.06em; background:rgba(20,18,16,.72); color:#fff; border:1px solid rgba(255,255,255,.25); border-radius:999px; padding:.6rem 1.1rem; cursor:pointer; -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); }
.mk-restyle-menu{ position:absolute; top:3rem; right:0; width:19rem; background:var(--paper-2); border:1px solid var(--line); border-radius:14px; box-shadow:0 20px 50px rgba(0,0,0,.4); overflow:hidden; }
.mk-restyle-menu button, .mk-restyle-yours{ display:flex; flex-direction:column; align-items:flex-start; gap:.15rem; width:100%; text-align:left; background:transparent; border:none; border-bottom:1px solid var(--line); padding:.9rem 1.1rem; cursor:pointer; }
.mk-restyle-menu button:hover{ background:var(--paper); }
.mk-restyle-menu b{ font-family:var(--f-body); font-size:1rem; color:var(--ink); }
.mk-restyle-menu span{ font-size:.82rem; color:var(--ink-soft); }
.mk-restyle-yours{ gap:.4rem; }
.mk-restyle-yours select{ font-family:var(--f-mono); font-size:.76rem; border:1px solid var(--line); border-radius:8px; padding:.4rem .5rem; background:var(--paper); color:var(--ink); width:100%; }
.mk-note{ position:absolute; left:1rem; bottom:1rem; right:1rem; z-index:9; font-family:var(--f-mono); font-size:.72rem; letter-spacing:.02em; color:#fff; background:rgba(20,18,16,.6); border-radius:10px; padding:.6rem .9rem; -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); max-width:40rem; }
@media (max-width:640px){ .mk-restyle-menu{ width:min(19rem,88vw); } }
`;
