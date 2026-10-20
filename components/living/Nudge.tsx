"use client";

/**
 * THE QUIET EDITOR SITTING BESIDE THE WRITER.
 *
 * "Writer + editor, not writer + AI assistant" (§14). One small, embedded
 * card at a time — never a sidebar, never a chat transcript, never a score.
 * The card only ever asks; the writer's own words are what land in the
 * draft (`onRespond`), verbatim, appended as a new line. Nothing here
 * rewrites, polishes or invents (§13).
 *
 * `useWritingOpportunities` paces itself: it waits for real material, keeps
 * showing the same nudge until the writer resolves or skips it (so it
 * doesn't flicker as new detections come in), and won't surface the next
 * one until a little more has been written. "Skip" and "resolved" are
 * remembered per-story in localStorage only — never sent anywhere, never
 * a DB row (§16: draft ownership/privacy unchanged).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { detectOpportunities, type WritingOpportunity } from "@/lib/writing-opportunities";
import { detectFreeNlpOpportunities } from "@/lib/free-nlp-detectors";
import { suggestFallbackNudgesAction } from "@/app/write/ai-nudges-actions";

type NudgeState = { skipped: string[]; resolved: string[]; kept: string[]; responses: Record<string, string> };
const EMPTY_STATE: NudgeState = { skipped: [], resolved: [], kept: [], responses: {} };
const storageKey = (storyId: string) => `lp-nudges-${storyId}`;

function loadState(storyId: string): NudgeState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(storageKey(storyId));
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    return { skipped: parsed.skipped ?? [], resolved: parsed.resolved ?? [], kept: parsed.kept ?? [], responses: parsed.responses ?? {} };
  } catch { return EMPTY_STATE; }
}
function saveState(storyId: string, state: NudgeState) {
  try { window.localStorage.setItem(storageKey(storyId), JSON.stringify(state)); } catch { /* ignore */ }
}

export function useWritingOpportunities(raw: string, storyId: string) {
  const [debounced, setDebounced] = useState(raw);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(raw), 1100);
    return () => clearTimeout(t);
  }, [raw]);

  const [state, setState] = useState<NudgeState>(() => loadState(storyId));
  const [activeId, setActiveId] = useState<string | null>(null);

  // three tiers, in order: the curated heuristic (hand-tuned to this
  // product's voice) → a free, general prose-linting library (a wider net,
  // still local/instant/free) → only if BOTH found nothing, the opt-in
  // paid LLM fallback below.
  const opportunities = useMemo(() => detectOpportunities(debounced), [debounced]);
  const freeNlpOpportunities = useMemo(() => detectFreeNlpOpportunities(debounced), [debounced]);
  const wordCount = (debounced.match(/\S+/g) ?? []).length;
  const enoughMaterial = wordCount >= 25 || debounced.trim().split(/\n\s*\n/).filter(Boolean).length >= 2;

  // — the opt-in LLM fallback (D1 exception, user-approved): only ever
  // offered when the free, instant, local passes found nothing. Never fires
  // on its own; `requestFallback` is only called from a writer's click. —
  const [fallback, setFallback] = useState<WritingOpportunity[]>([]);
  const [fallbackFor, setFallbackFor] = useState<string | null>(null); // the debounced text a fallback result belongs to
  const [fallbackDeclinedFor, setFallbackDeclinedFor] = useState<string | null>(null);
  const [fallbackPending, setFallbackPending] = useState(false);

  const notDismissed = (o: WritingOpportunity) => !state.skipped.includes(o.id) && !state.resolved.includes(o.id);
  const heuristicCandidates = useMemo(() => opportunities.filter(notDismissed), [opportunities, state.skipped, state.resolved]);
  const freeNlpCandidates = useMemo(() => freeNlpOpportunities.filter(notDismissed), [freeNlpOpportunities, state.skipped, state.resolved]);
  const fallbackCandidates = useMemo(
    () => (fallbackFor === debounced ? fallback : []).filter(notDismissed),
    [fallback, fallbackFor, debounced, state.skipped, state.resolved],
  );
  const candidates = useMemo(
    () => [...heuristicCandidates, ...freeNlpCandidates, ...fallbackCandidates],
    [heuristicCandidates, freeNlpCandidates, fallbackCandidates],
  );

  const showFallbackOffer =
    enoughMaterial && heuristicCandidates.length === 0 && freeNlpCandidates.length === 0 && fallbackCandidates.length === 0 &&
    fallbackFor !== debounced && fallbackDeclinedFor !== debounced && !fallbackPending;

  async function requestFallback() {
    setFallbackPending(true);
    const text = debounced;
    const result = await suggestFallbackNudgesAction(text).catch(() => [] as WritingOpportunity[]);
    setFallback(result);
    setFallbackFor(text);
    setFallbackPending(false);
  }
  function declineFallback() { setFallbackDeclinedFor(debounced); }

  useEffect(() => {
    if (!enoughMaterial) { setActiveId(null); return; }
    if (activeId && candidates.some((o) => o.id === activeId)) return; // keep showing it
    if (candidates.length === 0) { setActiveId(null); return; }
    // No extra "words since last nudge" throttle here on purpose: the
    // debounce above already keeps a nudge from popping up mid-keystroke,
    // and only one is ever shown at a time. A throttle on TOP of that used
    // to mean that once a writer skipped/answered a nudge on a draft they'd
    // already finished (pasted in, or stopped adding to), the next queued
    // one — even though it was already sitting there, already detected —
    // would never appear until they typed a dozen more words. Dismissing a
    // nudge is an explicit action; it should always reveal the next one.
    setActiveId(candidates[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, enoughMaterial]);

  const active = candidates.find((o) => o.id === activeId) ?? null;

  function persist(next: NudgeState) { setState(next); saveState(storyId, next); }
  const skip = (id: string) => { persist({ ...state, skipped: [...state.skipped, id] }); setActiveId(null); };
  const keep = (id: string, quote: string) => {
    persist({ ...state, resolved: [...state.resolved, id], kept: [...state.kept, quote] });
    setActiveId(null);
  };
  const respond = (opportunity: WritingOpportunity, answer: string) => {
    persist({
      ...state,
      resolved: [...state.resolved, opportunity.id],
      responses: { ...state.responses, [opportunity.id]: answer },
    });
    setActiveId(null);
  };
  // Skipped/resolved nudges are remembered per-story on purpose (see the
  // header comment) — a reader revisiting their own draft shouldn't be
  // nagged by something they already decided about. That's also exactly
  // why re-testing the SAME draft can look like "detection got worse":
  // most of what used to show up is correctly staying dismissed. This is
  // the escape hatch for that — wipe this draft's nudge history and start
  // over, same as a first-ever pass over the text.
  const resetNudges = () => { persist(EMPTY_STATE); setActiveId(null); };

  const sensoryAnswers = opportunities
    .filter((o) => o.type === "imagery" && state.responses[o.id])
    .map((o) => state.responses[o.id]);
  const momentAnswers = opportunities
    .filter((o) => o.type === "moment" && state.responses[o.id])
    .map((o) => state.responses[o.id]);

  return {
    active, opportunities, skip, keep, respond, keptLines: state.kept, sensoryAnswers, momentAnswers,
    showFallbackOffer, fallbackPending, requestFallback, declineFallback, resetNudges,
  };
}

export function NudgeCard({
  opportunity, onRespond, onSkip, onKeep, onCut, onSuggest,
}: {
  opportunity: WritingOpportunity;
  onRespond: (text: string) => void;
  onSkip: () => void;
  onKeep?: () => void;
  /** repetition only — cuts the given (verbatim) quote from the draft.
   *  Optional so an older caller that doesn't pass it still gets the
   *  original dismiss-only behaviour rather than a broken button. */
  onCut?: (quote: string) => void;
  /** the opt-in "suggest a line" assist (`lib/ai/suggest-line.ts`, via
   *  `suggestNudgeLineAction`) — pre-fills the response textarea below;
   *  the writer's own "add detail" click is still what lands it in the
   *  draft. Optional for the same reason as `onCut`. */
  onSuggest?: (opportunity: WritingOpportunity) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestDeclined, setSuggestDeclined] = useState(false);
  const isBuried = opportunity.type === "buriedLine";
  const isRepetition = opportunity.type === "repetition";
  const isTension = opportunity.type === "tension";
  const showsInput = !isBuried && !isRepetition;

  async function requestSuggestion() {
    if (!onSuggest) return;
    setSuggesting(true);
    setSuggestDeclined(false);
    const line = await onSuggest(opportunity).catch(() => null);
    setSuggesting(false);
    if (line) setDraft(line);
    else setSuggestDeclined(true);
  }

  return (
    <div className="nudge">
      <style>{NUDGE_CSS}</style>
      <p className="nudge-obs">{opportunity.observation}</p>

      {opportunity.secondQuote ? (
        <div className="nudge-pair">
          <p className="nudge-quote">&ldquo;{opportunity.quote}&rdquo;</p>
          <p className="nudge-quote">&ldquo;{opportunity.secondQuote}&rdquo;</p>
        </div>
      ) : opportunity.quote ? (
        <p className="nudge-quote">&ldquo;{opportunity.quote}&rdquo;</p>
      ) : null}

      <p className="nudge-q">{opportunity.question}</p>

      {opportunity.quickPrompts?.length ? (
        <div className="nudge-chips">
          {opportunity.quickPrompts.map((p) => (
            <button key={p} type="button" className="nudge-chip" onClick={() => setDraft(p.replace(/\?$/, ": "))}>{p}</button>
          ))}
        </div>
      ) : null}

      {showsInput ? (
        <textarea
          className="nudge-input"
          placeholder="add a line, in your own words…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
        />
      ) : null}
      {showsInput && suggestDeclined ? <p className="nudge-hint">Couldn&rsquo;t get a suggestion just now — your own words work fine here.</p> : null}

      <div className="nudge-actions">
        {isBuried ? (
          <>
            <button type="button" className="nudge-btn primary" onClick={onKeep}>Keep</button>
            <button type="button" className="nudge-btn ghost" onClick={onSkip}>Ignore</button>
          </>
        ) : isRepetition ? (
          onCut && opportunity.secondQuote ? (
            <>
              <button type="button" className="nudge-btn" onClick={() => onCut(opportunity.secondQuote!)}>keep this</button>
              <button type="button" className="nudge-btn" onClick={() => onCut(opportunity.quote)}>keep that</button>
              <button type="button" className="nudge-btn ghost" onClick={onSkip}>leave it</button>
            </>
          ) : (
            <button type="button" className="nudge-btn ghost" onClick={onSkip}>Got it</button>
          )
        ) : isTension ? (
          <>
            <button type="button" className="nudge-btn primary" disabled={!draft.trim()} onClick={() => draft.trim() && onRespond(draft.trim())}>worth staying with</button>
            {onSuggest ? <button type="button" className="nudge-btn ghost" disabled={suggesting} onClick={requestSuggestion}>{suggesting ? "thinking…" : "suggest a line"}</button> : null}
            <button type="button" className="nudge-btn ghost" onClick={onSkip}>not now</button>
          </>
        ) : (
          <>
            <button type="button" className="nudge-btn primary" disabled={!draft.trim()} onClick={() => draft.trim() && onRespond(draft.trim())}>add detail</button>
            {onSuggest ? <button type="button" className="nudge-btn ghost" disabled={suggesting} onClick={requestSuggestion}>{suggesting ? "thinking…" : "suggest a line"}</button> : null}
            <button type="button" className="nudge-btn ghost" onClick={onSkip}>skip</button>
          </>
        )}
      </div>
    </div>
  );
}

/** The one visible trace of the LLM fallback (see lib/ai/nudge-fallback.ts)
 *  — honest about what it does ("sends this to an AI editor") rather than
 *  quietly doing it, and only ever fires on this explicit click. */
export function FallbackOfferCard({ pending, onAsk, onDecline }: { pending: boolean; onAsk: () => void; onDecline: () => void }) {
  return (
    <div className="nudge nudge-fallback">
      <style>{NUDGE_CSS}</style>
      <p className="nudge-obs">NOTHING OBVIOUS YET</p>
      <p className="nudge-q">Want a closer read? This sends the draft so far to an AI editor, just once, for this page.</p>
      <div className="nudge-actions">
        <button type="button" className="nudge-btn primary" disabled={pending} onClick={onAsk}>{pending ? "reading…" : "look closer"}</button>
        <button type="button" className="nudge-btn ghost" onClick={onDecline}>not now</button>
      </div>
    </div>
  );
}

const NUDGE_CSS = `
.nudge{ margin-top:1rem; padding:1rem 1.1rem; border-top:1px dashed var(--line); position:relative; animation:nudge-in .4s cubic-bezier(.2,.8,.3,1) both; }
@keyframes nudge-in{ from{ opacity:0; transform:translateY(6px); } to{ opacity:1; transform:none; } }
.nudge-obs{ font-family:var(--f-mono); font-size:.68rem; letter-spacing:.1em; text-transform:uppercase; color:var(--electric); margin:0 0 .55rem; }
.nudge-pair{ display:flex; flex-direction:column; gap:.35rem; margin:0 0 .5rem; }
.nudge-quote{ font-family:var(--f-disp); font-style:italic; font-size:1.02rem; line-height:1.45; color:var(--ink); margin:0; }
.nudge-q{ font-size:.95rem; color:var(--ink-soft); margin:0 0 .6rem; line-height:1.5; }
.nudge-chips{ display:flex; flex-wrap:wrap; gap:.4rem; margin-bottom:.6rem; }
.nudge-chip{ font-family:var(--f-mono); font-size:.62rem; letter-spacing:.04em; background:var(--paper-2); border:1px solid var(--line); color:var(--ink-soft); border-radius:999px; padding:.35rem .7rem; cursor:pointer; }
.nudge-chip:hover{ border-color:var(--electric); color:var(--electric); }
.nudge-input{ width:100%; font-family:var(--f-body); font-size:.95rem; color:var(--ink); background:var(--paper-2); border:1px solid var(--line); border-radius:8px; padding:.55rem .7rem; resize:vertical; margin-bottom:.6rem; }
.nudge-hint{ font-family:var(--f-mono); font-size:.68rem; color:var(--ink-soft); opacity:.75; margin:-.3rem 0 .6rem; }
.nudge-actions{ display:flex; flex-wrap:wrap; gap:.5rem; }
.nudge-btn{ font-family:var(--f-mono); font-size:.62rem; letter-spacing:.08em; text-transform:uppercase; border-radius:999px; padding:.45rem .9rem; cursor:pointer; border:1px solid var(--line); background:transparent; color:var(--ink-soft); }
.nudge-btn.primary{ background:var(--ink); color:var(--paper); border-color:var(--ink); }
.nudge-btn.primary:disabled{ opacity:.4; cursor:default; }
.nudge-btn:disabled{ opacity:.5; cursor:default; }
.nudge-btn.ghost:hover{ border-color:var(--electric); color:var(--electric); }
`;
