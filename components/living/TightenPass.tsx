"use client";

/**
 * THE TIGHTENING PASS (§8, extended) — a lightweight editing pass over a
 * finished first draft. Originally CUT REPETITION MODE only; now the full
 * second reading a real edit does: repetition, whether the strongest line
 * in each scene actually lands last (PUNCH), a physical beat under a
 * stated feeling (NOTIONS — a held breath, a shaking hand), worn phrasing,
 * evocative imagery, whether the whole piece has run long (LENGTH), and —
 * the one part that needs real judgment rather than pattern-matching —
 * whether a different section order would help (ORDER).
 *
 * The custody rule from the original pass still holds everywhere: nothing
 * here invents prose out of nothing. Repetition/punch/length only ever
 * move or remove sentences the writer already wrote (see the mechanical
 * helpers in `lib/writing-opportunities.ts`). Notions/phrasing/imagery
 * offer an opt-in AI-suggested line (`lib/ai/suggest-line.ts`, via
 * `suggestTightenLineAction`) that pre-fills an editable field — the draft
 * only ever receives what the writer explicitly accepts, same as the
 * in-flow nudges' "add detail". Order offers an opt-in AI-suggested
 * REORDERING (`lib/ai/suggest-reorder.ts`, via `suggestReorderAction`)
 * that is verified server-side to be a pure permutation of the writer's
 * own paragraphs — never new text — and, again, only ever applied on an
 * explicit "use this order" click. Proofread is the one tab that DOES let
 * an accepted click change existing words rather than only add/move/cut
 * whole sentences: it runs a real dictionary spellcheck plus two
 * mechanical grammar checks (`lib/proofread-heuristics.ts`) — free, local,
 * no AI, no API key needed at all — and only additionally asks an LLM when
 * one happens to be configured, purely as extra enrichment on top (see
 * `app/write/ai-tighten-actions.ts`'s `suggestProofreadAction`, which does
 * that merge). Either way every fix is either this writer's own text or a
 * real dictionary word, and only ever applied on an explicit "fix this"
 * click via the same `replaceSentenceInText` phrasing already uses.
 */
import { useEffect, useMemo, useState } from "react";
import {
  detectTightenOpportunities,
  analyzeLength,
  removeSentenceFromText,
  moveSentenceToParagraphEnd,
  replaceSentenceInText,
  insertAfterSentence,
  type WritingOpportunity,
} from "@/lib/writing-opportunities";
import { suggestTightenLineAction, suggestReorderAction, suggestProofreadAction } from "@/app/write/ai-tighten-actions";
import type { ReorderSuggestion } from "@/lib/ai/suggest-reorder";
import type { ProofreadItem } from "@/lib/proofread-heuristics";

type RepDecision = "a" | "b" | "merge" | "leave";
type Category = "repetition" | "punch" | "embodiment" | "phrasing" | "imagery" | "length" | "order" | "proofread";

const CATEGORIES: Category[] = ["repetition", "punch", "embodiment", "phrasing", "imagery", "length", "order", "proofread"];
const CATEGORY_LABEL: Record<Category, string> = {
  repetition: "Repeats",
  punch: "Punch",
  embodiment: "Notions",
  phrasing: "Phrasing",
  imagery: "Imagery",
  length: "Length",
  order: "Order",
  proofread: "Proofread",
};

export function TightenPass({
  raw, onApply, onClose,
}: {
  raw: string;
  onApply: (next: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(raw);
  function apply(next: string) { setText(next); onApply(next); }

  const opportunities = useMemo(() => detectTightenOpportunities(text), [text]);
  const length = useMemo(() => analyzeLength(text), [text]);

  const repetitionItems = useMemo(
    () => opportunities.filter((o): o is WritingOpportunity & { secondQuote: string } => o.type === "repetition" && !!o.secondQuote),
    [opportunities],
  );
  const punchItems = useMemo(
    () => opportunities.filter((o): o is WritingOpportunity & { secondQuote: string } => o.type === "punch" && !!o.secondQuote),
    [opportunities],
  );
  const embodimentItems = useMemo(() => opportunities.filter((o) => o.type === "embodiment"), [opportunities]);
  const phrasingItems = useMemo(() => opportunities.filter((o) => o.type === "phrasing"), [opportunities]);
  const imageryItems = useMemo(() => opportunities.filter((o) => o.type === "imagery"), [opportunities]);
  const lengthItems = length.status === "comfortable" ? [] : length.trimCandidates;

  // "decided" tracks a per-item outcome without removing the card from its
  // list — the writer sees what they already resolved, same as the
  // original repetition-only pass always did.
  const [decided, setDecided] = useState<Record<string, string>>({});
  const markDecided = (id: string, label: string) => setDecided((d) => ({ ...d, [id]: label }));
  const remaining = (list: { id: string }[]) => list.filter((o) => !decided[o.id]).length;

  // declared up here (ahead of its handlers, further down) only so `counts`
  // below can read it — the check/fix logic itself lives with the rest of
  // the proofread tab's handlers, near the order tab it mirrors.
  const [proofreadItems, setProofreadItems] = useState<ProofreadItem[]>([]);

  const counts: Record<Category, number> = {
    repetition: remaining(repetitionItems),
    punch: remaining(punchItems),
    embodiment: remaining(embodimentItems),
    phrasing: remaining(phrasingItems),
    imagery: remaining(imageryItems),
    length: remaining(lengthItems),
    order: 0,
    proofread: remaining(proofreadItems),
  };

  const [tab, setTab] = useState<Category>("repetition");
  const [autoPicked, setAutoPicked] = useState(false);
  useEffect(() => {
    if (autoPicked) return;
    setAutoPicked(true);
    // order and proofread never run on their own (both are an explicit,
    // opt-in "check" click) — never auto-select either just because a
    // stale count happens to be nonzero.
    const firstWithWork = CATEGORIES.find((c) => c !== "order" && c !== "proofread" && counts[c] > 0);
    if (firstWithWork) setTab(firstWithWork);
    // only ever runs once, on the first real detection pass — after that the
    // writer's own tab choice is respected even if that tab empties out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunities, length]);

  // ── repetition (unchanged from the original pass) ──────────────────
  function decideRepetition(o: WritingOpportunity & { secondQuote: string }, choice: RepDecision) {
    if (choice === "a") apply(removeSentenceFromText(text, o.secondQuote));
    if (choice === "b") apply(removeSentenceFromText(text, o.quote));
    markDecided(o.id,
      choice === "a" ? "Kept the first, cut the second." :
      choice === "b" ? "Kept the second, cut the first." :
      choice === "merge" ? "Marked to merge by hand — we won't rewrite it for you." :
      "Left as-is.");
  }

  // ── punch placement — mechanical move, no AI ────────────────────────
  function movePunch(o: WritingOpportunity & { secondQuote: string }) {
    apply(moveSentenceToParagraphEnd(text, o.quote, o.secondQuote));
    markDecided(o.id, "Moved it to the end.");
  }
  function leavePunch(o: WritingOpportunity) { markDecided(o.id, "Left as-is."); }

  // ── length — mechanical trim, no AI ─────────────────────────────────
  function cutWeak(o: WritingOpportunity) {
    apply(removeSentenceFromText(text, o.quote));
    markDecided(o.id, "Cut.");
  }
  function keepWeak(o: WritingOpportunity) { markDecided(o.id, "Kept."); }

  // ── notions / phrasing / imagery — opt-in suggest, writer accepts ───
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [declinedSuggest, setDeclinedSuggest] = useState<Record<string, boolean>>({});

  async function requestSuggestion(o: WritingOpportunity) {
    setPending((p) => ({ ...p, [o.id]: true }));
    const line = await suggestTightenLineAction({
      type: o.type, quote: o.quote, secondQuote: o.secondQuote, question: o.question,
    }).catch(() => null);
    setPending((p) => ({ ...p, [o.id]: false }));
    if (line) setDrafts((d) => ({ ...d, [o.id]: line }));
    else setDeclinedSuggest((d) => ({ ...d, [o.id]: true }));
  }
  function setDraft(id: string, value: string) { setDrafts((d) => ({ ...d, [id]: value })); }

  function acceptInsert(o: WritingOpportunity) {
    const val = (drafts[o.id] ?? "").trim();
    if (!val) return;
    apply(insertAfterSentence(text, o.quote, val));
    markDecided(o.id, "Added.");
  }
  function acceptReplace(o: WritingOpportunity) {
    const val = (drafts[o.id] ?? "").trim();
    if (!val) return;
    apply(replaceSentenceInText(text, o.quote, val));
    markDecided(o.id, "Reworded.");
  }
  function skip(o: WritingOpportunity) { markDecided(o.id, "Left as-is."); }

  // ── section order — the one genuinely AI-assisted, permutation-only op ─
  const paragraphs = useMemo(() => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean), [text]);
  const [orderPending, setOrderPending] = useState(false);
  const [orderResult, setOrderResult] = useState<ReorderSuggestion | null>(null);
  const [orderChecked, setOrderChecked] = useState(false);

  async function checkOrder() {
    setOrderPending(true);
    setOrderChecked(false);
    const res = await suggestReorderAction(paragraphs).catch(() => null);
    setOrderPending(false);
    setOrderChecked(true);
    setOrderResult(res);
  }
  function useNewOrder() {
    if (!orderResult) return;
    apply(orderResult.order.map((i) => paragraphs[i]).join("\n\n"));
    setOrderResult(null);
    setOrderChecked(false);
  }
  function keepOrder() { setOrderResult(null); }

  // ── proofread — a real dictionary spellcheck + mechanical grammar
  // checks (lib/proofread-heuristics.ts), free and local, no API key
  // needed; `suggestProofreadAction` additionally folds in an AI opinion
  // ONLY when a key happens to be configured, so this can't actually fail
  // the way an AI-only call could — no separate "couldn't check" state
  // needed. Runs once automatically the first time this tab is opened
  // (see the effect below), since it costs nothing to run, unlike Order's
  // AI-only reorder check. ─────────────────────────────────────────────
  const [proofreadPending, setProofreadPending] = useState(false);
  const [proofreadChecked, setProofreadChecked] = useState(false);

  // takes an explicit `source` rather than always reading the `text` state
  // directly — see why in `fixProofreadItem` below: right after an `apply()`,
  // the `text` state variable hasn't actually updated yet (state updates
  // aren't synchronous), so a resync that closed over `text` would still be
  // reading the PRE-fix draft and silently re-run the check one fix behind,
  // which is exactly what was happening.
  async function checkProofread(source = text) {
    setProofreadPending(true);
    const res = await suggestProofreadAction(source).catch(() => []);
    setProofreadPending(false);
    setProofreadChecked(true);
    setProofreadItems(res);
  }
  useEffect(() => {
    if (tab === "proofread" && !proofreadChecked && !proofreadPending) checkProofread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function fixProofreadItem(item: ProofreadItem) {
    if (!item.fix) return;
    const next = replaceSentenceInText(text, item.quote, item.fix);
    if (next === text) {
      // this item's quote no longer matches the draft — almost always
      // because an EARLIER fix in this same pass already touched the same
      // span (e.g. a spelling fix landed inside a sentence a capitalization
      // item quotes in full, so the capitalization item's stale full-sentence
      // quote can no longer be found). Silently doing nothing while still
      // saying "Fixed" would lie to the writer, so instead: don't claim
      // success, and refresh the whole list against the current text so
      // every remaining card is accurate (any item this invalidated will
      // reappear, corrected, in the fresh pass).
      setProofreadChecked(false);
      await checkProofread(text);
      return;
    }
    apply(next);
    markDecided(item.id, `Fixed — ${item.note}.`);
    // the fix just applied can equally invalidate ANOTHER not-yet-clicked
    // item's quote (same reason as above, just the other direction) — so
    // always resync, against `next` (the text we just computed), NOT the
    // `text` state variable: `apply()` only just called `setText(next)`,
    // and that update hasn't landed in `text` yet at this point in the
    // function (React state updates aren't synchronous) — resyncing off
    // `text` here would still read the PRE-fix draft, so the check would
    // silently run one fix behind, appearing to redo nothing.
    setProofreadChecked(false);
    await checkProofread(next);
  }
  function leaveProofreadItem(item: ProofreadItem) { markDecided(item.id, "Left as-is."); }

  const excerpt = (p: string, n = 9) => {
    const words = p.split(/\s+/).filter(Boolean);
    return words.slice(0, n).join(" ") + (words.length > n ? "…" : "");
  };

  return (
    <div className="tp-overlay">
      <style>{TP_CSS}</style>
      <button className="tp-close" type="button" onClick={onClose}>done tightening →</button>
      <div className="tp-body">
        <h2 className="tp-h1">Okay.<br />Now let&rsquo;s make it tighter.</h2>

        <div className="tp-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className="tp-tab"
              aria-selected={tab === c}
              onClick={() => setTab(c)}
            >
              {CATEGORY_LABEL[c]}{counts[c] > 0 ? <span className="tp-tab-n">{counts[c]}</span> : null}
            </button>
          ))}
        </div>

        {/* ── REPEATS ── */}
        {tab === "repetition" ? (
          repetitionItems.length === 0 ? (
            <p className="tp-empty">Checked it — no passage says the same thing twice. Nothing to tighten here.</p>
          ) : (
            <div className="tp-list">
              {repetitionItems.map((c) => {
                const d = decided[c.id];
                return (
                  <div key={c.id} className="tp-cluster">
                    <p className="tp-note">You make this point twice.</p>
                    <div className="tp-pair">
                      <blockquote className={`tp-quote${d === "Kept the second, cut the first." ? " tp-cut" : ""}`}>&ldquo;{c.quote}&rdquo;</blockquote>
                      <blockquote className={`tp-quote${d === "Kept the first, cut the second." ? " tp-cut" : ""}`}>&ldquo;{c.secondQuote}&rdquo;</blockquote>
                    </div>
                    {d ? <p className="tp-decided">{d}</p> : (
                      <div className="tp-actions">
                        <button type="button" className="tp-btn" onClick={() => decideRepetition(c, "a")}>keep this</button>
                        <button type="button" className="tp-btn" onClick={() => decideRepetition(c, "b")}>keep that</button>
                        <button type="button" className="tp-btn" onClick={() => decideRepetition(c, "merge")}>merge</button>
                        <button type="button" className="tp-btn ghost" onClick={() => decideRepetition(c, "leave")}>leave it</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : null}

        {/* ── PUNCH ── */}
        {tab === "punch" ? (
          punchItems.length === 0 ? (
            <p className="tp-empty">Checked it — your strongest lines already land last in their scenes.</p>
          ) : (
            <div className="tp-list">
              {punchItems.map((o) => {
                const d = decided[o.id];
                return (
                  <div key={o.id} className="tp-cluster">
                    <p className="tp-note">{o.observation}</p>
                    <p className="tp-q">{o.question}</p>
                    <div className="tp-pair">
                      <blockquote className="tp-quote tp-quote-strong">&ldquo;{o.quote}&rdquo;</blockquote>
                      <blockquote className="tp-quote tp-quote-dim">currently ends with: &ldquo;{o.secondQuote}&rdquo;</blockquote>
                    </div>
                    {d ? <p className="tp-decided">{d}</p> : (
                      <div className="tp-actions">
                        <button type="button" className="tp-btn" onClick={() => movePunch(o)}>move it to the end</button>
                        <button type="button" className="tp-btn ghost" onClick={() => leavePunch(o)}>leave it</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : null}

        {/* ── NOTIONS (embodiment) ── */}
        {tab === "embodiment" ? (
          embodimentItems.length === 0 ? (
            <p className="tp-empty">Checked it — every feeling you name already shows up somewhere in the body too.</p>
          ) : (
            <div className="tp-list">
              {embodimentItems.map((o) => (
                <SuggestCard
                  key={o.id}
                  opportunity={o}
                  decided={decided[o.id]}
                  draft={drafts[o.id] ?? ""}
                  pending={!!pending[o.id]}
                  declined={!!declinedSuggest[o.id]}
                  onDraftChange={(v) => setDraft(o.id, v)}
                  onSuggest={() => requestSuggestion(o)}
                  onAccept={() => acceptInsert(o)}
                  onSkip={() => skip(o)}
                  acceptLabel="add this"
                />
              ))}
            </div>
          )
        ) : null}

        {/* ── PHRASING ── */}
        {tab === "phrasing" ? (
          phrasingItems.length === 0 ? (
            <p className="tp-empty">Checked it — nothing here leans on a worn phrase.</p>
          ) : (
            <div className="tp-list">
              {phrasingItems.map((o) => (
                <SuggestCard
                  key={o.id}
                  opportunity={o}
                  decided={decided[o.id]}
                  draft={drafts[o.id] ?? ""}
                  pending={!!pending[o.id]}
                  declined={!!declinedSuggest[o.id]}
                  onDraftChange={(v) => setDraft(o.id, v)}
                  onSuggest={() => requestSuggestion(o)}
                  onAccept={() => acceptReplace(o)}
                  onSkip={() => skip(o)}
                  acceptLabel="use this instead"
                  placeholder="say it the way only you would…"
                />
              ))}
            </div>
          )
        ) : null}

        {/* ── IMAGERY ── */}
        {tab === "imagery" ? (
          imageryItems.length === 0 ? (
            <p className="tp-empty">Checked it — every scene here already gives the reader something to see, hear, or feel.</p>
          ) : (
            <div className="tp-list">
              {imageryItems.map((o) => (
                <SuggestCard
                  key={o.id}
                  opportunity={o}
                  decided={decided[o.id]}
                  draft={drafts[o.id] ?? ""}
                  pending={!!pending[o.id]}
                  declined={!!declinedSuggest[o.id]}
                  onDraftChange={(v) => setDraft(o.id, v)}
                  onSuggest={() => requestSuggestion(o)}
                  onAccept={() => acceptInsert(o)}
                  onSkip={() => skip(o)}
                  acceptLabel="add this"
                />
              ))}
            </div>
          )
        ) : null}

        {/* ── LENGTH ── */}
        {tab === "length" ? (
          <div className="tp-list">
            <p className="tp-note">
              {length.wordCount} words — {
                length.status === "comfortable" ? "runs about right." :
                length.status === "long" ? "starting to run long." :
                "runs long."
              }
            </p>
            {lengthItems.length === 0 ? (
              <p className="tp-empty">
                {length.status === "comfortable"
                  ? "Nothing to trim — the piece is a comfortable length."
                  : "It's on the longer side, but nothing stood out as safe to cut on its own."}
              </p>
            ) : (
              lengthItems.map((o) => {
                const d = decided[o.id];
                return (
                  <div key={o.id} className="tp-cluster">
                    <p className="tp-note">{o.observation}</p>
                    <blockquote className={`tp-quote${d === "Cut." ? " tp-cut" : ""}`}>&ldquo;{o.quote}&rdquo;</blockquote>
                    {d ? <p className="tp-decided">{d}</p> : (
                      <div className="tp-actions">
                        <button type="button" className="tp-btn" onClick={() => cutWeak(o)}>cut this</button>
                        <button type="button" className="tp-btn ghost" onClick={() => keepWeak(o)}>keep it</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : null}

        {/* ── ORDER ── */}
        {tab === "order" ? (
          <div className="tp-list">
            <p className="tp-note">Does this run in the right order?</p>
            {paragraphs.length < 3 ? (
              <p className="tp-empty">Not enough separate sections yet for a reorder to mean anything.</p>
            ) : !orderChecked && !orderPending ? (
              <div className="tp-cluster">
                <p className="tp-q">This sends your {paragraphs.length} paragraphs, as they are, to an AI editor — just once — and asks only for an ORDER, never new words. Nothing changes until you say so.</p>
                <div className="tp-actions">
                  <button type="button" className="tp-btn" onClick={checkOrder}>check the order</button>
                </div>
              </div>
            ) : orderPending ? (
              <p className="tp-empty">reading…</p>
            ) : orderResult && !orderResult.unchanged ? (
              <div className="tp-cluster">
                <p className="tp-decided">{orderResult.rationale}</p>
                <div className="tp-order-cols">
                  <div className="tp-order-col">
                    <p className="tp-order-h">as written</p>
                    <ol className="tp-order-list">
                      {paragraphs.map((p, i) => <li key={i}>{excerpt(p)}</li>)}
                    </ol>
                  </div>
                  <div className="tp-order-col">
                    <p className="tp-order-h">suggested</p>
                    <ol className="tp-order-list">
                      {orderResult.order.map((i) => <li key={i}>{excerpt(paragraphs[i])}</li>)}
                    </ol>
                  </div>
                </div>
                <div className="tp-actions">
                  <button type="button" className="tp-btn" onClick={useNewOrder}>use this order</button>
                  <button type="button" className="tp-btn ghost" onClick={keepOrder}>keep mine</button>
                </div>
              </div>
            ) : orderResult && orderResult.unchanged ? (
              <p className="tp-empty">{orderResult.rationale || "This already runs in the right order."}</p>
            ) : (
              <div className="tp-cluster">
                <p className="tp-empty">Couldn&rsquo;t get a read on this right now — trust your own order, or try again in a bit.</p>
                <div className="tp-actions">
                  <button type="button" className="tp-btn ghost" onClick={checkOrder}>try again</button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* ── PROOFREAD ── */}
        {tab === "proofread" ? (
          <div className="tp-list">
            {proofreadPending ? (
              <p className="tp-empty">reading…</p>
            ) : !proofreadChecked ? (
              // shouldn't normally show — the effect above checks as soon as
              // this tab opens — but covers the one render before it fires.
              <p className="tp-empty">reading…</p>
            ) : proofreadItems.length === 0 ? (
              <div className="tp-cluster">
                <p className="tp-empty">Checked it — no spelling or grammar errors found.</p>
                <div className="tp-actions">
                  <button type="button" className="tp-btn ghost" onClick={() => checkProofread()}>check again</button>
                </div>
              </div>
            ) : (
              proofreadItems.map((item) => {
                const d = decided[item.id];
                return (
                  <div key={item.id} className="tp-cluster">
                    <p className="tp-note">{item.kind === "spelling" ? "Spelling" : "Grammar"} — {item.note}</p>
                    {item.fix ? (
                      <div className="tp-pair">
                        <blockquote className={`tp-quote tp-quote-dim${d ? " tp-cut" : ""}`}>&ldquo;{item.quote}&rdquo;</blockquote>
                        <blockquote className="tp-quote tp-quote-strong">&ldquo;{item.fix}&rdquo;</blockquote>
                      </div>
                    ) : (
                      // nspell flagged this as likely misspelled but had no
                      // confident correction to offer — surfacing it is
                      // still the point (the writer asked for these to be
                      // CAUGHT), just with nothing safe to auto-apply.
                      <blockquote className="tp-quote">&ldquo;{item.quote}&rdquo;</blockquote>
                    )}
                    {d ? <p className="tp-decided">{d}</p> : (
                      <div className="tp-actions">
                        {item.fix ? <button type="button" className="tp-btn" onClick={() => fixProofreadItem(item)}>fix this</button> : null}
                        <button type="button" className="tp-btn ghost" onClick={() => leaveProofreadItem(item)}>{item.fix ? "leave it" : "I'll fix it myself"}</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {proofreadChecked && !proofreadPending && proofreadItems.length > 0 ? (
              <div className="tp-cluster">
                <div className="tp-actions">
                  <button type="button" className="tp-btn ghost" onClick={() => checkProofread()}>check again</button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The shared card for an opt-in AI-assisted single line — used by
 *  notions, phrasing and imagery. The writer can act without AI at all
 *  (type straight into the field, or tap a quick prompt to seed it) or ask
 *  for a suggestion first; either way nothing reaches the draft until
 *  "add this" / "use this instead" is clicked on whatever is currently
 *  sitting in the field. */
function SuggestCard({
  opportunity, decided, draft, pending, declined, onDraftChange, onSuggest, onAccept, onSkip, acceptLabel, placeholder,
}: {
  opportunity: WritingOpportunity;
  decided?: string;
  draft: string;
  pending: boolean;
  declined: boolean;
  onDraftChange: (v: string) => void;
  onSuggest: () => void;
  onAccept: () => void;
  onSkip: () => void;
  acceptLabel: string;
  placeholder?: string;
}) {
  return (
    <div className="tp-cluster">
      <p className="tp-note">{opportunity.observation}</p>
      <blockquote className="tp-quote">&ldquo;{opportunity.quote}&rdquo;</blockquote>
      <p className="tp-q">{opportunity.question}</p>
      {decided ? (
        <p className="tp-decided">{decided}</p>
      ) : (
        <>
          {opportunity.quickPrompts?.length ? (
            <div className="tp-chips">
              {opportunity.quickPrompts.map((p) => (
                <button key={p} type="button" className="tp-chip" onClick={() => onDraftChange(p)}>{p}</button>
              ))}
            </div>
          ) : null}
          <textarea
            className="tp-input"
            placeholder={placeholder ?? "in your own words…"}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            rows={2}
          />
          <div className="tp-actions">
            <button type="button" className="tp-btn" disabled={!draft.trim()} onClick={onAccept}>{acceptLabel}</button>
            <button type="button" className="tp-btn ghost" disabled={pending} onClick={onSuggest}>{pending ? "thinking…" : "suggest a line"}</button>
            <button type="button" className="tp-btn ghost" onClick={onSkip}>leave it</button>
          </div>
          {declined ? <p className="tp-hint">Couldn&rsquo;t get a suggestion just now — your own words work fine here.</p> : null}
        </>
      )}
    </div>
  );
}

const TP_CSS = `
.tp-overlay{ position:fixed; inset:0; z-index:120; overflow-y:auto; background:var(--paper); animation:tp-in .4s cubic-bezier(.2,.8,.25,1) both; }
@keyframes tp-in{ from{ opacity:0; } to{ opacity:1; } }
.tp-close{ position:fixed; top:1.1rem; right:1.1rem; z-index:121; font-family:var(--f-mono); font-size:.66rem; letter-spacing:.08em; text-transform:uppercase; background:var(--ink); color:var(--paper); border:0; border-radius:999px; padding:.6rem 1.1rem; cursor:pointer; }
.tp-close:hover{ background:var(--electric); }
.tp-body{ max-width:40rem; margin:0 auto; padding:9vh max(1.2rem,4vw) 10vh; }
.tp-h1{ font-family:var(--f-disp); font-weight:400; font-size:clamp(1.8rem,4.5vw,2.6rem); line-height:1.2; margin:0 0 1.6rem; }
.tp-tabs{ display:flex; gap:.35rem; flex-wrap:wrap; margin-bottom:2rem; }
.tp-tab{ font-family:var(--f-mono); font-size:.64rem; letter-spacing:.08em; text-transform:uppercase; border-radius:999px; padding:.5rem 1rem; cursor:pointer; border:1px solid var(--line); background:transparent; color:var(--ink-soft); display:flex; align-items:center; gap:.4rem; }
.tp-tab:hover{ border-color:var(--electric); color:var(--electric); }
.tp-tab[aria-selected="true"]{ background:var(--ink); color:var(--paper); border-color:var(--ink); }
.tp-tab-n{ font-size:.6rem; background:var(--electric); color:#fff; border-radius:999px; min-width:1.1rem; height:1.1rem; display:inline-flex; align-items:center; justify-content:center; padding:0 .25rem; }
.tp-tab[aria-selected="true"] .tp-tab-n{ background:var(--paper); color:var(--ink); }
.tp-empty{ color:var(--ink-soft); font-size:1.05rem; }
.tp-list{ display:flex; flex-direction:column; gap:2.2rem; }
.tp-cluster{ border-top:1px solid var(--line); padding-top:1.4rem; }
.tp-note{ font-family:var(--f-mono); font-size:.64rem; letter-spacing:.08em; text-transform:uppercase; color:var(--mute); margin:0 0 .8rem; }
.tp-pair{ display:flex; flex-direction:column; gap:.8rem; margin-bottom:1rem; }
.tp-quote{ font-family:var(--f-disp); font-style:italic; font-size:1.15rem; line-height:1.5; margin:0; padding:.7rem .9rem; background:var(--paper-2); border-left:3px solid var(--line); border-radius:4px; }
.tp-quote.tp-cut{ text-decoration:line-through; opacity:.4; border-left-color:var(--mute); }
.tp-quote-strong{ border-left-color:var(--electric); }
.tp-quote-dim{ opacity:.7; font-size:1rem; }
.tp-q{ font-size:.95rem; color:var(--ink-soft); margin:.4rem 0 .8rem; line-height:1.5; }
.tp-chips{ display:flex; flex-wrap:wrap; gap:.4rem; margin-bottom:.6rem; }
.tp-chip{ font-family:var(--f-mono); font-size:.62rem; letter-spacing:.04em; background:var(--paper-2); border:1px solid var(--line); color:var(--ink-soft); border-radius:999px; padding:.35rem .7rem; cursor:pointer; }
.tp-chip:hover{ border-color:var(--electric); color:var(--electric); }
.tp-input{ width:100%; font-family:var(--f-body); font-size:.95rem; color:var(--ink); background:var(--paper-2); border:1px solid var(--line); border-radius:8px; padding:.55rem .7rem; resize:vertical; margin-bottom:.6rem; }
.tp-hint{ font-family:var(--f-mono); font-size:.66rem; color:var(--mute); margin:.5rem 0 0; }
.tp-actions{ display:flex; gap:.5rem; flex-wrap:wrap; }
.tp-btn{ font-family:var(--f-mono); font-size:.64rem; letter-spacing:.06em; text-transform:uppercase; border-radius:999px; padding:.5rem 1rem; cursor:pointer; border:1px solid var(--line); background:transparent; color:var(--ink-soft); }
.tp-btn:hover{ border-color:var(--electric); color:var(--electric); }
.tp-btn:disabled{ opacity:.4; cursor:default; }
.tp-btn.ghost{ opacity:.7; }
.tp-decided{ font-size:.88rem; color:var(--mute); font-style:italic; margin:0; }
.tp-order-cols{ display:flex; gap:1.4rem; flex-wrap:wrap; margin:1rem 0; }
.tp-order-col{ flex:1; min-width:14rem; }
.tp-order-h{ font-family:var(--f-mono); font-size:.6rem; letter-spacing:.1em; text-transform:uppercase; color:var(--mute); margin:0 0 .5rem; }
.tp-order-list{ margin:0; padding-left:1.2rem; display:flex; flex-direction:column; gap:.5rem; font-size:.88rem; color:var(--ink-soft); }
`;
