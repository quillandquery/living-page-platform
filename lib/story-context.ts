/**
 * THE STORY CONTEXT
 *
 * "What is this story about?" — answered once, deterministically, from the
 * story's own words, and reused everywhere something needs to describe the
 * story: the page `<title>`, the meta description, the slug, the Story
 * Hero's headline, structured data, the OG image. One derivation, many
 * renderings (Module 4, PART 7) — never a second, slightly different guess
 * built separately for each surface.
 *
 * Same discipline as `lib/semantic-profile.ts` (which this leans on
 * entirely for signal-scoring): this file answers "what exists?", not "how
 * should it look?" — that split stays intact. `lib/story-hero.ts` is the
 * "how should it look" half.
 *
 * Deterministic, local, no LLM, no network (matches D1 and the module's
 * explicit "no LLM / external AI" instruction). Two stories with identical
 * words derive identical context; that is correct, not a bug.
 *
 * NO INVENTION (module PART 11): every field here traces to something the
 * story actually said. A summary is *extracted* from the writer's own
 * sentences, never generated prose. A missing signal produces `null` or a
 * deliberately plain fallback — never a fabricated specific.
 */
import type { Block } from "./story-blocks.mjs";
import { extractStoryProfile, type SemanticStoryProfile } from "./semantic-profile";
import { themesOf } from "./discover";
import { scoreEnvironments } from "./art-direction/generate";
import { getBackdrop, BACKDROPS } from "./backdrops";
import type { StoryArtDirection } from "./art-direction/types";

/* ── the writer-facing fields a story already has — no new ones added.
   `fragment` is the writer's own hook line and is treated as the human
   TITLE (module PART "TITLE" — a real title, once supplied, is never
   rewritten); `place` is the writer's own scene-setting kicker; `date` is
   the writer's own free-text time marker ("March", "still", "last dive"),
   which is exactly what module PART 10's TIME signal wants and needs no
   inference when it's already there. ── */
export type StoryContextInput = {
  fragment: string;
  place: string;
  date?: string | null;
  /** the raw prose the writer typed, pre-annotation — the richest, most
   *  sentence-shaped text available. Falls back to the annotated blocks
   *  when absent (older rows, or callers that only have blocks). */
  source?: string | null;
  blocks?: Block[] | null;
  backdrop?: string | null;
  /** Story Visual System 2.0 direction, when the row already has one —
   *  reused rather than re-derived, so the context agrees with what the
   *  reader actually renders. */
  artDirection?: Partial<StoryArtDirection> | null;
};

export type StoryContext = {
  /** the human-facing title. The writer's own fragment, verbatim — never
   *  rewritten into "SEO language" (module: "SEO should work around the
   *  actual story rather than forcing the writer's voice into search
   *  language"). Only a bare, honest fallback when a fragment is somehow
   *  missing (publishing already requires one; this is a safety net). */
  title: string;
  /** an extractive summary — one or two of the story's OWN sentences,
   *  chosen for how much semantic signal they carry, not generated prose. */
  summary: string;
  place: string;
  /** where this happens, resolved the same way the reader's own art
   *  direction resolves it (`lib/art-direction/generate.ts`'s
   *  `scoreEnvironments`), so the two never disagree. */
  environment: { key: string; label: string };
  /** up to three short local-lexicon themes (`lib/discover.ts`), the same
   *  vocabulary the reader's own "keep going" rabbit hole already uses. */
  themes: string[];
  /** a short, human phrase for what kind of story this is — derived from
   *  the strongest NARRATIVE signal, never a fixed generic label. */
  storyType: string;
  /** the writer's own time marker when they gave one, otherwise a light
   *  inference from the TEMPORAL signal, otherwise null. */
  timeContext: string | null;
  /** the strongest EMOTION signal, or null when the story left none. */
  emotionalTone: string | null;
  /** whether the story gave the extractor anything concrete to hold onto —
   *  callers should say less, not guess more, when this is "generic". */
  specificity: "specific" | "generic";
  /** internal only — never shown to the writer, never injected verbatim
   *  into title/description. A handful of short, human phrases a reader
   *  might actually type, for future search/recommendation use. */
  semanticPhrases: string[];
  /** the full scored profile, for a caller (the slug deriver, the hero)
   *  that wants a signal this context didn't already surface. */
  profile: SemanticStoryProfile;
};

/* ── body text ─────────────────────────────────────────────────────────
   Prefer the writer's raw prose (full sentences, as typed). Blocks are the
   fallback — each beat is already one segmented line, which is a fine
   substitute when no raw source is available (e.g. a caller that only has
   the rendered story). */
function bodyTextOfBlocks(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.kind === "beat" && b.text.trim()) parts.push(b.text.trim());
    else if (b.kind === "raw" && !b.text.startsWith("<") && b.text !== "---" && !/^#{1,6}\s/.test(b.text)) {
      parts.push(b.text.trim());
    }
  }
  return parts.join("\n");
}

function resolveBodyText(input: StoryContextInput): string {
  if (input.source && input.source.trim()) return input.source.trim();
  if (input.blocks?.length) return bodyTextOfBlocks(input.blocks);
  return "";
}

/* ── sentence-level extractive summary ────────────────────────────────── */
function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap((line) => line.split(/(?<=[.!?…])\s+(?=[A-Z0-9"“'])/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function signalWeight(profile: SemanticStoryProfile): number {
  return (
    sum(profile.place) + sum(profile.objects) + sum(profile.action) +
    sum(profile.emotion) + sum(profile.temporal) + sum(profile.narrative)
  );
}
function sum(signals: { score: number }[]): number {
  return signals.reduce((n, s) => n + s.score, 0);
}

/** Extractive, not generative (module PART "STORY SUMMARY"): pick the
 *  sentence(s) that carry the most of the story's own semantic signal, in
 *  the order they were written, and stop once there's enough for a meta
 *  description. Never rewrites a word. */
function deriveSummary(bodyText: string, fragment: string): string {
  const sentences = splitSentences(bodyText).filter((s) => s.length >= 8);
  if (!sentences.length) return fragment.trim();

  const scored = sentences.map((text, i) => {
    const words = text.split(/\s+/).length;
    const lengthFit = words >= 6 && words <= 28 ? 1 : 0;
    return { text, i, score: signalWeight(extractStoryProfile(text)) + lengthFit };
  });

  const best = [...scored].sort((a, b) => b.score - a.score || a.i - b.i)[0];
  const withSignal = scored.filter((s) => s.score > 0);

  // build a short run starting at the best sentence, in ORIGINAL order,
  // so the summary reads as a real excerpt rather than a shuffled clause.
  const chosen: typeof scored = [best];
  const CHAR_BUDGET = 170;
  let len = best.text.length;
  for (const s of scored) {
    if (s === best) continue;
    if (Math.abs(s.i - best.i) !== 1) continue; // only a direct neighbour
    if (withSignal.length > 1 && s.score <= 0) continue; // don't pad with a dead sentence
    if (len + s.text.length + 1 > CHAR_BUDGET) continue;
    chosen.push(s);
    len += s.text.length + 1;
    break; // at most one neighbour — a summary, not a paragraph
  }
  chosen.sort((a, b) => a.i - b.i);

  let out = chosen.map((c) => c.text).join(" ").trim();
  if (out.length > 220) {
    out = out.slice(0, 217).replace(/\s+\S*$/, "") + "…";
  }
  return out || fragment.trim();
}

/* ── story type — from the strongest NARRATIVE signal, the same axis
   `lib/semantic-profile.ts` already scores; falls through to a broader
   read only when the story left no narrative arc to name. ── */
const NARRATIVE_TO_STORY_TYPE: Record<string, string> = {
  transition: "life transition",
  departure: "life transition",
  arrival: "arrival",
  breakup: "breakup",
  transformation: "life transition",
  failure: "failure",
  discovery: "discovery",
  escape: "life transition",
  reunion: "reunion",
  boredom: "observation",
  absurdity: "funny incident",
  grief: "loss",
  celebration: "celebration",
};

const TRAVEL_ENVIRONMENTS = new Set(["coast", "underwater", "highland", "desertroad", "heat", "city", "window", "cafe", "dawn", "meadow", "forest"]);

function inferStoryType(profile: SemanticStoryProfile, themes: string[], environmentKey: string): string {
  const topNarrative = profile.narrative[0]?.key;
  if (topNarrative && NARRATIVE_TO_STORY_TYPE[topNarrative]) return NARRATIVE_TO_STORY_TYPE[topNarrative];
  if (themes.includes("in transit") || TRAVEL_ENVIRONMENTS.has(environmentKey)) return "travel diary";
  if (profile.emotion[0]) return "personal essay";
  return "observation";
}

/* ── time context — the writer's own marker wins; a TEMPORAL signal only
   fills in when they left the date field empty or purely structural. ── */
const TEMPORAL_LABEL: Record<string, string> = {
  dawn: "at dawn", morning: "in the morning", afternoon: "in the afternoon",
  dusk: "at dusk", night: "at night", rainy_day: "in the rain",
  summer: "in summer", winter: "in winter", nineties: "in the nineties",
  childhood: "in childhood", memory: "as a memory",
};

function inferTimeContext(date: string | null | undefined, profile: SemanticStoryProfile): string | null {
  const own = date?.trim();
  if (own) return own;
  const top = profile.temporal[0]?.key;
  return top ? TEMPORAL_LABEL[top] ?? null : null;
}

/* ── semantic phrases — internal signals only (module PART "SEMANTIC
   PHRASES"): a handful of short, human words the story actually earned,
   never a generated keyword list. ── */
function deriveSemanticPhrases(profile: SemanticStoryProfile, environment: { label: string }, storyType: string, themes: string[]): string[] {
  const phrases: string[] = [];
  const add = (p?: string | null) => { if (p && !phrases.includes(p)) phrases.push(p); };

  add(environment.label);
  add(profile.action[0]?.key);
  add(profile.narrative[0]?.key);
  add(profile.emotion[0]?.key);
  add(storyType);
  themes.forEach(add);

  return phrases.slice(0, 6);
}

function titleCase(s: string): string {
  return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function deriveStoryContext(input: StoryContextInput): StoryContext {
  const bodyText = resolveBodyText(input);
  const combinedText = [input.fragment, input.place, bodyText].filter(Boolean).join(" ");
  const profile = extractStoryProfile(combinedText);
  const themes = themesOf(`${input.fragment} ${input.place}`);

  // reuse the reader's OWN environment pick when this story already has
  // one (Story Visual System 2.0); otherwise resolve it the identical way
  // `generateArtDirection` would, so context and hero never disagree.
  const ad = input.artDirection;
  const environment = ad?.environment?.key && ad?.environment?.label
    ? { key: ad.environment.key, label: ad.environment.label }
    : (() => {
        const scored = scoreEnvironments(combinedText, profile);
        const key = scored[0]?.key ?? "dawn";
        const label = getBackdrop(key)?.label ?? BACKDROPS.dawn.label;
        return { key, label };
      })();

  const title = input.fragment.trim() || (input.place.trim() ? `A story from ${titleCase(input.place)}` : "An untitled story");
  const summary = deriveSummary(bodyText, input.fragment);
  const storyType = inferStoryType(profile, themes, environment.key);
  const timeContext = inferTimeContext(input.date, profile);
  const emotionalTone = profile.emotion[0]?.key ?? null;
  const specificity: "specific" | "generic" = profile.place.length > 0 || profile.objects.length > 0 ? "specific" : "generic";
  const semanticPhrases = deriveSemanticPhrases(profile, environment, storyType, themes);

  return { title, summary, place: input.place, environment, themes, storyType, timeContext, emotionalTone, specificity, semanticPhrases, profile };
}
