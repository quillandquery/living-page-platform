/**
 * THE WRITING-INTELLIGENCE PASS
 *
 * "The AI does not write the story. It helps the writer write the story."
 *
 * A heuristic (D1 — no LLM, no network, no per-story cost) second reading of
 * a draft, run alongside `lib/annotate.ts`'s first pass. Where `annotate.ts`
 * decides how a line should MOVE, this file decides whether a line is worth
 * QUESTIONING — repetition, vague language, missing imagery, an important
 * moment, an unresolved tension, telling instead of showing, a generic
 * opening, a buried good line. It never rewrites, never generates prose, and
 * never invents a detail the writer didn't put there — every `quote` traces
 * back to a substring of the draft itself.
 *
 * Deliberately curated, not exhaustive (matches D6's "closed, extensible
 * lexicon" discipline): a handful of well-chosen patterns per opportunity
 * type, not an attempt to catch every case. Good, not omniscient.
 *
 * ── THE TIGHTENING PASS (§8, extended) ──────────────────────────────────
 * `detectTightenOpportunities` below is the second-reading pass a finished
 * draft gets — later than the in-flow nudges above, on a piece the writer
 * already considers close to done. Repetition was the only thing it looked
 * for; a real edit also chases evocative imagery, worn phrasing, a physical
 * beat missing under a stated emotion ("notions" — a held breath, a hand
 * that won't stay still), whether the strongest line in a scene is actually
 * the LAST thing said there, and whether the whole piece has run long. Every
 * one of those stays inside the same discipline as the rest of this file:
 * heuristic-first (PHRASING/EMBODIMENT/PUNCH/LENGTH are plain pattern-
 * matching and arithmetic, no model call), and the one place an opt-in LLM
 * assist is offered (`lib/ai/suggest-line.ts`, per-line) it only ever
 * PRE-FILLS a field the writer must read, edit and explicitly accept — see
 * `components/living/TightenPass.tsx`. Nothing here reorders or deletes a
 * word on its own; every mechanical helper at the bottom of this file
 * (`removeSentenceFromText`, `moveSentenceToParagraphEnd`,
 * `replaceSentenceInText`, `insertAfterSentence`) only ever moves, drops or
 * swaps in text that already went through a writer's explicit click — the
 * same chain of custody `/about` promises readers ("never altered,
 * reordered, or hidden" is a promise about the RENDERING step; the writer's
 * own pre-publish edit is still theirs to make, same as choosing "keep this"
 * over "keep that" already was in the original tightening pass).
 */
import { segment, LEX, hits } from "./annotate";
import {
  extractStoryProfile,
  PLACE_CUES,
  OBJECT_CUES,
  ACTION_CUES,
  NARRATIVE_CUES,
  EMOTION_CUES,
} from "./semantic-profile";
import { themesOf } from "./discover";

export type OpportunityType =
  | "repetition"
  | "vague"
  | "imagery"
  | "moment"
  | "tension"
  | "telling"
  | "opening"
  | "buriedLine"
  // — tightening-pass additions (§8 extended) —
  | "phrasing"
  | "embodiment"
  | "punch"
  | "length";

export type WritingOpportunity = {
  /** stable across re-detection as long as the underlying text is unchanged
   *  — lets the caller remember "skipped" / "resolved" without a DB row. */
  id: string;
  type: OpportunityType;
  /** 0–1, used only to order candidates when more than one is live. */
  priority: number;
  paragraphIndex: number;
  /** the writer's own words this opportunity is about — never invented. */
  quote: string;
  /** a second quote, for opportunities that compare two passages
   *  (repetition, tension). */
  secondQuote?: string;
  /** short, punchy, all-caps — the nudge's headline (§15). */
  observation: string;
  /** the actual question put to the writer. */
  question: string;
  /** optional quick-prompt chips (imagery only). */
  quickPrompts?: string[];
  meta?: Record<string, string>;
};

/* ── shared plumbing ─────────────────────────────────────────────────── */

export function hashId(type: string, text: string): string {
  let h = 2166136261;
  const s = type + "::" + text;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

export type Sentence = { text: string; para: number };

/** Reuses `annotate.ts`'s own sentence segmenter (D1: one reading of "what
 *  a sentence is", not a second, slightly different splitter). */
export function sentencesOf(raw: string): Sentence[] {
  const segs = segment(raw, true);
  let para = 0;
  const out: Sentence[] = [];
  for (const s of segs) {
    if ("pause" in s) { para++; continue; }
    const t = s.text.trim();
    if (t) out.push({ text: t, para });
  }
  return out;
}

const STOP = new Set(
  ("the a an and or but of to in in on at for with is are was were be been am " +
    "i it its it's you your our we they he she them his her my me so as if then " +
    "than that this these those not no do does did can will just even more most " +
    "about into out up down each one two some any all there here what when where " +
    "which who how why " +
    // generic high-frequency verbs — carrying almost no thematic weight on
    // their own, so sharing only one of these is not "the same thought
    // twice" (repetition needs a word the story actually cares about).
    "went go going goes gone get gets got getting come came comes coming " +
    "made make makes said says saying looked look looks looking felt feel " +
    "feels feeling put take took do did does doing done " +
    // discourse fillers/intensifiers — "such", "also", "even" show up in
    // almost any two sentences and were causing real false positives (two
    // sentences that only share a word like "such" are not saying the same
    // thing twice; they just both happen to be emphatic).
    "such even also still yet already quite especially actually really " +
    "very much many").split(/\s+/),
);
const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);
const contentWords = (t: string) => words(t).filter((w) => !STOP.has(w) && w.length > 2);
const wc = (t: string) => (t.match(/\S+/g) ?? []).length;

function hasAny(cues: readonly (readonly [string, RegExp])[], text: string): boolean {
  return cues.some(([, re]) => re.test(text));
}

/* ── A. REPETITION ────────────────────────────────────────────────────
   Two nearby sentences that share enough content words to be "the same
   thought twice". A window of a few sentences, not the whole draft — a
   theme recurring across a 2,000-word piece is a motif, not a repeat. */
function detectRepetition(sentences: Sentence[]): WritingOpportunity[] {
  const out: WritingOpportunity[] = [];
  const seen = new Set<string>(); // guards against a run of near-identical lines all firing separately
  const used = new Set<number>();
  for (let i = 0; i < sentences.length; i++) {
    if (used.has(i)) continue;
    const a = sentences[i];
    const aw = new Set(contentWords(a.text));
    if (aw.size === 0) continue;
    for (let j = i + 1; j < sentences.length && j <= i + 6; j++) {
      if (used.has(j)) continue;
      const b = sentences[j];
      const bw = new Set(contentWords(b.text));
      if (bw.size === 0) continue;
      const shared = [...aw].filter((w) => bw.has(w));
      const smaller = Math.min(aw.size, bw.size);
      const overlap = shared.length / smaller;
      // two short declarative sentences sharing even their one strong word
      // ("unhappy" / "unhappy") are already the same thought said twice;
      // longer sentences need real word-for-word overlap, not just a shared
      // topic word — a heading and the sentence explaining it will always
      // share their topic's nouns ("public transport" in both), and that
      // is normal cohesive writing, not repetition. 0.6 (not 0.45) is what
      // separates the two in practice.
      const strongEnough = smaller <= 2 ? shared.length >= 1 && overlap >= 0.5 : shared.length >= 2 && overlap >= 0.6;
      if (strongEnough) {
        used.add(i); used.add(j);
        const key = `${a.text}|${b.text}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({
            id: hashId("repetition", key),
            type: "repetition",
            priority: 0.65 + Math.min(overlap, 1) * 0.2,
            paragraphIndex: a.para,
            quote: a.text,
            secondQuote: b.text,
            observation: "YOU'VE SAID THIS TWICE",
            question: "You might only need one of these thoughts.",
          });
        }
        break;
      }
    }
  }
  return out;
}

/* ── B. VAGUE LANGUAGE ─────────────────────────────────────────────────
   Only when the vague word is doing all the work of a short, bare
   judgment — a sentence that already has a concrete anchor (a named
   place/object) is not vague, it's just short. */
const VAGUE_WORDS = [
  "beautiful", "amazing", "terrible", "weird", "nice", "sad", "happy",
  "crazy", "awful", "exciting", "boring", "unforgettable", "incredible",
  "wonderful", "lovely", "stunning", "gorgeous", "surreal", "worst", "best",
];
const VAGUE_RE = new RegExp(`\\b(${VAGUE_WORDS.join("|")})\\b`, "i");

function detectVague(sentences: Sentence[]): WritingOpportunity[] {
  const out: WritingOpportunity[] = [];
  for (const s of sentences) {
    const m = VAGUE_RE.exec(s.text);
    if (!m) continue;
    if (wc(s.text) > 18) continue; // a bare judgment, not a fully-developed sentence
    if (hasAny(PLACE_CUES, s.text) || hasAny(OBJECT_CUES, s.text)) continue;
    const word = m[1].toLowerCase();
    out.push({
      id: hashId("vague", s.text),
      type: "vague",
      priority: 0.5,
      paragraphIndex: s.para,
      quote: s.text,
      observation: `WHAT DID "${word.toUpperCase()}" LOOK LIKE?`,
      question: "Say it in your own words — the one detail only you'd remember.",
      meta: { word },
    });
    if (out.length >= 2) break; // never a stream of them
  }
  return out;
}

/* ── C. MISSING IMAGERY ────────────────────────────────────────────────
   A paragraph that names a real place/object/event but gives none of the
   five senses — the scene is named, not seen. */
const SENSORY_RE = /\b(saw|seen|see|looked|heard|hear|sound|sounded|smell|smelled|scent|felt|feel|touch|touched|tasted|taste|bright|dark|loud|quiet|silent|cold|warm|hot|soft|rough|sweet|bitter|colou?r|colou?red|shape|texture|glow|shadow|shimmer)\b/i;

function detectImagery(sentences: Sentence[]): WritingOpportunity[] {
  const byPara = new Map<number, Sentence[]>();
  for (const s of sentences) {
    if (!byPara.has(s.para)) byPara.set(s.para, []);
    byPara.get(s.para)!.push(s);
  }
  const out: WritingOpportunity[] = [];
  for (const [para, group] of byPara) {
    const text = group.map((g) => g.text).join(" ");
    // A long *reflective* paragraph with zero sensory language is still
    // missing imagery — real drafts show this (a page of interiority, no
    // scene) — so the cap is generous, not a "already developed" cutoff.
    if (wc(text) > 90) continue;
    const concrete = hasAny(PLACE_CUES, text) || hasAny(OBJECT_CUES, text);
    if (!concrete || SENSORY_RE.test(text)) continue;
    out.push({
      id: hashId("imagery", text),
      type: "imagery",
      priority: 0.55,
      paragraphIndex: para,
      quote: group[0].text,
      observation: "STAY HERE",
      question: "What do you remember seeing, hearing, smelling, or touching?",
      quickPrompts: ["What did you see?", "What did it sound like?", "What did it feel like?", "What tiny detail do you remember?"],
    });
  }
  return out;
}

/* ── D. IMPORTANT MOMENT ──────────────────────────────────────────────
   A precise time marker (a clock, "2am", "the call") landing on a real
   turn (an action or narrative cue) — the kind of line a story hinges on. */
// a small supplement, local to this detector only (never touches the
// shared semantic-profile lexicon other engines depend on): the everyday
// verbs an "important moment" tends to hinge on — a call, a knock, a text
// — that aren't themselves travel ACTION_CUES or NARRATIVE_CUES.
const EVENT_RE = /\b(call|called|calling|message|messaged|text|texted|knock|knocked|woke|wake|woken|found out|heard|rang|rings|ringing|arrived|showed up|walked in|opened the door)\b/i;

// "became"/"changed" (NARRATIVE_CUES's "transformation" key) are too
// common to mean anything on their own — nearly any sentence with a time
// reference in it will also contain one somewhere. Only the rarer, more
// specific narrative turns are strong enough evidence of a real moment;
// "transformation" (and the even weaker "boredom"/"absurdity") stay out of
// THIS detector, though they're still fine signals elsewhere (story type,
// buried-line scoring).
const STRONG_NARRATIVE_KEYS = new Set([
  "transition", "departure", "arrival", "breakup", "failure",
  "discovery", "escape", "reunion", "grief", "celebration",
]);
const strongNarrative = (text: string) => NARRATIVE_CUES.some(([key, re]) => STRONG_NARRATIVE_KEYS.has(key) && re.test(text));

function detectMoment(sentences: Sentence[]): WritingOpportunity[] {
  const out: WritingOpportunity[] = [];
  for (const s of sentences) {
    if (!LEX.clock.test(s.text)) continue;
    if (!strongNarrative(s.text) && !hasAny(ACTION_CUES, s.text) && !EVENT_RE.test(s.text)) continue;
    out.push({
      id: hashId("moment", s.text),
      type: "moment",
      priority: 0.75,
      paragraphIndex: s.para,
      quote: s.text,
      observation: "THIS FEELS IMPORTANT",
      question: "What happened in the minute before or after?",
    });
  }
  return out;
}

/* ── E. CONTRADICTION / TENSION ───────────────────────────────────────
   Two adjacent-ish sentences whose emotional charge points opposite ways,
   joined by (or immediately following) a contrast word. */
const POS_EMOTION = new Set(["ecstatic", "peaceful", "hopeful", "romantic", "generous", "funny"]);
const NEG_EMOTION = new Set(["lonely", "anxious", "melancholic", "chaotic", "regretful"]);
const CONTRAST_RE = /\b(but|yet|and yet|still|even though|when i finally|once i|after (i|it)|only to|instead)\b/i;
const WANT_LEAVE_RE = /\b(couldn'?t wait to leave|wanted to leave|wanted out|couldn'?t wait to go|desperate to leave)\b/i;
// a small local supplement (see EVENT_RE above for the same discipline):
// the shared EMOTION_CUES lexicon is tuned for travel-diary register and
// has no entry for "cried" or "relieved" as bare reactions — exactly the
// words a tension between two sentences (not one) tends to turn on.
const LOCAL_NEG_RE = /\b(cried|crying|hurt|regretted|wished i hadn'?t|missed it|wasn'?t ready|broke down|couldn'?t stop crying|wasn'?t right|was not right|wasn'?t the same|something (felt|was) (off|wrong)|didn'?t feel right)\b/i;
const LOCAL_POS_RE = /\b(relieved|thrilled|couldn'?t wait|excited|glad|happy)\b/i;

function emotionKeyOf(text: string): string | null {
  for (const [key, re] of EMOTION_CUES) if (re.test(text)) return key;
  return null;
}
function valenceOf(text: string): "pos" | "neg" | null {
  const key = emotionKeyOf(text);
  if (key && POS_EMOTION.has(key)) return "pos";
  if (key && NEG_EMOTION.has(key)) return "neg";
  if (LOCAL_NEG_RE.test(text)) return "neg";
  if (LOCAL_POS_RE.test(text)) return "pos";
  return null;
}

function detectTension(sentences: Sentence[]): WritingOpportunity[] {
  const out: WritingOpportunity[] = [];
  for (let i = 0; i < sentences.length - 1; i++) {
    const a = sentences[i];
    const b = sentences[i + 1];
    if (b.para - a.para > 1) continue;

    const aLeave = WANT_LEAVE_RE.test(a.text);
    const aVal = valenceOf(a.text);
    const bVal = valenceOf(b.text);
    const contrastNearby = CONTRAST_RE.test(b.text) || CONTRAST_RE.test(a.text);

    const opposite = (aVal && bVal && aVal !== bVal) || (aLeave && bVal === "neg");

    if (opposite && (contrastNearby || aLeave)) {
      out.push({
        id: hashId("tension", a.text + "|" + b.text),
        type: "tension",
        priority: 0.7,
        paragraphIndex: a.para,
        quote: a.text,
        secondQuote: b.text,
        observation: "THERE'S A TENSION HERE",
        question: "Is that worth staying with?",
      });
      i++; // don't reuse b as a's partner again
    }
  }
  return out;
}

/* ── F. TELLING / EMOTION ─────────────────────────────────────────────
   A named emotion stated outright, rather than shown. */
const TELL_RE = /\bi\s+(?:was|felt|am|feel|felt so|was so|am so)\s+(terrified|afraid|scared|frightened|happy|sad|angry|furious|anxious|nervous|excited|thrilled|devastated|heartbroken|relieved|embarrassed|ashamed|proud|jealous|guilty|lonely|hopeful|confused|overwhelmed|ecstatic|panicked)\b/i;

function detectTelling(sentences: Sentence[]): WritingOpportunity[] {
  const out: WritingOpportunity[] = [];
  for (const s of sentences) {
    const m = TELL_RE.exec(s.text);
    if (!m) continue;
    const feeling = m[1].toLowerCase();
    out.push({
      id: hashId("telling", s.text),
      type: "telling",
      priority: 0.6,
      paragraphIndex: s.para,
      quote: s.text,
      observation: "DON'T TELL ME YET",
      question: `What did you do because you were ${feeling}?`,
      meta: { feeling },
    });
  }
  return out;
}

/* ── G. GENERIC OPENING ────────────────────────────────────────────────
   Only checked against the very first sentence of the draft. */
const OPENING_RE = /^(i(?:'d| had)? always wanted to|ever since i (was a (little )?child|can remember)|last (summer|year|winter|spring|month)|this (is|was) a story about|so,? this happened|it all started when|i(?:'ve| have) never been good at)/i;

function detectOpening(sentences: Sentence[]): WritingOpportunity[] {
  const first = sentences[0];
  if (!first || !OPENING_RE.test(first.text)) return [];
  return [{
    id: hashId("opening", first.text),
    type: "opening",
    priority: 0.45,
    paragraphIndex: 0,
    quote: first.text,
    observation: "YOU MIGHT HAVE A MORE INTERESTING WAY IN",
    question: "What is the first actual moment you remember?",
  }];
}

/* ── H. BURIED GOOD LINE ───────────────────────────────────────────────
   The sentence carrying the most of the story's own semantic signal
   (place/object/action/emotion/temporal/narrative) at a length that reads
   as a real sentence, not a fragment or a run-on. */
function signalWeight(text: string): number {
  const p = extractStoryProfile(text);
  return p.place.length + p.objects.length + p.action.length + p.emotion.length + p.temporal.length + p.narrative.length * 1.5;
}

function detectBuriedLines(sentences: Sentence[], excludeTexts: Set<string>): WritingOpportunity[] {
  const scored = sentences
    .filter((s) => !excludeTexts.has(s.text))
    .map((s) => ({ s, score: signalWeight(s.text) }))
    .filter(({ s, score }) => { const n = wc(s.text); return n >= 8 && n <= 32 && score >= 2; });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map(({ s, score }) => ({
    id: hashId("buried", s.text),
    type: "buriedLine" as const,
    priority: 0.5 + Math.min(score, 6) / 20,
    paragraphIndex: s.para,
    quote: s.text,
    observation: "👀 KEEP THIS",
    question: "This feels like a sentence the story is trying to get to.",
  }));
}

/* ── I. WORN PHRASING ─────────────────────────────────────────────────
   A curated list of the phrases this exact register reaches for on
   autopilot — travel-diary and personal-essay stock ("little did I know",
   "the trip of a lifetime", "in that moment"). Deliberately NOT
   `write-good`'s generic `cliches` check (see `lib/free-nlp-detectors.ts`'s
   own note on why that's left off): a generic cliché linter flags idiom in
   general, which is noisy against this product's plainspoken voice. This
   list is instead the small set of phrases that specifically erase the
   writer's own voice underneath them — each one could have been written by
   anyone, about anywhere. */
const WORN_PHRASES: [RegExp, string][] = [
  [/\blittle did i know\b/i, "little did I know"],
  [/\bthe trip of a lifetime\b/i, "the trip of a lifetime"],
  [/\bin that moment\b/i, "in that moment"],
  [/\bwords (can(?:'t|not)|cannot) (describe|do it justice|express)\b/i, "words can't describe it"],
  [/\bchanged (my|our) life forever\b/i, "changed my life forever"],
  [/\ba whole new world\b/i, "a whole new world"],
  [/\bmelting pot of cultures?\b/i, "melting pot of culture"],
  [/\boff the beaten (path|track)\b/i, "off the beaten path"],
  [/\bhidden gem\b/i, "hidden gem"],
  [/\bi was in awe\b/i, "I was in awe"],
  [/\btime (seemed to|stood|stopped)( stand)? still\b/i, "time stood still"],
  [/\ba once in a lifetime (experience|opportunity)\b/i, "a once in a lifetime experience"],
  [/\bi (will|'ll) (never|always) forget\b/i, "I'll never forget"],
  [/\beverything happens for a reason\b/i, "everything happens for a reason"],
  [/\bat the end of the day\b/i, "at the end of the day"],
  [/\bfor the first time in my life\b/i, "for the first time in my life"],
  [/\ba part of me (will always|still)\b/i, "a part of me will always"],
];

function detectPhrasing(sentences: Sentence[]): WritingOpportunity[] {
  const out: WritingOpportunity[] = [];
  for (const s of sentences) {
    const hit = WORN_PHRASES.find(([re]) => re.test(s.text));
    if (!hit) continue;
    const [, label] = hit;
    out.push({
      id: hashId("phrasing", s.text),
      type: "phrasing",
      priority: 0.55,
      paragraphIndex: s.para,
      quote: s.text,
      observation: "YOU'VE HEARD THIS PHRASE BEFORE",
      question: `"${label}" could be about anyone, anywhere. What's the version of this only you would say?`,
      meta: { phrase: label },
    });
    if (out.length >= 3) break; // never a stream of them
  }
  return out;
}

/* ── J. EMBODIMENT / "NOTIONS" ─────────────────────────────────────────
   A sentence carrying real emotional charge (an EMOTION_CUES hit, or the
   same "I was terrified" telling-pattern §F already looks for) with no
   physical, bodily trace anywhere near it — the feeling is named but
   nobody's body is in the room. This is the gap a sigh, a held breath, a
   shaking hand fills: not decoration, the physical evidence a reader
   believes a feeling by. */
const BODY_RE = /\b(breath|breathed|breathing|breathe|sigh|sighed|hand|hands|finger|fingers|fist|fists|throat|chest|stomach|gut|knees|shoulders?|jaw|teeth|palms?|shiver|shivered|shaking|shook|trembl\w*|tears?|cried|crying|swallow\w*|heartbeat|pulse|goosebumps|chills|numb|flushed|blush\w*|nauseous|dizzy|lightheaded)\b/i;

function detectEmbodiment(sentences: Sentence[]): WritingOpportunity[] {
  const out: WritingOpportunity[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const named = TELL_RE.exec(s.text)?.[1]?.toLowerCase() ?? (emotionKeyOf(s.text) ?? undefined);
    if (!named) continue;
    // look at this sentence plus its immediate neighbour in the same
    // paragraph — a body beat one line later still counts as "there".
    const neighbour = sentences[i + 1]?.para === s.para ? sentences[i + 1].text : "";
    if (BODY_RE.test(s.text) || BODY_RE.test(neighbour)) continue;
    out.push({
      id: hashId("embodiment", s.text),
      type: "embodiment",
      priority: 0.58,
      paragraphIndex: s.para,
      quote: s.text,
      observation: "WHERE DID YOU FEEL THAT?",
      question: "Naming the feeling is one thing — what did your body do?",
      quickPrompts: ["A held breath", "Hands wouldn't stay still", "A knot in the stomach", "Couldn't swallow"],
      meta: { feeling: named },
    });
    if (out.length >= 3) break; // never a stream of them
  }
  return out;
}

/* ── K. PUNCH PLACEMENT ────────────────────────────────────────────────
   Per paragraph (scene), the line carrying the most of the story's own
   signal — reusing §H's `signalWeight` — should usually be the last thing
   said before the silence, not buried a sentence or two before it. This is
   arithmetic, not judgment: it only fires when the strongest line is
   CLEARLY stronger than whatever currently closes the paragraph, and only
   on paragraphs long enough to have a real "before" and "after". */
function detectPunch(sentences: Sentence[]): WritingOpportunity[] {
  const byPara = new Map<number, Sentence[]>();
  for (const s of sentences) {
    if (!byPara.has(s.para)) byPara.set(s.para, []);
    byPara.get(s.para)!.push(s);
  }
  const out: WritingOpportunity[] = [];
  for (const [para, group] of byPara) {
    if (group.length < 3) continue; // needs a real "before" and "after" to be buried in
    const last = group[group.length - 1];
    const scored = group.map((s) => ({ s, score: signalWeight(s.text) }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best.s === last) continue; // already lands last — nothing to do
    const lastScore = signalWeight(last.text);
    const n = wc(best.s.text);
    // clearly stronger (not just a tie), and a real sentence, not a fragment
    if (best.score < 2 || best.score < lastScore + 1.5 || n < 6 || n > 40) continue;
    out.push({
      id: hashId("punch", best.s.text + "|" + last.text),
      type: "punch",
      priority: 0.62,
      paragraphIndex: para,
      quote: best.s.text,
      secondQuote: last.text,
      observation: "YOUR STRONGEST LINE IS BURIED HERE",
      question: "This might land harder as the last thing you say before moving on.",
    });
  }
  return out;
}

/* ── the pass ──────────────────────────────────────────────────────── */

export function detectOpportunities(raw: string): WritingOpportunity[] {
  const sentences = sentencesOf(raw);
  if (sentences.length === 0) return [];

  const repetition = detectRepetition(sentences);
  const vague = detectVague(sentences);
  const imagery = detectImagery(sentences);
  const moment = detectMoment(sentences);
  const tension = detectTension(sentences);
  const telling = detectTelling(sentences);
  const opening = detectOpening(sentences);

  const alreadyFlagged = new Set([
    ...vague.map((o) => o.quote), ...telling.map((o) => o.quote), ...opening.map((o) => o.quote),
  ]);
  const buried = detectBuriedLines(sentences, alreadyFlagged);

  return [...repetition, ...moment, ...tension, ...telling, ...imagery, ...vague, ...opening, ...buried]
    .sort((a, b) => b.priority - a.priority);
}

/** The tightening pass's own set — repetition (§8 original) plus the
 *  extension this file's header describes: imagery, worn phrasing, missing
 *  embodiment, and punch placement. Deliberately NOT vague/moment/tension/
 *  telling/opening/buriedLine — those stay the in-flow nudge's job (they
 *  fire while the writer is still drafting); this is the second, later
 *  pass over a piece the writer considers close to finished. */
export function detectTightenOpportunities(raw: string): WritingOpportunity[] {
  const sentences = sentencesOf(raw);
  if (sentences.length === 0) return [];
  const repetition = detectRepetition(sentences);
  const imagery = detectImagery(sentences);
  const phrasing = detectPhrasing(sentences);
  const embodiment = detectEmbodiment(sentences);
  const punch = detectPunch(sentences);
  return [...repetition, ...punch, ...embodiment, ...phrasing, ...imagery]
    .sort((a, b) => b.priority - a.priority);
}

/* ── L. LENGTH ─────────────────────────────────────────────────────────
   A whole-draft check, not a per-sentence one — reads the room rather than
   any single line. The Living Page skill's own guidance ("a 500-word story
   holds five to eight genuinely animated moments... more than that and
   they become wallpaper") is the basis for the target band below: this is
   a travel-diary-scaled personal story, not a novel chapter. Trim
   candidates are the lowest-signal sentences in the piece (inverse of §H's
   `signalWeight`) that ALSO aren't already doing structural work — never
   the strongest lines, never the opening or closing sentence. Purely
   arithmetic; nothing here reads for meaning beyond what `signalWeight`
   already does elsewhere in this file. */
export const LENGTH_TARGET = { comfortable: 900, long: 1400 } as const;

export type LengthSummary = {
  wordCount: number;
  status: "comfortable" | "long" | "runs-long";
  /** the weakest lines in the piece — candidates to cut, never the ones to keep. */
  trimCandidates: WritingOpportunity[];
};

export function analyzeLength(raw: string): LengthSummary {
  const sentences = sentencesOf(raw);
  const wordCount = wc(raw);
  const status: LengthSummary["status"] =
    wordCount <= LENGTH_TARGET.comfortable ? "comfortable" : wordCount <= LENGTH_TARGET.long ? "long" : "runs-long";

  if (status === "comfortable" || sentences.length < 6) return { wordCount, status, trimCandidates: [] };

  const first = sentences[0]?.text;
  const last = sentences[sentences.length - 1]?.text;
  const scored = sentences
    .filter((s) => s.text !== first && s.text !== last)
    .map((s) => ({ s, score: signalWeight(s.text), n: wc(s.text) }))
    .filter(({ n }) => n >= 6) // a trim candidate should be a real sentence worth reading twice, not a fragment
    .sort((a, b) => a.score - b.score || b.n - a.n); // weakest signal first; among ties, the longer sentence saves more words

  const howMany = status === "runs-long" ? 5 : 3;
  const trimCandidates: WritingOpportunity[] = scored.slice(0, howMany).map(({ s }) => ({
    id: hashId("length", s.text),
    type: "length",
    priority: 0,
    paragraphIndex: s.para,
    quote: s.text,
    observation: "COULD THIS GO?",
    question: "Cutting this probably wouldn't cost the story anything.",
  }));

  return { wordCount, status, trimCandidates };
}

/* ── mechanical cut, never a rewrite ─────────────────────────────────
   Removes one exact sentence the writer already wrote (a "keep this /
   drop that" decision the writer made in the tightening pass) — no prose
   is generated, nothing is reworded, only removed verbatim. */
export function removeSentenceFromText(raw: string, sentence: string): string {
  const idx = raw.indexOf(sentence);
  if (idx === -1) return raw;
  let next = raw.slice(0, idx) + raw.slice(idx + sentence.length);
  next = next.replace(/[ \t]{2,}/g, " ").replace(/\n[ \t]+\n/g, "\n\n").replace(/\n{3,}/g, "\n\n").trim();
  return next;
}

/* ── mechanical move, never a rewrite ─────────────────────────────────
   Cuts one exact sentence and reinserts it immediately after another exact
   sentence already in the draft — used by the punch-placement action
   ("move it to the end") to relocate the writer's own strongest line to
   the close of its own paragraph. Nothing is generated or reworded; both
   strings must already be verbatim substrings of the draft. */
export function moveSentenceAfter(raw: string, sentence: string, after: string): string {
  if (sentence === after) return raw;
  const cut = removeSentenceFromText(raw, sentence);
  // `after` still has to be findable post-cut — true unless the two
  // sentences were adjacent with no separator, which segment() never emits.
  const idx = cut.indexOf(after);
  if (idx === -1) return raw;
  const insertAt = idx + after.length;
  const clean = sentence.trim();
  return (cut.slice(0, insertAt) + " " + clean + cut.slice(insertAt))
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Convenience wrapper for the common tightening-pass case: move a buried
 *  strong line to the end of the paragraph it already lives in, i.e. right
 *  after whatever sentence currently closes that scene. */
export function moveSentenceToParagraphEnd(raw: string, sentence: string, currentLastSentence: string): string {
  return moveSentenceAfter(raw, sentence, currentLastSentence);
}

/* ── mechanical swap, writer-approved only ────────────────────────────
   Replaces one exact sentence with new text — used only after the writer
   has read (and may have edited) a suggestion, whether typed by hand or
   pre-filled by the opt-in AI assist (`lib/ai/suggest-line.ts`) and then
   explicitly accepted. The chain of custody is the same as the original
   nudge flow's "add detail": the draft only ever receives what's sitting
   in a text field the writer approved, never something inserted sight
   unseen. */
export function replaceSentenceInText(raw: string, oldSentence: string, newSentence: string): string {
  const idx = raw.indexOf(oldSentence);
  if (idx === -1) return raw;
  return (raw.slice(0, idx) + newSentence.trim() + raw.slice(idx + oldSentence.length)).trim();
}

/** Inserts writer-approved text immediately after an existing sentence —
 *  the shape an imagery/embodiment suggestion wants: a new sentence that
 *  reads as the next beat, right where the gap actually is, not appended
 *  at the bottom of the whole draft. Same custody rule as the swap above:
 *  only ever called with text a writer has already accepted. */
export function insertAfterSentence(raw: string, anchor: string, addition: string): string {
  const idx = raw.indexOf(anchor);
  if (idx === -1) return raw;
  let clean = addition.trim();
  if (clean && !/[.!?…]$/.test(clean)) clean += ".";
  const insertAt = idx + anchor.length;
  return (raw.slice(0, insertAt) + " " + clean + raw.slice(insertAt)).replace(/[ \t]{2,}/g, " ").trim();
}

/* ── STORY CONTEXT — raw material for the visual world ────────────────
   Every field traces to the writer's own words: a WritingOpportunity's
   quoted excerpt, or an answer the writer typed themselves. Nothing here
   is generated. This is the bridge PRD item 12 asks for — the writing
   becomes the source material for the Living Page, not a separate guess
   built later. See also `lib/story-context.ts`, which this is designed to
   feed (`StoryContext.strongestLines` etc.). */
export type WritingSignals = {
  strongestLines: string[];
  places: string[];
  objects: string[];
  characters: string[];
  sensoryDetails: string[];
  emotionalTensions: string[];
  importantMoments: string[];
  motifs: string[];
  storyKeywords: string[];
};

const CHARACTER_RE = /\b(an? old (?:man|woman)|a stranger|a (?:child|kid)|my (?:mother|father|sister|brother|friend|grandmother|grandfather|husband|wife|partner)|pigeons?|a dog|a cat)\b/gi;

function extractCharacterMentions(raw: string): string[] {
  const found = new Set<string>();
  for (const m of raw.matchAll(CHARACTER_RE)) found.add(m[0].toLowerCase());
  return [...found].slice(0, 6);
}

/** The excerpts the Find-the-story pass shows (§9) — kept lines first (the
 *  writer already said "keep this"), then the strongest buried lines the
 *  pass itself found. Never more than a handful; never generated. */
export function pickExcerpts(raw: string, kept: string[] = [], max = 3): string[] {
  const buried = detectOpportunities(raw).filter((o) => o.type === "buriedLine").map((o) => o.quote);
  return Array.from(new Set([...kept, ...buried])).slice(0, max);
}

export function buildWritingSignals(
  raw: string,
  opts: { keptLines?: string[]; chosenExcerpt?: string | null; sensoryAnswers?: string[]; momentAnswers?: string[] } = {},
): WritingSignals {
  const profile = extractStoryProfile(raw);
  const opportunities = detectOpportunities(raw);

  const strongestLines = Array.from(new Set([
    ...(opts.keptLines ?? []),
    ...opportunities.filter((o) => o.type === "buriedLine").map((o) => o.quote),
    ...(opts.chosenExcerpt ? [opts.chosenExcerpt] : []),
  ])).slice(0, 6);

  const emotionalTensions = opportunities
    .filter((o) => o.type === "tension")
    .map((o) => `${o.quote} / ${o.secondQuote ?? ""}`.trim())
    .slice(0, 4);

  const importantMoments = Array.from(new Set([
    ...(opts.momentAnswers ?? []),
    ...opportunities.filter((o) => o.type === "moment").map((o) => o.quote),
  ])).slice(0, 4);

  const motifs = themesOf(raw);
  const storyKeywords = Array.from(new Set([
    ...profile.narrative.slice(0, 2).map((s) => s.key),
    ...profile.emotion.slice(0, 2).map((s) => s.key),
    ...motifs,
  ])).slice(0, 8);

  return {
    strongestLines,
    places: profile.place.map((s) => s.key),
    objects: profile.objects.map((s) => s.key),
    characters: extractCharacterMentions(raw),
    sensoryDetails: (opts.sensoryAnswers ?? []).slice(0, 6),
    emotionalTensions,
    importantMoments,
    motifs,
    storyKeywords,
  };
}
