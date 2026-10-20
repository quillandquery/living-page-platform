"use server";

import { myProfile } from "@/lib/db";
import { suggestFallbackOpportunities } from "@/lib/ai/nudge-fallback";
import { suggestLine } from "@/lib/ai/suggest-line";
import type { OpportunityType, WritingOpportunity } from "@/lib/writing-opportunities";

/**
 * The one entry point from the client into the LLM fallback (see
 * lib/ai/nudge-fallback.ts for why this exists and what it won't do). Kept
 * in its own file, separate from actions.ts's save/publish plumbing, so the
 * one part of this feature that leaves the browser is easy to find, audit,
 * or delete on its own.
 */
export async function suggestFallbackNudgesAction(raw: string): Promise<WritingOpportunity[]> {
  const profile = await myProfile();
  if (!profile) return []; // never call out on behalf of a signed-out request
  return suggestFallbackOpportunities(raw);
}

/**
 * The in-flow nudge's own "suggest a line" — the same opt-in, per-line
 * assist the tightening pass offers (`lib/ai/suggest-line.ts`, via
 * `app/write/ai-tighten-actions.ts`'s `suggestTightenLineAction`), wired up
 * here too so a writer who's still drafting — not just one running the
 * later tightening pass — can ask for a line rather than typing one from
 * scratch. Same custody rule: this only ever pre-fills `NudgeCard`'s own
 * response textarea; the writer's own "add detail" click is still what
 * lands it in the draft (see components/living/Nudge.tsx).
 */
export async function suggestNudgeLineAction(input: {
  type: OpportunityType;
  quote: string;
  secondQuote?: string;
  question: string;
}): Promise<string | null> {
  const profile = await myProfile();
  if (!profile) return null;
  return suggestLine(input);
}
