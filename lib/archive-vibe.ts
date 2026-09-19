import type { Block } from "./story-blocks.mjs";
import type { StoryRow } from "./types";
import { extractStoryProfile, type Signal } from "./semantic-profile";
import { themesOf } from "./discover";

/**
 * THE ARCHIVE VIBE
 *
 * "What does this person's shelf feel like?" — read off the aggregate of
 * their PUBLISHED stories, never a single one (a single sad story doesn't
 * make someone a sad writer). Same discipline as `lib/semantic-profile.ts`
 * and `lib/discover.ts`'s `themesOf()`: curated local lexicons, weighted and
 * summed, deterministic, no LLM, no tag a writer had to set. This never
 * decides how a STORY looks (that's `lib/art-direction`'s job) — only what
 * to call the shelf its stories sit on.
 */

export type ArchiveVibe =
  | "travel"
  | "reflective"
  | "funny"
  | "observational"
  | "emotional"
  | "adventure"
  | "fragmentary"
  | "poetic"
  | "general"
  | "mixed"
  | "sparse";

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* place archetypes (lib/semantic-profile.ts's PLACE_CUES) that read as
   "on the move" rather than merely "somewhere" */
const TRAVEL_PLACES = new Set(["coast", "underwater", "highland", "desertroad", "heat", "oldtown", "train", "road", "airport", "cafe"]);
const ADVENTURE_PLACES = new Set(["highland", "forest", "desertroad", "underwater", "meadow"]);
const DREAM_PLACES = new Set(["dreamscape", "nightsky"]);

function beatText(blocks: Block[] | null | undefined): string {
  if (!blocks) return "";
  return blocks
    .filter((b): b is Extract<Block, { kind: "beat" }> => b.kind === "beat")
    .map((b) => b.text)
    .join(" ");
}

/** the story's own dominant voice, the same idea `lib/discover.ts` uses for
 *  a Story Seed — kept local here so this file has no dependency on the
 *  Wander field's shape, only on the block data every story already has. */
function dominantVoiceOf(blocks: Block[] | null | undefined): string {
  const counts: Record<string, number> = {};
  for (const b of blocks ?? []) {
    if (b.kind === "beat" && b.voice && b.voice !== "speak") counts[b.voice] = (counts[b.voice] ?? 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? "speak";
}

function scoreOf<K extends string>(keys: K[], signals: Signal<K>[]): number {
  return signals.filter((s) => keys.includes(s.key)).reduce((n, s) => n + s.score, 0);
}

const VIBE_KEYS = ["travel", "reflective", "funny", "observational", "emotional", "adventure", "fragmentary", "poetic", "general"] as const;
type ScoredVibe = (typeof VIBE_KEYS)[number];
type Scores = Record<ScoredVibe, number>;

/**
 * Aggregate a broad personality across a writer's whole published archive.
 * Fewer than two stories is treated as too little to read anything into —
 * see D-style reasoning in docs/DECISIONS.md: don't let one story decide an
 * identity, and don't invent a category just because the classifier ran.
 */
export function getArchiveVibe(stories: StoryRow[]): ArchiveVibe {
  if (stories.length < 2) return "sparse";

  const scores: Scores = {
    travel: 0, reflective: 0, funny: 0, observational: 0, emotional: 0,
    adventure: 0, fragmentary: 0, poetic: 0, general: 0.75,
  };

  let totalWords = 0;
  let totalSignal = 0;

  for (const story of stories) {
    const text = `${story.fragment} ${story.place} ${beatText(story.blocks)}`;
    const profile = extractStoryProfile(text);
    const voice = dominantVoiceOf(story.blocks);
    const themes = themesOf(text);
    totalWords += profile.wordCount;

    const travelPlace = scoreOf([...TRAVEL_PLACES], profile.place);
    const travel = travelPlace
      + (themes.includes("in transit") ? 3 : 0)
      + scoreOf(["travelling", "arriving"], profile.action);

    const reflective = scoreOf(["nostalgic", "melancholic", "peaceful"], profile.emotion)
      + scoreOf(["memory", "childhood"], profile.temporal)
      + scoreOf(["remembering"], profile.action)
      + (["whisper", "thought", "listen"].includes(voice) ? 2 : 0)
      + (themes.includes("coming back") || themes.includes("home") ? 2 : 0);

    const funny = scoreOf(["funny", "absurd", "chaotic"], profile.emotion)
      + scoreOf(["absurdity"], profile.narrative)
      + (["shout", "echo"].includes(voice) ? 2 : 0);

    const emotional = scoreOf(["romantic", "lonely", "anxious", "regretful"], profile.emotion)
      + scoreOf(["grief", "breakup", "reunion"], profile.narrative)
      + (themes.includes("love") || themes.includes("loss") ? 2 : 0)
      + (voice === "listen" ? 2 : 0);

    const adventure = scoreOf(["transformation", "escape", "arrival", "departure"], profile.narrative)
      + scoreOf([...ADVENTURE_PLACES], profile.place)
      + scoreOf(["running", "swimming", "escaping"], profile.action);

    const emotionTotal = profile.emotion.reduce((n, s) => n + s.score, 0);
    const observational = scoreOf(["looking"], profile.action)
      + scoreOf(["discovery"], profile.narrative)
      + (emotionTotal === 0 ? 1.5 : 0);

    const narrativeTotal = profile.narrative.reduce((n, s) => n + s.score, 0);
    const poetic = (voice === "drift" ? 3 : 0)
      + scoreOf([...DREAM_PLACES], profile.place)
      + (narrativeTotal === 0 && emotionTotal > 0 ? 1 : 0);

    scores.travel += travel;
    scores.reflective += reflective;
    scores.funny += funny;
    scores.emotional += emotional;
    scores.adventure += adventure;
    scores.observational += observational;
    scores.poetic += poetic;

    totalSignal += travel + reflective + funny + emotional + adventure + observational + poetic;
  }

  const avgWords = totalWords / stories.length;
  if (avgWords > 0 && avgWords < 45 && stories.length >= 3) scores.fragmentary += 6;

  const ranked = (Object.entries(scores) as [ScoredVibe, number][]).sort((a, b) => b[1] - a[1]);
  const [topKey, topScore] = ranked[0];
  const secondScore = ranked[1]?.[1] ?? 0;

  // too little signal anywhere, or the top two are basically tied — this is
  // a mixed shelf, not a shelf that happens to favour one thing.
  if (totalSignal < 2) return "mixed";
  if (topScore > 0 && secondScore > 0 && topScore - secondScore < Math.max(1, topScore * 0.18)) return "mixed";
  return topScore > 0 ? topKey : "mixed";
}

const LABELS: Record<ArchiveVibe, string[]> = {
  travel: ["From the road", "Places I've been"],
  reflective: ["Things I remember", "A few things I remember"],
  funny: ["Little disasters", "Things that went wrong"],
  observational: ["Things I've noticed"],
  emotional: ["Things I never said"],
  adventure: ["Adventures, apparently"],
  fragmentary: ["Little fragments"],
  poetic: ["Things floating around my head"],
  general: ["Things that happened"],
  mixed: ["A few things I've written", "Things that happened"],
  sparse: ["A few things I've written"],
};

/** Short, human, editorial copy for the collection — never the classifier's
 *  own name for itself, never exposed as a filter or a tag. `seedKey`
 *  (typically the author's id) only decides which of a vibe's few phrasings
 *  is used, so the same author always sees the same label. */
export function getArchiveLabel(vibe: ArchiveVibe, seedKey: string): string {
  const options = LABELS[vibe] ?? LABELS.mixed;
  return options[hash(seedKey) % options.length];
}
