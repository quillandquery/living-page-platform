"use server";

import { myProfile } from "@/lib/db";
import { suggestLine } from "@/lib/ai/suggest-line";
import { suggestParagraphReorder, type ReorderSuggestion } from "@/lib/ai/suggest-reorder";
import { suggestProofread } from "@/lib/ai/suggest-proofread";
import { checkProofreadHeuristics, type ProofreadItem } from "@/lib/proofread-heuristics";
import type { OpportunityType } from "@/lib/writing-opportunities";

/**
 * The tightening pass's two entry points into an LLM, both opt-in and both
 * auth-gated (mirrors `app/write/ai-nudges-actions.ts` exactly — kept in
 * its own file for the same reason that one is: the parts of this feature
 * that leave the browser should be easy to find, audit, or delete on their
 * own, separate from actions.ts's save/publish plumbing).
 */

export async function suggestTightenLineAction(input: {
  type: OpportunityType;
  quote: string;
  secondQuote?: string;
  question: string;
}): Promise<string | null> {
  const profile = await myProfile();
  if (!profile) return null; // never call out on behalf of a signed-out request
  return suggestLine(input);
}

export async function suggestReorderAction(paragraphs: string[]): Promise<ReorderSuggestion | null> {
  const profile = await myProfile();
  if (!profile) return null;
  return suggestParagraphReorder(paragraphs);
}

/**
 * The tightening pass's "check spelling & grammar". The primary path is
 * `checkProofreadHeuristics` (a real dictionary + mechanical grammar
 * checks, in `lib/proofread-heuristics.ts`) — deterministic, free, and
 * ALWAYS runs, no ANTHROPIC_API_KEY required. When a key happens to be
 * configured, the AI layer (`lib/ai/suggest-proofread.ts`) runs too, as a
 * strictly additive enrichment: its findings are merged in, skipping
 * anything the heuristic pass already caught (by exact quote, so nothing
 * is ever shown twice). If the AI call fails or no key is set, the
 * heuristic results alone are still returned — there's no failure state
 * to report anymore, since the primary check can't fail.
 */
export async function suggestProofreadAction(raw: string): Promise<ProofreadItem[]> {
  const profile = await myProfile();
  if (!profile) return []; // never call out on behalf of a signed-out request

  const heuristic = checkProofreadHeuristics(raw);
  if (!process.env.ANTHROPIC_API_KEY) return heuristic;

  const ai = await suggestProofread(raw).catch(() => null);
  if (!ai || !ai.length) return heuristic;

  const seen = new Set(heuristic.map((h) => h.quote.toLowerCase()));
  const merged = [...heuristic];
  for (const item of ai) {
    const key = item.quote.toLowerCase();
    if (seen.has(key)) continue; // the free pass already caught this one
    seen.add(key);
    merged.push(item);
  }
  return merged;
}
