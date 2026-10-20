/**
 * THE FREE SECOND OPINION.
 *
 * Sits between the curated heuristic pass (`lib/writing-opportunities.ts`)
 * and the paid LLM fallback (`lib/ai/nudge-fallback.ts`) in the pipeline:
 * curated regex first (free, hand-tuned to this product's voice) → THIS
 * (free, a real prose-linting library, catches what the curated patterns
 * don't) → only if BOTH find nothing, offer the paid fallback.
 *
 * `write-good` (MIT, github.com/btford/write-good) is a small, dependency-
 * free, deterministic prose linter — no network, no API key, runs in the
 * browser exactly like `annotate.ts` does. It's still just pattern
 * matching, not understanding, so it stays inside D1 the same way the rest
 * of this pass does; it's a wider net, not a smarter one.
 *
 * Scoped deliberately narrow: only `weasel` (really/very/extremely-style
 * words), `adverb`, and `passive` are enabled — `write-good`'s `tooWordy`,
 * `cliches`, `so`, and `thereIs` checks are noisy style opinions that don't
 * map onto this product's "show me, don't tell me" nudge voice, so they're
 * left off rather than papered over downstream.
 */
import writeGood from "write-good";
import { sentencesOf, hashId, type WritingOpportunity, type OpportunityType } from "./writing-opportunities";

const CHECKS = {
  passive: true, weasel: true, adverb: true, illusion: true,
  so: false, thereIs: false, tooWordy: false, cliches: false, eprime: false,
};

function wordIn(reason: string): string | null {
  const m = /"([^"]+)"/.exec(reason);
  return m ? m[1] : null;
}

// `write-good`'s weasel list flags a word wherever it appears, with no
// notion of idiom — "just because" ("for no other reason") is a fixed
// phrase where "just" is load-bearing, not filler, and got flagged the
// same as a hedge like "I just think...". A curated allowlist (same D6
// discipline as every other lexicon in this codebase — small, extend only
// when a real case shows up, not preemptively), not a rewrite of
// `write-good`'s own logic.
const WEASEL_IDIOM_EXCEPTIONS: [string, RegExp][] = [
  ["just", /\bjust because\b/i],
];
function isIdiomException(word: string | null, text: string): boolean {
  if (!word) return false;
  const w = word.toLowerCase();
  return WEASEL_IDIOM_EXCEPTIONS.some(([weasel, re]) => weasel === w && re.test(text));
}

// Passive voice isn't always hiding a missing actor — "I was soaked
// through" (the rain did it, obviously) or "was compelled... by
// circumstances" (a cause IS named, just not a person) both trip
// write-good's generic passive check, and "name them" reads as a
// non-sequitur on either. When the sentence already has an explicit
// "by X" cause, ask whether X is specific enough instead of asking the
// writer to name something that's already named; otherwise, soften the
// default question so it invites rather than presumes.
const BY_AGENT_RE = /\bby\s+([a-z][a-z0-9' ]{1,40}?)[.,;:!?]/i;

// A sentence can trip the passive check while having no scene to attribute
// agency in at all — abstract predication ("It is an expression of...",
// "Art is a result of...") rather than a concrete event ("the vase was
// broken"). "Who did that?" only makes sense for the second kind; asked of
// the first, it reads as a non-sequitur (a real report from testing this).
//
// The first version of this guard tried to tell the two apart with a
// general "is there anything concrete in this sentence" check, borrowed
// from semantic-profile.ts's PLACE/OBJECT/ACTION_CUES — but those lexicons
// are curated for a completely different job (picking a story's visual
// backdrop: beaches, suitcases, trains) and don't cover most ordinary
// concrete nouns ("vase", "window was left open"), so it ended up
// suppressing the passive nudge on plenty of sentences that DO have a
// sensible "who did that?" answer. Narrowed to what the false positive
// actually was: the sentence's own subject is a dummy/demonstrative
// pronoun ("It is...", "This was...", "That has been...") naming nothing —
// there IS no "who" in the sentence at all, as opposed to a real subject
// like "the vase" or "the window". Only that specific, narrow pattern
// suppresses the flag; a concrete subject always still gets asked about.
const ABSTRACT_SUBJECT_RE = /^\s*(it|this|that)('s|\s+(?:is|was|has\s+been|had\s+been))\b/i;

export function detectFreeNlpOpportunities(raw: string): WritingOpportunity[] {
  const sentences = sentencesOf(raw);
  const out: WritingOpportunity[] = [];
  const seen = { vague: 0, telling: 0 };
  const CAP = { vague: 2, telling: 2 }; // never a stream of them — same discipline as the curated vague detector

  for (const s of sentences) {
    if (s.text.split(/\s+/).filter(Boolean).length < 5) continue; // too short for a passive/weasel read to mean anything
    if (seen.vague >= CAP.vague && seen.telling >= CAP.telling) break;

    let problems: { index: number; offset: number; reason: string }[];
    try { problems = writeGood(s.text, CHECKS); } catch { continue; } // fail quiet — this is a bonus layer, never a blocker
    if (!problems.length) continue;

    // one card per SENTENCE, not per match — a sentence with two weasel
    // words (or a passive clause write-good flags twice) still only earns
    // one nudge; the writer doesn't need it said twice. Walk past any
    // problem this file knows to be a false positive rather than only ever
    // looking at problems[0], so a real second issue still surfaces.
    let p: { index: number; offset: number; reason: string } | undefined;
    let word: string | null = null;
    let isPassive = false;
    let namedCause: string | undefined;
    for (const candidate of problems) {
      const candidatePassive = /passive voice/i.test(candidate.reason);
      const candidateWord = wordIn(candidate.reason);
      if (!candidatePassive && isIdiomException(candidateWord, s.text)) continue;
      const candidateNamedCause = candidatePassive ? BY_AGENT_RE.exec(s.text)?.[1]?.trim() : undefined;
      if (candidatePassive && !candidateNamedCause && ABSTRACT_SUBJECT_RE.test(s.text)) continue; // no "who" to name — see ABSTRACT_SUBJECT_RE above
      p = candidate; word = candidateWord; isPassive = candidatePassive; namedCause = candidateNamedCause;
      break;
    }
    if (!p) continue;

    const type: OpportunityType = isPassive ? "telling" : "vague";
    if (seen[type] >= CAP[type]) continue;

    const observation = isPassive
      ? namedCause ? `IS "${namedCause.toUpperCase()}" SPECIFIC ENOUGH?` : "WHO DID THAT?"
      : word
        ? `DOES "${word.toUpperCase()}" EARN ITS PLACE?`
        : "TIGHTEN THIS";
    const question = isPassive
      ? namedCause
        ? `You've named the cause — is "${namedCause}" the real reason, or is something more specific behind it?`
        : "If it's not already clear who or what did this, try naming them."
      : "Try the sentence without it. Does it lose anything?";

    out.push({
      id: hashId("freenlp-" + type, s.text),
      type,
      // below every curated heuristic (0.45+) — this only ever fills a
      // gap the hand-tuned detectors left, never outranks them.
      priority: 0.35,
      paragraphIndex: s.para,
      quote: s.text,
      observation,
      question,
    });
    seen[type]++;
  }
  return out;
}
