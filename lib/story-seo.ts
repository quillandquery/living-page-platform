/**
 * SEO OVERRIDE RESOLUTION (discoverability layer, 2026-10 — migration 0004).
 *
 * `lib/story-context.ts` derives a title/summary/tags for every story from
 * its own words, no exceptions, no blank state — that auto-derivation is
 * what carries the entire existing corpus (every story published before
 * this migration has no override and must still read perfectly well). This
 * file is the one, thin place that layers an OPTIONAL author correction on
 * top of it: a non-empty override always wins, an empty/unset one always
 * falls through to the derived value. Nothing else should re-implement this
 * fallback — metadata, JSON-LD and llms-full.txt all call this, so they can
 * never disagree about which title or description a given story has.
 */
import type { StoryContext } from "./story-context";
import type { StoryRow } from "./types";

export type StorySeoOverridable = Pick<StoryRow, "seo_title" | "seo_description" | "tags">;

export type ResolvedStorySeo = {
  title: string;
  description: string;
  /** Author-set tags only — `[]` when none were set. Never backfilled
   *  from the context's internal `semanticPhrases` (see that field's own
   *  "never shown to the writer" note in story-context.ts). */
  tags: string[];
};

export function resolveStorySeo(
  story: StorySeoOverridable,
  context: Pick<StoryContext, "title" | "summary">,
): ResolvedStorySeo {
  const title = story.seo_title?.trim() || context.title;
  // `context.summary` can only be genuinely empty when both the story's
  // source text AND its fragment are empty — a combination `persist()`
  // (app/write/actions.ts) already refuses to publish (it requires a
  // non-empty `fragment` to go live). `|| title` exists purely as a last
  // line of defense so this function's OWN contract — never an empty
  // description — holds even for a row that reaches it some other way
  // (an import, a future publish path, a bad fixture in a test).
  const description = story.seo_description?.trim() || context.summary || title;
  const tags = (story.tags ?? []).map((t) => t.trim()).filter(Boolean);
  return { title, description, tags };
}
