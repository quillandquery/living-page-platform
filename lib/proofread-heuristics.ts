import "server-only";

/**
 * THE FREE PROOFREAD — replaces the AI-only version of this pass
 * (`lib/ai/suggest-proofread.ts`, kept below for anyone who does configure
 * an ANTHROPIC_API_KEY and wants a second, more contextual opinion) with a
 * fully deterministic one that needs no key, no network call, and no
 * model at all: a real Hunspell dictionary (`nspell` + `dictionary-en` —
 * same MIT-licensed, small, dependency-light shape as `write-good` already
 * used elsewhere in this pass) for spelling, plus two mechanical grammar
 * checks (duplicate consecutive words, and a missing capital letter after
 * a sentence — judged against the WHOLE draft's own pattern, never a
 * blanket rule) done with plain string logic.
 *
 * Why server-only despite there being no secret here: the dictionary data
 * is ~700KB on disk (`dictionary-en` + `nspell`) — real weight to ship to
 * every visitor's browser for a feature only the writer, on their own
 * draft, ever triggers. Keeping it behind the existing server action
 * (`suggestProofreadAction`) means it never touches the client bundle.
 *
 * Custody rule (§13, same as every other tightening-pass helper): this
 * only ever proposes a fix drawn from a fixed, real-word dictionary or a
 * mechanical rule (capitalize this letter, drop this repeated word) —
 * never invented prose. A misspelling nspell can't confidently suggest a
 * fix for (e.g. a badly garbled word) is still surfaced — the writer asked
 * for spelling errors to be CAUGHT, and an unconfident guess is worse than
 * no guess — just without a "fix this" action, only "leave it" / "I'll fix
 * it myself".
 */
import nspell from "nspell";
import fs from "node:fs";
import path from "node:path";
import { sentencesOf, hashId } from "./writing-opportunities";

/**
 * `dictionary-en`'s own entry point loads its two data files via
 * `fs.readFile(new URL("index.aff", import.meta.url))` — real, plain
 * Node ESM, and exactly what every earlier smoke test for this file ran
 * under (`tsx`, a straight Node ESM loader) — so it looked fine. It is
 * NOT fine once this file is actually bundled by Next.js's webpack for a
 * server action / route handler: webpack rewrites `import.meta.url`, and
 * the URL object that comes out fails Node's internal `instanceof URL`
 * check inside `fs.readFile`, throwing `TypeError: The "path" argument
 * must be of type string or an instance of Buffer or URL. Received an
 * instance of URL` — confirmed by actually running this through `next
 * dev` and hitting a real route, not just an isolated script. That crash
 * was silently swallowed by this feature's own `.catch(() => [])` safety
 * net (by design, so a broken AI call never blocks the writer) — which
 * meant Proofread was quietly reporting "nothing found" on every draft,
 * every time, in the real app.
 *
 * Fix: never import `dictionary-en`'s own JS at all. Read its two static
 * data files ourselves, from a plain string path built off
 * `process.cwd()` (the project root under both `next dev` and `next
 * start`) — `process.cwd()` is a real runtime call, not something
 * webpack statically rewrites (unlike `import.meta.url`, and unlike
 * `require.resolve`, which webpack resolves to a bundle-internal module
 * id at build time rather than a real filesystem path — also not usable
 * here). `dictionary-en` stays a real dependency purely so these two
 * files exist on disk; nothing ever imports its code.
 */
function loadDictionaryFiles(): { aff: Buffer; dic: Buffer } {
  const dir = path.join(process.cwd(), "node_modules", "dictionary-en");
  return {
    aff: fs.readFileSync(path.join(dir, "index.aff")),
    dic: fs.readFileSync(path.join(dir, "index.dic")),
  };
}

export type ProofreadKind = "spelling" | "grammar";

export type ProofreadItem = {
  id: string;
  kind: ProofreadKind;
  /** verbatim substring of the draft containing the flagged span */
  quote: string;
  /** the corrected text to replace `quote` with — absent when nspell has
   *  no confident suggestion (still shown, just with no auto-fix action) */
  fix?: string;
  /** short human label, e.g. "guinenity — possible misspelling" */
  note: string;
};

// built once per server process — parsing ~100k Hunspell affix rules on
// every call would be wasteful; nothing here is request-specific.
type Speller = ReturnType<typeof nspell>;
let speller: Speller | null = null;
function getSpeller(): Speller {
  if (!speller) speller = nspell(loadDictionaryFiles());
  return speller;
}

// Common apostrophe-dropped contractions nspell's own edit-distance
// ranking doesn't always put first (or at all) — "arent" → "rent, agent,
// anent" with no apostrophe form in the top few, for instance. A small,
// curated override (same D6 discipline as every other lexicon in this
// codebase) beats trusting the raw ranking for exactly these common
// cases. Deliberately excludes anything that's ALSO a real standalone
// word (cant, wont, well, lets, its, hes, shes, whats) — nspell already
// marks those `correct`, so they're never flagged in the first place, and
// guessing the writer meant a contraction there would be a real risk of a
// wrong "fix".
const CONTRACTION_FIXES: Record<string, string> = {
  dont: "don't", isnt: "isn't", wasnt: "wasn't", arent: "aren't", werent: "weren't",
  hasnt: "hasn't", havent: "haven't", hadnt: "hadn't", shouldnt: "shouldn't",
  wouldnt: "wouldn't", couldnt: "couldn't", didnt: "didn't", doesnt: "doesn't",
  im: "I'm", ive: "I've", youre: "you're", youve: "you've", youll: "you'll",
  theyre: "they're", theyve: "they've", theyll: "they'll", weve: "we've", thats: "that's",
};

// A word ISN'T flagged at all (regardless of the dictionary) when:
//  - it's short enough to plausibly be an initial/acronym (≤2 letters), or
//  - it's ALL CAPS (an acronym, not a typo), or
//  - it's capitalized but not at the start of its sentence — almost
//    always a proper noun (a character's name, an invented place) rather
//    than a misspelling, and this pass has no way to tell the difference.
function looksLikeProperNoun(word: string, isSentenceStart: boolean): boolean {
  if (word.length <= 2) return true;
  if (word === word.toUpperCase() && word !== word.toLowerCase()) return true; // ALLCAPS
  if (!isSentenceStart && /^[A-Z]/.test(word)) return true;
  return false;
}

const MAX_ITEMS = 20;

/** Real, deterministic dictionary spellcheck — no key, no network, no
 *  model. Every "fix" is either this writer's own text (for the
 *  capitalization/duplicate-word grammar checks) or a real word drawn
 *  from a fixed English dictionary (for spelling) — nothing generated. */
export function checkSpelling(raw: string): ProofreadItem[] {
  const speller = getSpeller();
  const sentences = sentencesOf(raw);
  const out: ProofreadItem[] = [];
  const seen = new Set<string>();

  for (const s of sentences) {
    const wordRe = /[A-Za-z][A-Za-z']*/g;
    let m: RegExpExecArray | null;
    let firstWord = true;
    while ((m = wordRe.exec(s.text))) {
      const word = m[0];
      const isSentenceStart = firstWord;
      firstWord = false;
      if (word.length < 2) continue;
      if (looksLikeProperNoun(word, isSentenceStart)) continue;
      if (speller.correct(word)) continue;
      // a regular "-s" plural of a word the dictionary DOES know (e.g.
      // "spectrums" of "spectrum") is a dictionary gap, not a misspelling
      // — English pluralizes productively even where Hunspell's affix
      // file didn't enumerate every case. Caught this one from nspell's
      // own top suggestion for "spectrums" being "spectrum": a real word,
      // but silently applying it would have swapped a correct plural for
      // a broken singular ("one of the spectrum?") — worse than the typo
      // it "fixed". Skip flagging these rather than risk that.
      if (/s$/i.test(word) && word.length > 3 && speller.correct(word.slice(0, -1))) continue;
      const key = word.toLowerCase();
      if (seen.has(key)) continue;

      const curated = CONTRACTION_FIXES[key];
      const suggestion = curated ?? speller.suggest(word)[0];
      // preserve the writer's own capitalization on the fix, same as any
      // other mechanical replace in this pass
      const fix = suggestion
        ? (word[0] === word[0].toUpperCase() ? suggestion[0].toUpperCase() + suggestion.slice(1) : suggestion)
        : undefined;

      seen.add(key);
      out.push({
        id: hashId("proofread-spelling", word),
        kind: "spelling",
        quote: word,
        fix,
        note: fix ? `${word} → ${fix}` : `${word} — possible misspelling, no confident fix`,
      });
      if (out.length >= MAX_ITEMS) return out;
    }
  }
  return out;
}

// "the the", "and and", ... — an unambiguous mechanical error. A small
// curated exclusion list for doubled words that are sometimes
// grammatically valid on their own ("I had had enough", "the fact that
// that happened") keeps this from flagging a real sentence as broken.
const ALLOWED_DOUBLES = new Set(["had", "that", "so", "far"]);

export function checkDuplicateWords(raw: string): ProofreadItem[] {
  const out: ProofreadItem[] = [];
  const re = /\b([A-Za-z']+)([ \t]+)\1\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const word = m[1];
    if (ALLOWED_DOUBLES.has(word.toLowerCase())) continue;
    const quote = m[0];
    out.push({
      id: hashId("proofread-duplicate", quote + m.index),
      kind: "grammar",
      quote,
      fix: word,
      note: `"${word}" is repeated`,
    });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

// Deliberately NOT `sentencesOf` (which every other check in this pass,
// and the free-nlp/curated nudge passes, use for real): `segment()` in
// lib/annotate.ts splits on a sentence-ending punctuation mark only when
// what follows is NOT lowercase (`(?<=[.!?…])\s+(?=[^a-z])`), and folds a
// lowercase continuation back onto the PREVIOUS sentence on purpose —
// exactly right for rendering that run-on as one voice beat, exactly
// wrong here, since a lowercase run-on after a period is precisely what
// this check exists to catch (a real report from testing this — the
// piece in question came back with zero capitalization items using
// `sentencesOf`, because it never even saw "but artists are sad." as a
// separate sentence to judge). A plain, literal split on any
// terminator + whitespace, regardless of what follows, is what this
// check actually needs.
function splitOnSentenceBoundaries(raw: string): string[] {
  return raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

function firstLetterOf(text: string): string | null {
  const m = /[A-Za-z]/.exec(text);
  return m ? m[0] : null;
}

// A first version of this tried to guess "is this deliberate style or an
// accidental slip" from the draft's OVERALL capitalized-vs-lowercase
// ratio, and suppressed every flag when lowercase looked like the
// majority pattern. Tested against the piece that prompted this feature:
// a genuinely raw, run-on style can have MORE lowercase-after-period
// continuations than capitalized ones, and the writer still explicitly
// asked for exactly one of those ("but artists are sad.") to be caught —
// asking Claude to guess "style vs. slip" and silently deciding for the
// writer was the wrong shape of feature. Every other check in this whole
// pass (nudges, phrasing, repetition, ...) works the same way this one
// now does: surface it, let the writer say "leave it" if it was on
// purpose — never assume intent and suppress the option to look at all.
// The only real suppression left is the true "every single sentence
// starts lowercase" case (this app's own placeholder copy does exactly
// that) — there, there's nothing to contrast against, so there's nothing
// to flag as unusual.
const CAP_CAP = 6; // keep a raw run-on piece from turning into a wall of near-identical cards

export function checkCapitalization(raw: string): ProofreadItem[] {
  const sentences = splitOnSentenceBoundaries(raw)
    .map((text) => ({ text }))
    .filter((s) => firstLetterOf(s.text));
  if (sentences.length < 2) return []; // nothing to contrast against

  const starts = sentences.map((s) => firstLetterOf(s.text)!);
  const upperCount = starts.filter((c) => c === c.toUpperCase()).length;
  if (upperCount === 0) return []; // every sentence starts lowercase — a consistent style, not a slip

  const out: ProofreadItem[] = [];
  for (let i = 0; i < sentences.length; i++) {
    if (starts[i] === starts[i].toUpperCase()) continue; // already capitalized
    const s = sentences[i];
    const fix = s.text.replace(/[A-Za-z]/, (c) => c.toUpperCase());
    out.push({
      id: hashId("proofread-cap", s.text),
      kind: "grammar",
      quote: s.text,
      fix,
      note: "missing capital at the start of a sentence",
    });
    if (out.length >= CAP_CAP) break;
  }
  return out;
}

export function checkProofreadHeuristics(raw: string): ProofreadItem[] {
  return [...checkSpelling(raw), ...checkDuplicateWords(raw), ...checkCapitalization(raw)].slice(0, MAX_ITEMS);
}
