import "server-only";

/**
 * THE AI PROOFREAD LAYER — now a strictly OPTIONAL enrichment on top of
 * `lib/proofread-heuristics.ts` (a real Hunspell dictionary + mechanical
 * grammar checks — no key, no network, runs unconditionally), rather than
 * the only way to proofread. Without an ANTHROPIC_API_KEY the writer still
 * gets real spelling/grammar catches; this only adds whatever the
 * dictionary/mechanical checks can't reach on their own (contextual word
 * choice, subject-verb agreement across a longer clause, and so on), when a
 * key happens to be configured. `app/write/ai-tighten-actions.ts` is what
 * merges the two.
 *
 * The custody chain here is unchanged from before:
 *  - never runs automatically — only when the heuristic layer's own
 *    "check spelling & grammar" already ran, and only if a key is present.
 *  - server-only, same as every other model call here.
 *  - scoped hard to spelling and grammar — the system prompt explicitly
 *    forbids touching phrasing, style, voice, word choice, or content, and
 *    every returned `quote` is verified as an exact verbatim substring of
 *    the draft server-side (§13's "no invention", enforced in code). A
 *    proposed `fix` is capped in length relative to its `quote` so a
 *    hallucinated rewrite can't smuggle in new sentences under the guise
 *    of "fixing a typo".
 *  - still never lands in the draft on its own: the tightening pass shows
 *    each fix as its own card; only the writer's own "fix this" click
 *    applies it, via the same verbatim `replaceSentenceInText` every other
 *    accept-a-line action in this pass already uses.
 */
import { hashId } from "@/lib/writing-opportunities";
import type { ProofreadKind, ProofreadItem } from "@/lib/proofread-heuristics";

export type { ProofreadKind, ProofreadItem };

const SYSTEM_PROMPT = `You are a proofreader for Living Page, a personal storytelling tool. You ONLY catch spelling mistakes and grammatical errors (subject-verb agreement, wrong/missing word, tense mismatch, misused homophone, stray or missing punctuation that's a genuine error, a missing capital letter at the start of a sentence). You NEVER touch anything else: not word choice, not phrasing, not sentence length, not style, not voice, not tone, not content.

Sentence fragments and run-ons can be a deliberate part of this writer's voice — never flag a fragment or run-on, by itself, as an error.

Capitalization after a period/question mark/exclamation mark is different, and needs judgment: look at the WHOLE draft's pattern first.
- If most sentences in the draft start capitalized and only a few start lowercase, those few are almost always an accidental slip (fast typing, not a deliberate voice) — flag each one as a "grammar" fix (capitalize just that first letter, nothing else in the sentence).
- If EVERY sentence in the draft starts lowercase, consistently, that's a deliberate, consistent style choice — leave capitalization alone entirely in that case, for every sentence.

You will be given a draft. Return ONLY a JSON array (no prose before or after), up to 12 items, each shaped EXACTLY as:
{"kind": "spelling"|"grammar", "quote": "<a verbatim substring of the draft, copied exactly, character for character, containing the error — as short as possible, ideally just the erroring word or a few surrounding words, never a whole paragraph>", "fix": "<the same span, corrected>", "note": "<short label, e.g. \\"guinenity -> genuineness\\">"}

Hard rules:
- "quote" MUST be copied exactly from the draft, character for character, including its exact casing and any existing typos elsewhere in it.
- "fix" must be the SAME quote with ONLY the actual error corrected — do not rewrite, improve, shorten, or restyle it.
- Keep "quote" as short as the error allows — a single misspelled word plus a word or two of surrounding context, not the whole sentence, unless the error is a sentence-level agreement problem.
- If there is truly nothing to fix, return [].`;

// `null` means "the check itself didn't run or didn't come back cleanly"
// (no key, network failure, non-OK response, or a reply that wasn't a
// parseable JSON array at all) — as distinct from `[]`, which means the
// call succeeded and the model genuinely found nothing. Conflating the two
// used to mean a failed check quietly reported "no spelling or grammar
// errors found", which reads as a false all-clear rather than the real
// "couldn't check right now" (a real report from testing this).
function extractJsonArray(text: string): unknown[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

type RawItem = { kind?: string; quote?: string; fix?: string; note?: string };

const VALID_KINDS = new Set<ProofreadKind>(["spelling", "grammar"]);
const MAX_CHARS = 8000;

/** Only ever called from an explicit "check spelling & grammar" click in
 *  the tightening pass. Returns `null` when the check itself couldn't run
 *  (missing ANTHROPIC_API_KEY, network failure, bad response) so the
 *  caller can tell that apart from a genuine "found nothing" `[]` — see
 *  the note on `extractJsonArray` above. Either way this never throws and
 *  never blocks the writer; it's an opt-in assist, so it fails quiet. */
export async function suggestProofread(raw: string): Promise<ProofreadItem[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !raw.trim()) return null;

  const draft = raw.slice(0, MAX_CHARS);

  let text: string;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: draft }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    text = data.content?.find((b) => b.type === "text")?.text ?? "";
  } catch {
    return null;
  }

  const parsed = extractJsonArray(text);
  if (parsed === null) return null; // model reply didn't parse — a failed check, not "nothing found"
  const items = parsed as RawItem[];
  const out: ProofreadItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item || typeof item.quote !== "string" || typeof item.fix !== "string") continue;
    if (!item.kind || !VALID_KINDS.has(item.kind as ProofreadKind)) continue;
    // THE LOAD-BEARING CHECK (§13 "no invention") — a model claim only
    // becomes a fix if it names a real, verbatim substring of the draft.
    if (!draft.includes(item.quote)) continue;
    if (item.quote === item.fix) continue; // no-op, not a fix
    // a "fix" ballooning far past its "quote" is a rewrite wearing a typo
    // fix's clothes, not a correction — drop it rather than trust it.
    if (item.fix.length > item.quote.length * 2 + 20) continue;
    if (seen.has(item.quote)) continue; // one card per distinct span
    seen.add(item.quote);
    out.push({
      id: hashId("proofread-" + item.kind, item.quote + "|" + item.fix),
      kind: item.kind as ProofreadKind,
      quote: item.quote,
      fix: item.fix,
      note: item.note && typeof item.note === "string" ? item.note : `${item.kind} fix`,
    });
    if (out.length >= 12) break;
  }
  return out;
}
