import {
  COSTLY_VOICES, DEFAULT_BODY, DEFAULT_MOVE, MOVE_CANDIDATES,
  type BeatSpec, type Body, type Gesture, type Move, type Voice,
} from "./vocabulary";
// story-blocks, never story-file: the studio runs this in the browser and
// story-file reaches for gray-matter, which reaches for node:fs
import { serializeStory } from "./story-blocks.mjs";
import type { Block } from "./story-blocks.mjs";

/* ══════════════════════════════════════════════════════════════════════
   THE FIRST PASS
   A machine reading of a draft. It is wrong often enough that you have
   to argue with it, which is the point — arguing with a first pass is
   faster than facing a blank page, and the final call stays yours.
   ══════════════════════════════════════════════════════════════════════ */

export const LEX = {
  loud: /\b(shout|shouted|scream|screamed|roar|crash|bang|horn|siren|thunder|suddenly|slammed|exploded|enormous|huge|massive)\b/i,
  quiet: /\b(silence|silent|quiet|still|hush|slow|breath|asleep|sleeping|whisper|nobody|nothing|no one|alone|empty|waiting|soft)\b/i,
  water: /\b(sea|ocean|water|wave|waves|rain|monsoon|river|swim|swam|salt|tide|underwater|dive|dived|current|shore)\b/i,
  dream: /\b(dream|dreamt|remember|memory|forget|forgot|somewhere|somehow|floating|blur|blurred|hours|time|felt like)\b/i,
  small: /\b(hand|coin|thread|crumb|pocket|seed|tiny|little|small|finger|shell|grain|stone|rupee|rupees)\b/i,
  doubt: /\b(maybe|perhaps|should|shouldn't|wonder|wondered|suppose|thought|thinking|why|what if|didn't know|no idea)\b/i,
  weight: /\b(never|always|everything|nothing|forever|alone|home|myself|afraid|alive|free|lost|found)\b/i,
  motion: /\b(bus|train|road|drove|driving|walked|walking|ran|left|leaves|went|going|arrive|arrived|journey|ride|flight|flew)\b/i,
  clock: /(\b\d{1,2}[:.]\d{2}\b|\b\d{1,2}\s?(am|pm)\b|\b(dawn|dusk|midnight|noon|o'clock)\b)/i,
  count: /(\b\d+\b|\b(rupees?|km|kilometres?|miles?|hours?|minutes?|days?|degrees?|metres?)\b)/i,
};

export const hits = (re: RegExp, s: string) => (s.match(new RegExp(re.source, "gi")) ?? []).length;

export const DOODLE_HINTS: [RegExp, string, Gesture][] = [
  [/\b(manta|ray|shark|turtle|whale|reef)\b/i, "manta", "react"],
  [/\b(dive|dived|diving|underwater|snorkel|mask|tank)\b/i, "diver", "breathe"],
  [/\b(komodo|dragon|lizard|monitor)\b/i, "dragon", "react"],
  [/\b(jellyfish|plankton|drifting)\b/i, "jellyfish", "breathe"],
  [/\b(sea|ocean|shore|beach|coast|salt|tide|surf)\b/i, "sea", "breathe"],
  [/\b(wave|waves|swim|swam|water|river|lake)\b/i, "wave", "breathe"],
  [/\b(rain|monsoon|wet|storm|drizzle|umbrella)\b/i, "umbrella", "loop"],
  [/\b(bird|crow|gull|sparrow|kite|wing|flew|flying)\b/i, "flock", "react"],
  [/\b(fish|market|net|prawn|crab)\b/i, "fish", "react"],
  [/\b(mountain|ghat|ghats|hill|hills|peak|ridge|valley|cliff)\b/i, "mountain", "reveal"],
  [/\b(moon|midnight|night|dark|asleep|sleep|slept)\b/i, "moon", "breathe"],
  [/\b(sun|sunrise|sunset|noon|heat|hot|gold|burn)\b/i, "sun", "breathe"],
  [/\b(bus|coach|conductor|driver)\b/i, "bus", "loop"],
  [/\b(train|station|platform|carriage|rails?)\b/i, "train", "loop"],
  [/\b(scooter|bike|motorbike|helmet|petrol)\b/i, "scooter", "loop"],
  [/\b(road|highway|route|kilometre|km|drove|driving)\b/i, "road", "trace"],
  [/\b(boat|ferry|ship|sail|island|harbour|harbor|port)\b/i, "boat", "loop"],
  [/\b(chai|tea|coffee|cup|glass|sweet|sugar|drank)\b/i, "cup", "breathe"],
  [/\b(window|seat|aisle|compartment|room|hotel|hostel)\b/i, "window", "reveal"],
  [/\b(palm|coconut|tree|forest|jungle|leaf|green)\b/i, "palm", "breathe"],
  [/\b(walk|walked|walking|step|steps|sand|barefoot|feet)\b/i, "steps", "follow"],
  [/\b(hour|hours|minute|clock|late|early|waiting|wait)\b/i, "clock", "loop"],
  [/\b(bag|backpack|luggage|packed|suitcase)\b/i, "suitcase", "loop"],
  [/\b(ticket|rupee|rupees|paid|fare|price|money|cost)\b/i, "ticket", "reveal"],
  [/\b(door|key|lock|room|checked in)\b/i, "door", "reveal"],
  [/\b(look|looked|watch|watching|saw|see|eyes|mirror)\b/i, "eye", "reveal"],
  [/\b(hand|hands|held|holding|touch|fingers)\b/i, "hand", "reveal"],
  [/\b(alone|lonely|lost|circles|again|back)\b/i, "spiral", "follow"],
  [/\b(afraid|scared|panic|confus|too much|noise|crowd)\b/i, "scribble", "scribble"],
  [/\b(left|leaving|gone|without me|goodbye|said goodbye)\b/i, "person", "escape"],
  [/\b(flower|garland|jasmine|temple|offering)\b/i, "flower", "breathe"],
  [/\b(wire|pole|electric|telephone|signal)\b/i, "wire", "reveal"],
];

export type Segment = { text: string; lineStart?: boolean } | { pause: true };

export function segment(raw: string, splitSentences = true): Segment[] {
  const out: Segment[] = [];
  let lastPause = true;
  raw.replace(/\r/g, "").split("\n").forEach((rawLine) => {
    const s = rawLine.trim();
    if (!s) { if (!lastPause && out.length) { out.push({ pause: true }); lastPause = true; } return; }
    lastPause = false;
    let parts = [s];
    if (splitSentences) {
      parts = s.split(/(?<=[.!?…])\s+(?=[^a-z])/).map((x) => x.trim()).filter(Boolean);
      const merged: string[] = [];
      parts.forEach((p) => {
        if (merged.length && p.split(/\s+/).length === 1 && /^[a-z]/.test(p)) merged[merged.length - 1] += " " + p;
        else merged.push(p);
      });
      parts = merged;
    }
    parts.forEach((text, pi) => out.push(pi === 0 ? { text, lineStart: true } : { text }));
  });
  while (out.length && "pause" in out[out.length - 1]) out.pop();
  return out;
}

type Ctx = { recent: Voice[]; opensScene: boolean; isLast: boolean; prevText: string; reflective: boolean };

function readVoice(text: string, ctx: Ctx): { voice: Voice; margin: number } {
  const t = text.trim();
  const n = t.split(/\s+/).length;
  const caps = n > 1 && t === t.toUpperCase() && /[A-Z]/.test(t);

  const s: Record<Voice, number> = {
    speak: 2.4,
    shout: hits(LEX.loud, t) * 2.6 + (/!\s*$/.test(t) ? 3.6 : 0) + (caps ? 6 : 0) + (ctx.reflective ? -0.9 : (n <= 8 ? 0.6 : -1.4)),
    thought: hits(LEX.doubt, t) * 2.2 + (/\?\s*$/.test(t) ? 3.4 : 0) + (/^[a-z]/.test(t) ? 0.8 : 0) + (n <= 14 ? 0.5 : -1),
    whisper: hits(LEX.quiet, t) * 1.9 + hits(LEX.small, t) * 1.1 + (n <= 12 ? 1.0 : -1.6),
    drift: hits(LEX.water, t) * 1.5 + hits(LEX.dream, t) * 1.5 + (t.split(".").length > 3 ? 1.4 : 0) - (n < 6 ? 1.2 : 0),
    listen: (ctx.isLast ? 3.2 : 0) + hits(LEX.weight, t) * 1.2 + (n <= 9 ? 0.9 : -1.8),
    echo: t.toLowerCase() === ctx.prevText.toLowerCase() && t.length > 0 ? 7 : -6,
    // gated behind actual evidence. In the prototype this voice fired on
    // any short line and turned lyric into telemetry; a record needs
    // something on it to record.
    // a record needs something on it to record. In reflective register a bare
    // count ("30 minutes of your month") is advice, not a fare, so only a real
    // clock/time keeps the ledger alive there.
    ledger: (ctx.reflective ? hits(LEX.clock, t) : (hits(LEX.clock, t) || hits(LEX.count, t)))
      ? hits(LEX.clock, t) * 2.6 + (ctx.reflective ? 0 : hits(LEX.count, t) * 1.8) + (n <= 8 ? 1.6 : -1.8)
      : -5,
  };

  // REFLECTIVE READS — a credo's emphasis doesn't live in travel nouns; it
  // lives in the shape of the sentences. The item headline (an imperative
  // opener), the aphorism that closes a point (a short declarative truth),
  // and the moment of vulnerability are where such a piece wants to land.
  // The travel lexicon is blind to all three, which is why an essay used to
  // render as one long flat column. These give it its cadence; the costly-
  // voice spacing below then thins them so it reads as punctuation, not noise.
  if (ctx.reflective) {
    const opener = /^(become|spread|mention|spend|find|create|try|always|never|give|share|connect|make|smile|remember|start|notice|keep|choose|introduce|default)\b/i.test(t);
    const shortTruth = n <= 8 && /[.]$/.test(t) && !/\?$/.test(t);
    const vuln = /\b(rough time|vulnerab\w*|not perfect|isn't perfect|isn't either|afraid|struggl\w*|show your life)\b/i.test(t);
    if (opener) s.listen += 1.9;
    if (shortTruth) s.listen += 1.3;
    if (vuln) { s.whisper += 2.2; s.listen -= 0.6; }
  }

  // rhythm: a voice fades from the ear slowly, and costly voices need room.
  // `speak` is exempt — it is the resting state, not a voice that tires; a
  // long run of plain lines (a list, an argument, an aphorism) must not
  // starve speak below the loud voices' floor and push narration into shout.
  ctx.recent.forEach((v, d) => {
    if (v === "speak") return;
    const dist = d + 1;
    s[v] -= (COSTLY_VOICES.includes(v) ? 3.2 : 2.0) / dist;
    if (COSTLY_VOICES.includes(v) && dist <= 2) COSTLY_VOICES.forEach((k) => { s[k] -= 2.2 / dist; });
  });
  if (ctx.opensScene) { s.listen += 0.4; s.whisper += 0.3; }

  const ranked = (Object.keys(s) as Voice[]).sort((a, b) => s[b] - s[a]);
  return { voice: ranked[0], margin: s[ranked[0]] - s[ranked[1]] };
}

function readBody(voice: Voice, text: string, recent: Voice[]): Body {
  const n = text.trim().split(/\s+/).length;
  if (voice === "shout" && n <= 5) return "compressed";
  if (voice === "thought" && recent[0] === "thought") return "offset";
  if (voice === "whisper" && recent[0] === "shout") return "edge";
  if (voice === "speak" && hits(LEX.motion, text) >= 2) return "floating";
  return DEFAULT_BODY[voice];
}

export type AnnotateOptions = {
  splitSentences?: boolean;
  /** 0–10. How much of the margin is allowed to be alive. */
  doodleDensity?: number;
  /** 0–1. Share of beats allowed a voice other than speak. §6 says ~0.3. */
  voiceBudget?: number;
  /** varies motion so two similar drafts don't render identically */
  seed?: number;
  /**
   * The register the piece is written in. "narrative" is the travel-diary
   * default. "reflective" covers essays, credos and list-pieces — second
   * person, imperative, aphoristic, placeless — where the travel-tuned reads
   * (bare-number ledgers, a shout on every short line) actively mislead.
   */
  register?: "narrative" | "reflective";
};

function seedHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pickMoveFrom = (arr: Move[], seed: number): Move => arr[Math.abs(seed) % arr.length];

/** A move for this beat: meaning first, then a seeded pick from the voice's set. */
function readMove(voice: Voice, text: string, seed: number): Move {
  if (hits(LEX.loud, text))                          return pickMoveFrom(["snap", "grow", "stretch"], seed);
  if (hits(LEX.water, text) || hits(LEX.dream, text)) return pickMoveFrom(["wave", "ripple", "move"], seed);
  if (hits(LEX.motion, text))                        return pickMoveFrom(["rise", "move"], seed);
  if (hits(LEX.quiet, text))                         return pickMoveFrom(["smear", "rise", "enter"], seed);
  return pickMoveFrom(MOVE_CANDIDATES[voice] ?? ["enter"], seed);
}

/* ── the refrain ──────────────────────────────────────────────────────
   A credo or a list-piece often turns on a repeated phrase — a mantra the
   writer says to themselves ("small spark"), a line that comes back. The
   travel engine had no notion of it: the refrain rendered as flat speak and
   its final, quiet statement got no weight. This finds the phrase that
   recurs and lifts its calmest occurrence to `listen`, so the page lands on
   it the way the writing does. Deterministic, no LLM. Also surfaced to the
   art-direction generator (via `refrainOf`) so it can become the signature. */
const REFRAIN_STOP = new Set(
  ("the a an and or but of to in on at for with is are was be it its you your i "
  + "we they he she them his her my me so as if then than that this these those "
  + "not no do does did can will just even more most about into out up down each "
  + "one two some any all your youre theyll").split(/\s+/),
);
const normRefrain = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/** the phrase (2–3 content words) that recurs across the draft, or "" */
export function refrainOf(raw: string): string {
  const lines = normRefrain(raw).split("\n").map((l) => l.trim()).filter(Boolean);
  const grams = new Map<string, number>();
  for (const raw2 of normRefrain(raw).split(/[.!?\n]+/)) {
    const w = raw2.split(/\s+/).filter((x) => x && !REFRAIN_STOP.has(x));
    for (let i = 0; i < w.length - 1; i++) grams.set(`${w[i]} ${w[i + 1]}`, (grams.get(`${w[i]} ${w[i + 1]}`) ?? 0) + 1);
  }
  let best = "", bestN = 1;
  for (const [g, n] of grams) if (n > bestN) { best = g; bestN = n; }
  return bestN >= 2 ? best : "";
}

export function annotate(raw: string, opts: AnnotateOptions = {}): BeatSpec[] {
  const { splitSentences = true, doodleDensity = 5, voiceBudget = 0.3, register = "narrative" } = opts;
  const reflective = register === "reflective";
  const base = (opts.seed ?? seedHash(raw)) >>> 0;
  const segs = segment(raw, splitSentences);
  const textCount = segs.filter((s) => !("pause" in s)).length;

  const beats: BeatSpec[] = [];
  const recent: Voice[] = [];
  let opensScene = true;
  let prevText = "";
  let i = 0;
  let lastSide: "left" | "right" = "right";
  let sinceDoodle = 99;
  const margins: number[] = [];

  segs.forEach((seg, idx) => {
    if ("pause" in seg) { beats.push({ text: "", voice: "speak", hold: true, beats: 2 }); opensScene = true; return; }
    const isLast = idx === segs.length - 1;
    const { voice, margin } = readVoice(seg.text, { recent, opensScene, isLast, prevText, reflective });
    const body = readBody(voice, seg.text, recent);

    let doodle: string | undefined;
    let gesture: Gesture | undefined;
    for (const [re, d, g] of DOODLE_HINTS) {
      if (re.test(seg.text)) { doodle = d; gesture = g; break; }
    }
    const wanted = doodleDensity / 10;
    const noise = Math.abs((Math.sin((i + 1) * 12.9898) * 43758.5453) % 1);
    if (doodle && (sinceDoodle < 2 || noise > wanted)) { doodle = undefined; gesture = undefined; }

    let side: "left" | "right" | undefined;
    if (doodle) { side = lastSide === "right" ? "left" : "right"; lastSide = side; sinceDoodle = 0; }
    else sinceDoodle++;

    const move = readMove(voice, seg.text, base + i * 2654435761);
    beats.push({ text: seg.text, voice, body, gesture, doodle, side, move, lineStart: seg.lineStart });
    margins.push(voice === "speak" ? Infinity : margin);
    recent.unshift(voice);
    if (recent.length > 5) recent.pop();
    prevText = seg.text;
    opensScene = false;
    i++;
  });

  // lift the recurring refrain (and any "say to yourself …" mantra) so the
  // page lands on it. Only the calmest occurrence, so it stays punctuation.
  const refrain = refrainOf(raw);
  const isMantra = (t: string) => /\bsay to yourself\b/i.test(t);
  const carriesRefrain = (t: string) =>
    (!!refrain && normRefrain(t).includes(refrain)) || isMantra(t);
  const cands = beats
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => !b.hold && b.voice === "speak" && carriesRefrain(b.text));
  if (cands.length) {
    cands.sort((a, c) => a.b.text.split(/\s+/).length - c.b.text.split(/\s+/).length);
    const pick = cands[0].b;
    pick.voice = "listen";
    pick.body = DEFAULT_BODY.listen;
    pick.move = pick.move ?? "rise";
  }

  return enforceRatio(beats, textCount, voiceBudget);
}

/**
 * §6 — if everything moves, nothing feels alive. When the draft has
 * pulled more voices than the budget allows, the least confident of them
 * are demoted to speak. The engine loses its favourites first.
 */
export function enforceRatio(beats: BeatSpec[], textCount: number, budget: number): BeatSpec[] {
  const voiced = beats.filter((b) => !b.hold && b.voice !== "speak");
  const allowed = Math.max(1, Math.round(textCount * budget));
  if (voiced.length <= allowed) return beats;

  // keep the strongest reads: shout/listen carry structure, drift/whisper are cheaper to lose
  const rank: Record<Voice, number> = { echo: 5, shout: 4, ledger: 3.5, listen: 3, thought: 2, drift: 1, whisper: 1, speak: 0 };
  const sorted = [...voiced].sort((a, b) => rank[b.voice] - rank[a.voice]);
  const keep = new Set(sorted.slice(0, allowed));
  return beats.map((b) =>
    b.hold || b.voice === "speak" || keep.has(b)
      ? b
      : { ...b, voice: "speak" as Voice, body: DEFAULT_BODY.speak },
  );
}

/* ── the quality bar (§22) ─────────────────────────────────────────────
   Lives in lib/story-blocks.mjs now, and reads blocks rather than specs,
   so the studio, the emitter and scripts/check-stories.mjs all report on a
   piece the same way. Route a draft through `toBlocks` and hand the result
   to `analyse`.                                                           */

export { analyse } from "./story-blocks.mjs";

/* ── emit ─────────────────────────────────────────────────────────────── */

/**
 * A machine first pass, in the one shape a story file is made of. The
 * studio saves these, previews these, and measures these — one road out,
 * so what you read in the preview is what lands on disk.
 */
export function toBlocks(beats: BeatSpec[]): Block[] {
  return beats.map((b): Block => {
    if (b.hold) return { kind: "hold", beats: b.beats ?? 2 };

    // the body a voice already wants is not worth saying out loud
    const body = b.body && b.body !== DEFAULT_BODY[b.voice] ? b.body : undefined;
    return {
      kind: "beat",
      voice: b.voice,
      text: b.text,
      bare: b.voice === "speak" && !b.doodle && !body && (!b.move || b.move === DEFAULT_MOVE[b.voice]),
      body,
      doodle: b.doodle,
      side: b.doodle ? b.side : undefined,
      gesture: b.doodle ? b.gesture : undefined,
      move: b.move && b.move !== DEFAULT_MOVE[b.voice] ? b.move : undefined,
      lineStart: b.lineStart || undefined,
    };
  });
}

export function toMDX(
  meta: { place: string; date: string; fragment: string; accent: string },
  beats: BeatSpec[],
): string {
  // a story is made of scenes, so a generated one starts with one even
  // though the first pass has no idea where the others go
  return serializeStory(meta, [
    { kind: "raw", text: "<Scene>" },
    ...toBlocks(beats),
    { kind: "raw", text: "</Scene>" },
  ]);
}
