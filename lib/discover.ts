import type { Block } from "./story-blocks.mjs";
import { VOICES, type Voice, type Gesture } from "./vocabulary";
import { DOODLE_HINTS, LEX, hits } from "./annotate";
import { getBackdrop, worldVars, type Energy } from "./backdrops";
import { estimateReadTime } from "./read-time";
import type { StoryWithAuthor } from "./types";

/**
 * DISCOVERY
 *
 * What a Story Seed is made of, and where that comes from. Every field
 * here is read off the story itself — its blocks, its world, its own
 * words — never a separate tag a writer had to remember to set. There is
 * no mood/category column in the schema and this deliberately does not
 * invent one; `themesOf()` below is a small local keyword lexicon (the
 * same kind of deterministic pass `lib/annotate.ts` already runs to pick
 * doodles), not an LLM and not a guess.
 */

const VOICE_SET = new Set<Voice>(VOICES);

export type SeedForm =
  | "floating-thought"
  | "giant-word"
  | "paper-scrap"
  | "postcard"
  | "micro-scene"
  | "typographic"
  | "collage";

export type SeedTier = "quiet" | "mid" | "burst";

export type StorySeed = {
  id: string;
  slug: string;
  handle: string;
  authorName: string;
  place: string;
  date: string;
  hook: string;
  chargedWord: string;
  accent: string;
  backdrop: string | null;
  energy: Energy;
  scheme: "dark" | "light";
  /** the story's own world, as a scoped CSS custom-property block — applied
   * only for mid/burst tiers, so a seed can be a real window into its world
   * without every tile on the page swapping its ground colour. */
  worldCss: string;
  dominantVoice: Voice;
  secondVoice: Voice | null;
  doodle: string;
  doodleGesture: Gesture;
  secondDoodle: string | null;
  readSeconds: number;
  readLabel: string;
  wordCount: number;
  themes: string[];
  form: SeedForm;
  tier: SeedTier;
};

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ── voice histogram — read straight off the blocks the story is made of ── */
function voiceHistogram(blocks: Block[]): Partial<Record<Voice, number>> {
  const counts: Partial<Record<Voice, number>> = {};
  for (const b of blocks) {
    if (b.kind === "beat" && VOICE_SET.has(b.voice as Voice)) {
      const v = b.voice as Voice;
      counts[v] = (counts[v] ?? 0) + 1;
    }
  }
  return counts;
}

function dominantVoices(hist: Partial<Record<Voice, number>>): [Voice, Voice | null] {
  const entries = (Object.keys(hist) as Voice[])
    .filter((v) => v !== "speak")
    .sort((a, b) => (hist[b] ?? 0) - (hist[a] ?? 0));
  if (entries.length === 0) return ["speak", null];
  return [entries[0], entries[1] ?? null];
}

/* ── the doodle a seed shows — the one the story actually drew first,
   falling back to the same keyword hints the writing engine uses ── */
function pickDoodles(blocks: Block[], hookAndPlace: string): { first: string; gesture: Gesture; second: string | null } {
  const used: { name: string; gesture: Gesture }[] = [];
  for (const b of blocks) {
    if (b.kind === "beat" && b.doodle) {
      used.push({ name: b.doodle, gesture: (b.gesture as Gesture) ?? "reveal" });
    }
  }
  if (used.length > 0) {
    const distinct = used.filter((d, i) => used.findIndex((u) => u.name === d.name) === i);
    return {
      first: distinct[0].name,
      gesture: distinct[0].gesture,
      second: distinct[1]?.name ?? null,
    };
  }
  const hints: { name: string; gesture: Gesture }[] = [];
  for (const [re, name, gesture] of DOODLE_HINTS) {
    if (re.test(hookAndPlace) && !hints.some((h) => h.name === name)) hints.push({ name, gesture });
    if (hints.length >= 2) break;
  }
  return {
    first: hints[0]?.name ?? "spiral",
    gesture: hints[0]?.gesture ?? "breathe",
    second: hints[1]?.name ?? null,
  };
}

/* ── themes — a small local lexicon, matched against the story's own
   words. Not tags a writer set; not an LLM call; just real text
   matching, the same "deterministic local logic" annotate.ts already
   runs to choose a doodle. ── */
const THEME_LEXICON: [string, RegExp][] = [
  ["leaving", /\b(left|leaving|leave|goodbye|walked away|gave up|quit|moved away)\b/i],
  ["coming back", /\b(came back|coming back|returned?|back home|back again)\b/i],
  ["staying", /\b(stayed|staying|didn'?t leave|couldn'?t leave|decided to stay)\b/i],
  ["in transit", /\b(train|bus|flight|airport|station|highway|road|drove|driving|luggage|suitcase|platform)\b/i],
  ["alone", /\b(alone|lonely|by myself|no ?one|nobody|solo|on my own)\b/i],
  ["strangers", /\b(stranger|a man (i|who)|a woman (i|who)|someone i (just )?met|didn'?t know (him|her|them))\b/i],
  ["home", /\b(home|apartment|childhood|my room|my house|hometown)\b/i],
  ["water", /\b(sea|ocean|river|rain|monsoon|swim|wave|tide|beach|shore)\b/i],
  ["night", /\b(night|midnight|3\s?am|4\s?am|couldn'?t sleep|asleep|dark out)\b/i],
  ["growing up", /\b(grew up|growing up|adulthood|when i was (a )?kid|childhood|younger)\b/i],
  ["love", /\b(love|loved|kissed|held (my|his|her|their) hand|missed (him|her|them))\b/i],
  ["loss", /\b(lost|losing|gone|died|death|grief|missing (him|her|them|it))\b/i],
  ["waiting", /\b(waited|waiting|still haven'?t|still hasn'?t|not yet)\b/i],
  ["chance encounters", /\b(met (a|someone)|ran into|by chance|coincidence)\b/i],
];

export function themesOf(text: string): string[] {
  const hitCounts = THEME_LEXICON
    .map(([label, re]) => [label, hits(re, text)] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  return hitCounts.slice(0, 3).map(([label]) => label);
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "but", "or", "of", "to", "in", "on", "at", "i", "it", "is", "was",
  "were", "that", "this", "my", "me", "for", "with", "so", "just", "still", "turns", "out",
  "we", "you", "your", "our", "us", "be", "been", "am", "are", "not", "if", "then", "than",
]);

function findChargedWord(hook: string): string {
  const words = hook.replace(/[^\w\s'-]/g, "").split(/\s+/).filter(Boolean);
  const candidates = words.filter((w) => !STOPWORDS.has(w.toLowerCase()) && w.length > 2);
  if (!candidates.length) return words[0] ?? hook.slice(0, 12);
  const charged = candidates.find((w) => hits(LEX.weight, w) || hits(LEX.loud, w));
  if (charged) return charged;
  return candidates.reduce((a, b) => (b.length > a.length ? b : a));
}

const TRAVEL_WORLDS = new Set(["coast", "city", "highland", "heat", "dawn", "meadow", "forest", "monsoon"]);

function chooseForm(input: {
  dominantVoice: Voice; secondVoice: Voice | null; energy: Energy; wordCount: number;
  hasSecondDoodle: boolean; hasTravelWorld: boolean; hasLedger: boolean; themes: string[]; id: string;
}): SeedForm {
  const { dominantVoice, secondVoice, energy, wordCount, hasSecondDoodle, hasTravelWorld, hasLedger, themes, id } = input;
  const scores: Record<SeedForm, number> = {
    "floating-thought": (["whisper", "listen", "thought"].includes(dominantVoice) ? 3 : 0) + (wordCount < 40 ? 2 : 0) + (energy === "quiet" ? 2 : 0),
    "giant-word": (dominantVoice === "shout" ? 3 : 0) + (wordCount < 25 ? 2 : 0),
    "paper-scrap": 1 + (dominantVoice === "thought" ? 2 : 0) + (wordCount < 30 ? 1 : 0),
    "postcard": (hasTravelWorld ? 3 : 0) + (themes.includes("in transit") ? 2 : 0) + (hasLedger ? 1 : 0),
    "micro-scene": (hasSecondDoodle ? 2 : 0) + (energy === "vivid" || energy === "warm" ? 2 : 0) + 1,
    "typographic": (dominantVoice === "drift" ? 2 : 0) + (secondVoice && secondVoice !== dominantVoice ? 2 : 0) + (wordCount >= 20 && wordCount <= 60 ? 1 : 0),
    "collage": (energy === "electric" ? 3 : 0) + (["shout", "echo"].includes(dominantVoice) ? 2 : 0) + (hasSecondDoodle ? 2 : 0),
  };
  const max = Math.max(...Object.values(scores));
  const top = (Object.keys(scores) as SeedForm[]).filter((f) => scores[f] >= max - 0.5);
  return top[hash(id) % top.length];
}

function tierOf(form: SeedForm, energy: Energy): SeedTier {
  if (energy === "electric" || ((form === "collage" || form === "typographic") && energy !== "quiet")) return "burst";
  if (energy === "quiet" || form === "floating-thought") return "quiet";
  return "mid";
}

export function buildSeed(story: StoryWithAuthor): StorySeed {
  const hist = voiceHistogram(story.blocks);
  const [dominantVoice, secondVoice] = dominantVoices(hist);
  const world = getBackdrop(story.backdrop ?? undefined);
  const energy: Energy = world?.energy ?? "warm";
  const scheme: "dark" | "light" = world?.scheme ?? "light";
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(story.accent) ? story.accent : "#2D6BF0";
  const doodles = pickDoodles(story.blocks, `${story.fragment} ${story.place}`);
  const rt = estimateReadTime(story.blocks);
  const wordCount = story.blocks.reduce((n, b) => (b.kind === "beat" ? n + b.text.trim().split(/\s+/).filter(Boolean).length : n), 0);
  const themes = themesOf(`${story.fragment} ${story.place}`);

  const form = chooseForm({
    dominantVoice, secondVoice, energy, wordCount,
    hasSecondDoodle: !!doodles.second,
    hasTravelWorld: !!(story.backdrop && TRAVEL_WORLDS.has(story.backdrop)),
    hasLedger: !!hist.ledger,
    themes,
    id: story.id,
  });

  return {
    id: story.id,
    slug: story.slug,
    handle: story.author.handle,
    authorName: story.author.display_name || `@${story.author.handle}`,
    place: story.place,
    date: story.date,
    hook: story.fragment,
    chargedWord: findChargedWord(story.fragment),
    accent,
    backdrop: story.backdrop,
    energy,
    scheme,
    worldCss: worldVars(world, accent),
    dominantVoice,
    secondVoice,
    doodle: doodles.first,
    doodleGesture: doodles.gesture,
    secondDoodle: doodles.second,
    readSeconds: rt.seconds,
    readLabel: rt.label,
    wordCount,
    themes,
    form,
    tier: tierOf(form, energy),
  };
}

export function buildSeeds(stories: StoryWithAuthor[]): StorySeed[] {
  return stories.map(buildSeed);
}
