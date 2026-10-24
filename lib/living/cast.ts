/**
 * THE CASTER  (text → a living scene)
 *
 * Turns prose into what the worlds render: one world + a sequence of beats. Each
 * beat carries a BEHAVIOUR (how the words perform), an optional ELEMENT (a small
 * summoned illustration), and — new — a set of SPANS: inline, meaning-aware word
 * treatments (emphasis, a recurring signature motif, a heartbeat) plus an
 * optional per-beat SCENE trigger (e.g. the storm firing on the climax). This is
 * the "director" layer: the dense set of small, motivated decisions that make a
 * page feel hand-authored instead of auto-generated.
 *
 * This is the fast TS pass that runs live in the product (no Python); the
 * `brain/` ML pass refines the same shape offline (D1). Restraint (D9) is a
 * budget enforced here: the default behaviour is `unveil`, signature behaviours
 * and emphasis only fire when the words cue them, and the big `swell` is capped
 * to the 1–2 real peaks.
 */

import { getWorld, type World, type WorldKey } from "./worlds";

export type BehaviorKey =
  | "unveil" | "swell" | "tremor" | "dissolve" | "heartbeat"
  | "rush" | "fall" | "drift" | "hold";
export type ElementKey = "none" | "phone" | "flame";

/** Inline word treatments the director casts into a beat. `em` accents an
 *  emotionally loaded word; `motif` is the story's recurring signature (a
 *  repeated proper noun, shimmered); `heartbeat` is an inserted ♥ pulse. */
export type Mark = "em" | "motif" | "heartbeat";
export type Span = { text: string; mark?: Mark };
/** A per-beat scene trigger — the world does something at this beat (the storm
 *  firing, etc.). Curated + closed (D6); grows by adding keys. */
export type SceneKey = "storm";

export type LivingBeat = {
  text: string;                 // plain text (segmentation, SEO, fallback render)
  spans?: Span[];               // the directed render segments (text split by marks)
  behavior: BehaviorKey;
  element: ElementKey;
  loud: boolean;
  scene?: SceneKey;
};
export type LivingScene = {
  world: World;
  eyebrow?: string;
  title?: string;
  dek?: string;
  beats: LivingBeat[];
};

/** The spans of a beat, falling back to the plain text when a caller (e.g. the
 *  brain path) didn't produce directed spans. */
export function spansOf(b: LivingBeat): Span[] {
  return b.spans && b.spans.length ? b.spans : [{ text: b.text }];
}

/* ── world selection — motivated by the story (never a default black/neon) ── */
const WORLD_CUES: [WorldKey, RegExp][] = [
  ["dawn-coast", /\b(sea|ocean|coast|shore|tide|beach|dawn|sunrise|sunset|waves?|dive[ds]?|diving|snorkel|reef|boats?|sand|horizon)\b/i],
  ["meadow", /\b(meadow|field|garden|flowers?|blossom|grass|spring|orchard|hills?|birdsong|picnic)\b/i],
  ["ember-interior", /\b(kitchen|home|tea|coffee|grandmother|grandfather|mother|father|bedroom|sofa|fireplace|receipt|pancakes|the lamp)\b/i],
  ["storm", /\b(storm|downpour|thunder|lightning|flood|soaked|drizzle|monsoon|torrential|raging|pouring)\b/i],
  ["noir-room", /\b(missed call|phone|ringing|footsteps?|afraid|behind|knife|blood|detective|intruder|stalker|the number)\b/i],
  ["dream", /\b(dream|dreamt|surreal|floating|melting|weightless|unreal|impossible|one more country)\b/i],
  ["twilight-street", /\b(london|cobble|cobblestone|streetlamp|lamppost|neon|after dark|at night|night bus|midnight|the corner)\b/i],
  ["nocturne", /\b(stars?|constellation|cosmos|the universe|midnight sky|grief|mourning|funeral|death|passed away)\b/i],
];
export function pickWorld(text: string): WorldKey {
  let best: WorldKey = "daylight";
  let bestN = 0;
  for (const [key, re] of WORLD_CUES) {
    const n = (text.match(new RegExp(re.source, "gi")) ?? []).length;
    if (n > bestN) { bestN = n; best = key; }
  }
  return best;
}

/* ── per-beat behaviour cues (first match wins; order = priority) ── */
const BEHAVIOR_CUES: [BehaviorKey, RegExp][] = [
  ["tremor", /\b[A-Z]{3,}\b|\b(panic|afraid|scream(ed|ing)?|shaking|trembl\w*|pounding|behind|terror|froze with fear|sweating)\b/],
  ["dissolve", /\b(gone|vanish\w*|disappear\w*|forgot\w*|erased|faded away|dissolv\w*|lost to)\b/i],
  ["heartbeat", /\b(heart|heartbeat|breathe|breathing|pulse|chest)\b/i],
  ["rush", /\b(ran|rushed|raced|sprinted|bolted|dashed|flew past|hurried)\b/i],
  ["fall", /\b(fell|falling|dropped|collapsed|sank|plummet\w*|tumbl\w*|gave way)\b/i],
  ["drift", /\b(years later|still think|looking back|i remember|used to|long ago|all these years|back then|i wonder)\b/i],
  ["hold", /\b(silence|quiet|stopped|frozen|stood still|hush|said nothing|no one spoke|held (my|her|his) breath|stillness)\b/i],
];
function cueBehavior(p: string): BehaviorKey | null {
  for (const [b, re] of BEHAVIOR_CUES) if (re.test(p)) return b;
  const words = p.trim().split(/\s+/).length;
  // a question is contemplative
  if (/\?\s*$/.test(p.trim())) return "drift";
  // a short, deadpan declarative aside ("Very healthy. Very stable.") reads as
  // an echo rather than a held beat
  if (words <= 6 && /\.\s*$/.test(p.trim()) && /^(very|so|quite|really|just|all|still|again)\b/i.test(p.trim())) return "drift";
  if (words <= 4) return "hold";
  return null;
}

const ELEMENT_CUES: [ElementKey, RegExp][] = [
  ["phone", /\b(phone|missed call|ringing|the number|dialed|dialled)\b/i],
  ["flame", /\b(lighter|flame|cigarette|match|candle|a light)\b/i],
];
function cueElement(p: string): ElementKey {
  for (const [e, re] of ELEMENT_CUES) if (re.test(p)) return e;
  return "none";
}

/* energy, for spending the swell budget on real peaks. Includes high-arousal
 * words that carry a turn even when the sentence is grammatically calm, and a
 * boost for reversal markers ("Until…", "Then suddenly…") that signal the
 * story's hinge — the climax is often short and quiet, not loud. */
const HOT = /\b(ran|rushed|raced|slammed|screamed|shouted|burst|suddenly|panic|exploded|gone|crashing|chase|grabbed|behind|kill(ed)?|die[ds]?|death|dead|blood|drown\w*|broke|shattered|collapsed)\b/i;
const TURN = /^(until|then|suddenly|but then|and then|that'?s when|the moment|and just like that|next thing)\b/i;
function energy(p: string, motif?: string | null): number {
  const t = p.trim();
  const words = p.split(/\s+/).length || 1;
  let e = (p.match(new RegExp(HOT.source, "gi")) ?? []).length * 2;
  e += (p.match(/!/g) ?? []).length;
  // an ALL-CAPS shout spikes — unless it's just the recurring motif (e.g. ABBA)
  const capped = p.replace(motif ? new RegExp(`\\b${motif}\\b`, "g") : /^$/, " ");
  if (/\b[A-Z]{3,}\b/.test(capped)) e += 2;
  if (TURN.test(t)) e += 1.6;              // a reversal marker = the hinge
  if (words <= 6) e += 1;
  return e / Math.sqrt(words);
}

/* ─────────────────────────────────────────────────────────────────────────
 * THE DIRECTOR — the dense per-beat/per-word decisions
 * ───────────────────────────────────────────────────────────────────────── */

const STOP = new Set(["the", "and", "but", "for", "very", "not", "with", "from", "this", "that", "then", "when", "what", "your", "you", "our", "his", "her", "she", "him", "they", "them", "was", "were", "are", "had", "have", "did", "its", "it's", "a", "i", "i've", "i'm"]);

/** The story's recurring SIGNATURE motif: a repeated, salient token (an
 *  ALL-CAPS word like ABBA, or a proper noun) that appears ≥2×. Marked in every
 *  beat it occurs so the page has one quiet through-line. */
function detectMotif(text: string): string | null {
  const counts = new Map<string, { n: number; caps: boolean }>();
  // tally ALL-CAPS tokens and Title-Case proper nouns (not only at sentence start)
  const re = /(^|[^.!?]\s+)?\b([A-Z][A-Za-z']{2,}|[A-Z]{2,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const tok = m[2];
    const low = tok.toLowerCase();
    if (STOP.has(low)) continue;
    const allCaps = /^[A-Z]{2,}$/.test(tok);
    const atSentenceStart = !m[1]; // matched at the very start, or after . ! ?
    const prev = counts.get(tok) ?? { n: 0, caps: allCaps };
    // a Title-Case word only counts toward a motif on occurrences that are NOT
    // sentence-initial (those are just capitalisation, not emphasis)
    if (allCaps || !atSentenceStart) prev.n += 1;
    prev.caps = prev.caps || allCaps;
    counts.set(tok, prev);
  }
  let best: string | null = null, bestN = 1;
  for (const [tok, v] of counts) {
    // ALL-CAPS needs ≥2; a proper noun needs ≥2 non-initial sightings
    if (v.n >= 2 && v.n > bestN) { best = tok; bestN = v.n; }
    else if (v.n >= 2 && v.n === bestN && v.caps && best && !/^[A-Z]{2,}$/.test(best)) best = tok;
  }
  return best;
}

/** Emphasis: the one emotionally loaded word (or intensifier+noun phrase) worth
 *  accenting in a beat. Curated lexicon (D6); ≤1 per beat (restraint). */
const EM_INTENSIFIER = /\b(raging|torrential|pouring|blinding|deafening|crushing|howling|searing|roaring|relentless|blistering)\s+(\w+)/i;
const EM_WORDS = /\b(wrong|soaked|shattered|broken|aching|furious|trembling|drowning|vanished|unbearable|frozen|burning|screaming|silent|empty|alive|free|lost|alone|breathless|terrified|weightless)\b/i;
function emRange(text: string): [number, number] | null {
  const phr = EM_INTENSIFIER.exec(text);
  if (phr) return [phr.index, phr.index + phr[0].length];
  const w = EM_WORDS.exec(text);
  if (w) return [w.index, w.index + w[0].length];
  return null;
}

/** Build the directed SPANS for one beat: splice in the motif (every match), one
 *  emphasis range, and — once per story — a heartbeat ♥ after a breath/heart
 *  word. Overlaps resolve motif > em. */
function markSpans(
  text: string,
  motif: string | null,
  allowEm: boolean,
  heartbeat: boolean,
): { spans: Span[]; usedHeartbeat: boolean } {
  type R = { start: number; end: number; mark: Mark };
  const ranges: R[] = [];

  if (motif) {
    const re = new RegExp(`\\b${motif.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) ranges.push({ start: m.index, end: m.index + m[0].length, mark: "motif" });
  }
  if (allowEm) {
    const e = emRange(text);
    if (e) ranges.push({ start: e[0], end: e[1], mark: "em" });
  }
  // a heartbeat is an INSERTED ♥ after the last breath/heart word
  let hbAt: number | null = null;
  let usedHeartbeat = false;
  if (heartbeat) {
    const re = /\b(breathe|breath|heartbeat|heart|pulse)\b/gi;
    let m: RegExpExecArray | null, last: RegExpExecArray | null = null;
    while ((m = re.exec(text))) last = m;
    if (last) { hbAt = last.index + last[0].length; usedHeartbeat = true; }
  }

  // drop overlapping ranges (motif wins)
  ranges.sort((a, b) => a.start - b.start || (a.mark === "motif" ? -1 : 1));
  const kept: R[] = [];
  for (const r of ranges) if (!kept.some((k) => r.start < k.end && r.end > k.start)) kept.push(r);
  kept.sort((a, b) => a.start - b.start);

  // slice text into spans across range boundaries + the heartbeat insertion
  const spans: Span[] = [];
  let i = 0;
  const pushText = (from: number, to: number) => {
    if (to <= from) return;
    // honour the heartbeat insertion point inside this plain run
    if (hbAt !== null && hbAt > from && hbAt <= to) {
      if (hbAt > from) spans.push({ text: text.slice(from, hbAt) });
      spans.push({ text: " ♥", mark: "heartbeat" });
      if (hbAt < to) spans.push({ text: text.slice(hbAt, to) });
      hbAt = null;
    } else {
      spans.push({ text: text.slice(from, to) });
    }
  };
  for (const r of kept) {
    pushText(i, r.start);
    spans.push({ text: text.slice(r.start, r.end), mark: r.mark });
    i = r.end;
  }
  pushText(i, text.length);
  // a heartbeat landing exactly at text end
  if (hbAt !== null) spans.push({ text: " ♥", mark: "heartbeat" });

  return { spans: spans.filter((s) => s.text !== ""), usedHeartbeat };
}

/** Which single beat should fire the storm scene — the strongest storm-peak cue,
 *  not every mention (so "not a storm" doesn't fire it). */
const STORM_PEAK = /\b(raging storm|a storm|the storm|thunder|lightning|downpour|torrential)\b/i;
function pickStormBeat(paras: string[]): number {
  let best = -1, bestScore = 0;
  paras.forEach((p, i) => {
    let s = 0;
    if (/\braging storm\b/i.test(p)) s += 3;
    if (/\b(thunder|lightning)\b/i.test(p)) s += 2;
    if (/\b(downpour|torrential)\b/i.test(p)) s += 1;
    if (/\bnot a storm\b/i.test(p)) s -= 3; // a deflation, not the peak
    if (s > bestScore) { bestScore = s; best = i; }
  });
  return bestScore >= 2 ? best : -1;
}

/** A dek (subtitle) distilled from the story's own words — never invented copy.
 *  Prefer the climax (a swell/loud line); otherwise the shortest reversal-marker
 *  line ("Then…", "Until…"); otherwise the first short, standalone line after the
 *  opening. So even a quiet story whose turn never spikes still gets a through-
 *  line under its title. */
function deriveDek(beats: LivingBeat[]): string | undefined {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const wc = (s: string) => s.trim().split(/\s+/).length;
  const swell = beats.find((b) => b.loud || b.behavior === "swell");
  if (swell) return clean(swell.text);
  // short, standalone lines that aren't the opening or a deadpan echo aside
  const cand = beats.filter((b, i) => i > 0 && b.behavior !== "drift" && wc(b.text) >= 3 && wc(b.text) <= 12);
  if (!cand.length) return undefined;
  // a reversal-marker line is the hinge; otherwise the most charged short line
  const turns = cand.filter((b) => TURN.test(b.text.trim()));
  const pool = turns.length ? turns : cand;
  pool.sort((a, b) => energy(b.text) - energy(a.text));
  return clean(pool[0].text);
}

export function castLivingScene(
  text: string,
  meta: { eyebrow?: string; title?: string; world?: WorldKey } = {},
): LivingScene {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const motif = detectMotif(text);
  const motifRe = motif ? new RegExp(`\\b${motif.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g") : null;

  // the swell budget: at most 2 genuine spikes above the baseline (motif-aware,
  // so a recurring ALL-CAPS name doesn't read as a shout)
  const es = paras.map((p) => energy(p, motif));
  const mean = es.reduce((a, b) => a + b, 0) / (es.length || 1);
  const loud = new Set(
    es.map((e, i) => ({ i, e }))
      .filter((s) => s.e >= 0.9 && s.e >= mean + 0.5)
      .sort((a, b) => b.e - a.e)
      .slice(0, 2)
      .map((s) => s.i),
  );

  const stormBeat = pickStormBeat(paras);
  const usedElement = new Set<ElementKey>();
  let heartbeatSpent = false;
  let emCount = 0;
  const emBudget = Math.max(2, Math.round(paras.length * 0.3)); // restraint

  const beats: LivingBeat[] = paras.map((p, i) => {
    // detect behaviour on text with the motif stripped, so a recurring ALL-CAPS
    // name (ABBA) doesn't trip the tremor/ALL-CAPS cue
    let behavior = cueBehavior(motifRe ? p.replace(motifRe, " ") : p) ?? "unveil";
    if (behavior === "unveil" && loud.has(i)) behavior = "swell";

    let element = cueElement(p);
    if (element !== "none" && usedElement.has(element)) element = "none";
    else if (element !== "none") usedElement.add(element);

    // heartbeat the words themselves (the ♥) wherever a breath/heart beat sits
    const wantHeartbeat = !heartbeatSpent && /\b(breathe|breath|heartbeat|pulse)\b/i.test(p);
    // emphasis is rationed, but always allowed on the storm/climax beat
    const allowEm = (emCount < emBudget || i === stormBeat) && emRange(p) !== null;

    const { spans, usedHeartbeat } = markSpans(p, motif, allowEm, wantHeartbeat);
    if (usedHeartbeat) heartbeatSpent = true;
    if (spans.some((s) => s.mark === "em")) emCount += 1;

    const scene: SceneKey | undefined = i === stormBeat ? "storm" : undefined;
    return { text: p, spans, behavior, element, loud: loud.has(i), scene };
  });

  const dek = deriveDek(beats);

  const world = getWorld(meta.world ?? pickWorld(text));
  return { world, eyebrow: meta.eyebrow, title: meta.title, dek, beats };
}

/** The brain's casting (`brain/cast.py`) — world chosen from the semantic
 *  profile. Resolve it into a renderable LivingScene; if the brain hasn't
 *  produced directed spans yet, the renderers fall back to plain text. */
export type BrainScene = {
  worldKey: WorldKey;
  eyebrow?: string | null;
  title?: string | null;
  dek?: string | null;
  beats: LivingBeat[];
};
export function livingSceneFromBrain(j: BrainScene): LivingScene {
  return {
    world: getWorld(j.worldKey),
    eyebrow: j.eyebrow ?? undefined,
    title: j.title ?? undefined,
    dek: j.dek ?? undefined,
    beats: j.beats,
  };
}

/* ── shared: spans → HTML, mapping marks to a renderer's class names ── */
const escHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
export function spansToHtml(spans: Span[], cls: Partial<Record<Mark, string>>): string {
  return spans.map((s) => {
    const t = escHtml(s.text);
    const c = s.mark ? cls[s.mark] : undefined;
    return c ? `<span class="${c}">${t}</span>` : t;
  }).join("");
}

/* ── worlds that have a bespoke rich scene component ── */
// Worlds that render through the crafted, now spec-driven CoastStorm engine —
// each in its OWN palette/glow/ambient/silhouette (see coastStormInput). noir-room
// has its own bespoke component; the light non-coastal worlds stay on LivingStory
// for now. Grow this set as more worlds get their skins dialled in (D6).
export const RICH_WORLDS = new Set<WorldKey>(["storm", "twilight-street", "dream", "nocturne"]);

/* ── MEDIUMS — surfaces where the text becomes an artifact (not a world the
 *    story is set inside). Selected alongside worlds; the text casts the same,
 *    only the render differs. Every medium is GENERATIVE (D10): an adapter maps
 *    the director's output to the surface, a component renders it. ── */
export const MEDIUMS = new Set<string>(["maximalist", "postcard", "evidence", "manuscript"]);
export const MEDIUM_LABELS: Record<string, string> = {
  maximalist: "maximalist", postcard: "lost postcard", evidence: "evidence board", manuscript: "illuminated",
};

/* shared helpers for the medium adapters */
const clip = (s: string, n: number) => { const w = s.trim().split(/\s+/); return w.length > n ? w.slice(0, n).join(" ") : s.trim(); };
const firstEm = (beats: LivingBeat[]) => {
  for (const b of beats) { const em = (b.spans || []).find((s) => s.mark === "em"); if (em) return { word: em.text.trim(), text: b.text }; }
  return undefined;
};
const climaxIndex = (beats: LivingBeat[]) => {
  const i = beats.findIndex((b) => b.loud || b.behavior === "swell");
  if (i >= 0) return i;
  let best = -1, be = -1; beats.forEach((b, j) => { const e = energy(b.text); if (e > be) { be = e; best = j; } });
  return best;
};
const storyDate = (text: string) => {
  const season = text.match(/\b(spring|summer|autumn|fall|winter)\b[^.]{0,10}?['’]?\d{2,4}\b/i);
  if (season) return season[0].trim();
  const yr = text.match(/\b(19|20)\d\d\b/); return yr ? yr[0] : undefined;
};

/* ── POSTCARD — a found travel memory (D10 generative) ── */
export type PostcardInput = {
  stampPlace: string; date?: string; lead: string;
  blocks: { text: string; underline?: string }[];
  scream?: string; aside?: string; caption: string;
};
export function postcardInput(scene: LivingScene): PostcardInput {
  const beats = scene.beats;
  const allText = [scene.title, ...beats.map((b) => b.text)].filter(Boolean).join(" ");
  const motif = detectMotif(allText);
  const place = motif && motif.length > 2 ? motif : undefined;
  const leadFromBeat0 = !scene.title;
  const lead = clip((scene.title || beats[0]?.text || "").replace(/\s+/g, " "), 16);
  const ci = climaxIndex(beats);
  const scream = ci >= 0 ? clip(beats[ci].text.replace(/[.?!]+$/, ""), 8) : (scene.dek ? scene.dek.replace(/[.?!]+$/, "") : undefined);
  const em = firstEm(beats);
  const blocks = beats
    .map((b, i) => ({ b, i }))
    .filter(({ i }) => i !== ci && !(leadFromBeat0 && i === 0))
    .slice(0, 3)
    .map(({ b }) => ({ text: clip(b.text.replace(/\s+/g, " "), 34), underline: em && b.text.includes(em.word) ? em.word : undefined }));
  const aside = scene.dek && scene.dek.split(/\s+/).length <= 6 ? scene.dek.replace(/[.?!]+$/, "") : (place ? `still — ${place}` : undefined);
  return {
    stampPlace: place ? place.toUpperCase().slice(0, 9) : "POST",
    date: storyDate(allText), lead, blocks, scream, aside,
    caption: place ? `— the view from ${place}` : "— a view",
  };
}

/* ── EVIDENCE BOARD — a case file (D10 generative) ── */
export type EvidenceInput = {
  caseTitle: string;
  cards: { label: string; text: string; circle?: string; danger?: boolean; sticky?: boolean }[];
  climax: number;   // index of the card that is the thread hub
};
export function evidenceInput(scene: LivingScene): EvidenceInput {
  const beats = scene.beats;
  const ci = climaxIndex(beats);
  const caseTitle = clip(scene.title || scene.dek || beats[0]?.text || "the matter", 6).toUpperCase();
  // a "sticky note" lead: the first question the writer asks themselves
  const qIdx = beats.findIndex((b) => /\?\s*$/.test(b.text.trim()));
  const cards = beats
    .map((b, i) => {
      const em = (b.spans || []).find((s) => s.mark === "em");
      const sticky = i === qIdx && i !== ci;
      return {
        label: sticky ? "Lead" : i === ci ? "The turn" : `Note · ${i + 1}`,
        text: clip(b.text.replace(/\s+/g, " "), sticky ? 10 : 20),
        circle: em ? em.text.trim() : undefined,
        danger: i === ci,
        sticky,
      };
    })
    .slice(0, 6);
  return { caseTitle, cards, climax: Math.min(ci, cards.length - 1) };
}

/* ── ILLUMINATED MANUSCRIPT — modern life as a sacred text (D10 generative).
 *    The illumination is generative on any text; the witty medieval rewording
 *    is a future brain feature. ── */
export type ManuscriptInput = {
  title: string; dropcap: string; rest: string;
  paras: { html: string }[];     // body with rubricated em/motif spans
  marginNote?: string; dragonLabel?: string;
};
export function manuscriptInput(scene: LivingScene): ManuscriptInput {
  const beats = scene.beats;
  const allText = [scene.title, ...beats.map((b) => b.text)].filter(Boolean).join(" ");
  const motif = detectMotif(allText);
  const motifRe = motif ? new RegExp(`\\b${motif.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g") : null;
  const title = clip(scene.title || scene.dek || beats[0]?.text || "The Lesson", 7);
  const firstBeat = (beats[0]?.text || "In the beginning.").trim();
  const dropcap = (firstBeat[0] || "I").toUpperCase();
  const rest = firstBeat.slice(1);
  const rubricate = (t: string) => {
    let h = escHtml(t);
    // rubricate the motif everywhere, and em words, in red small-caps
    if (motif) h = h.replace(new RegExp(`\\b(${motif})\\b`, "g"), '<span class="ms-rubric">$1</span>');
    return h;
  };
  const paras = beats.slice(1).map((b) => {
    // apply em spans as rubric
    const html = spansToHtml(spansOf(b), { em: "ms-rubric", motif: "ms-rubric", heartbeat: "ms-rubric" });
    // also rubricate motif in the plain parts
    return { html: motifRe ? html.replace(motifRe, (m) => `<span class="ms-rubric">${m}</span>`) : html };
  });
  return {
    title, dropcap, rest, paras,
    marginNote: scene.dek ? clip(scene.dek.replace(/[.?!]+$/, ""), 4) : undefined,
    dragonLabel: motif && motif.length > 2 ? motif.toLowerCase() : undefined,
  };
}

export type CoastStormInput = {
  eyebrow?: string;
  title?: string;
  dek?: string;
  beats: { text: string; kind?: "lead" | "echo" | "whisper" | "swell" | "close" | "plain"; doodle?: boolean; storm?: boolean }[];
  spec?: { bg?: string; glow?: string; accent?: string; scheme?: "light" | "dark"; ambient?: "rain" | "stars" | "motes"; silhouette?: string };
};
/** Adapt a cast LivingScene into the CoastStorm world's props — map behaviours to
 *  its treatments, render the directed spans into its own class names (em /
 *  abba-shimmer / ♥), flag the storm beat from the scene trigger, place one
 *  margin doodle. */
export function coastStormInput(scene: LivingScene): CoastStormInput {
  let doodled = false;
  const beats = scene.beats.map((b, i) => {
    let kind: CoastStormInput["beats"][number]["kind"];
    if (b.loud || b.behavior === "swell") kind = "swell";
    else if (b.behavior === "drift") kind = "echo";
    else if (b.behavior === "hold") kind = "whisper";
    else if (b.behavior === "heartbeat") kind = "close";
    else if (i === 0) kind = "lead";

    const storm = b.scene === "storm";

    let doodle = false;
    if (!doodled && /\b(beach|sea|shore|coast|anchor|walk|tide|routine)\b/i.test(b.text)) { doodle = true; doodled = true; }

    // the close line pulses, so promote a heartbeat mark into CoastStorm's hb
    const text = spansToHtml(spansOf(b), { em: "em", motif: "abba", heartbeat: "hb" });
    return { text, kind, doodle, storm };
  });
  // SPEC — the per-world skin (D6): each world renders in its own palette, glow,
  // ambient and silhouette through this one crafted renderer, so the library can
  // grow to any number of distinct premium worlds just by adding rows to WORLDS.
  const w = scene.world;
  // "storm" IS CoastStorm's native, hand-tuned look (the "rained out" bar) — leave
  // it on the default skin. Every OTHER world supplies its own skin (palette, glow,
  // ambient, silhouette) so it renders distinctly through the same crafted engine.
  const silhouette = w.sceneSvg ? w.sceneSvg : (w.key === "dream" ? "none" : undefined);
  const spec = w.key === "storm" ? undefined
    : { bg: w.ground, glow: w.warm, accent: w.accent, scheme: w.scheme, ambient: w.ambient, silhouette };
  return { eyebrow: scene.eyebrow, title: scene.title, dek: scene.dek, beats, spec };
}

/* ── NOIR-ROOM adapter ── (unchanged grammar; now reads spans for plain text) */
export type NoirInput = {
  eyebrow?: string;
  title?: string;
  dek?: string;
  beats: {
    text: string;
    kind?: "lead" | "whisper" | "behind" | "run" | "plain";
    call?: { who: string; sub: string; danger?: boolean };
    tremor?: boolean;
  }[];
};
const CALL_CUE = /\b(missed call|phone|rang|ringing|the number|dialed|dialled|called|calling)\b/i;
const CAPS = /\b([A-Z]{3,})\b/;
export function noirRoomInput(scene: LivingScene): NoirInput {
  const callBeats = scene.beats
    .map((b, i) => ({ i, hit: CALL_CUE.test(b.text) }))
    .filter((x) => x.hit)
    .map((x) => x.i)
    .slice(0, 3);
  const lastCall = callBeats[callBeats.length - 1];

  const beats = scene.beats.map((b, i) => {
    const caps = CAPS.exec(b.text);
    const isBehind = (b.behavior === "tremor" || b.loud) && !!caps;
    const isRun = b.behavior === "rush" && b.text.trim().split(/\s+/).length <= 4;

    let kind: NoirInput["beats"][number]["kind"];
    if (isBehind) kind = "behind";
    else if (isRun) kind = "run";
    else if (b.behavior === "hold") kind = "whisper";
    else if (i === 0) kind = "lead";

    let text = b.text;
    if (isBehind && caps) text = text.replace(caps[0], `<span class="nr-behind">${caps[0]}</span>`);
    else if (isRun) text = `<span class="nr-ran">${b.text.trim()}</span>`;

    const call = callBeats.includes(i)
      ? (i === lastCall && callBeats.length > 1
          ? { who: "Unknown", sub: "Calling…", danger: true }
          : { who: "Unknown", sub: "Missed call" })
      : undefined;

    const tremor = b.behavior === "tremor" && !isBehind;
    return { text, kind, call, tremor };
  });

  return { eyebrow: scene.eyebrow, title: scene.title, dek: scene.dek, beats };
}

/* ── MAXIMALIST adapter — a medium, not a world. The text becomes a Basquiat-ish
 *    explosion where the AI decides what SCREAMS. Generative over ANY story:
 *    the scream is the emphasis word in the loudest beat (or the most charged
 *    word there), the refrain ghosted behind is the recurring motif (or the dek),
 *    and every other beat becomes a scattered fragment sized by its energy. ── */
export type MaxItem =
  | { kind: "frag"; text: string; role: "opener" | "loud" | "quiet" | "plain" | "resolve" }
  | { kind: "scream"; pre?: string; word: string; post?: string };
export type MaximalistInput = { eyebrow?: string; refrain?: string; items: MaxItem[] };

const AROUSAL = /\b(terrified|terror|afraid|panic|rage|furious|ecstatic|desperate|alive|free|lost|gone|never|always|everything|nothing|love|hate|scared|broke|broken|burning|screaming|wild|ran|leave|stay|quit|done|enough|forever|home|alone|wrong|dying|died|die|dead|death|unbearable|yes)\b/i;
function chargedWord(text: string): string {
  const ar = AROUSAL.exec(text);
  if (ar) return ar[0];
  const words = text.replace(/[^A-Za-z'\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w.toLowerCase()));
  words.sort((a, b) => b.length - a.length);
  return words[0] || text.trim().split(/\s+/)[0] || text.trim();
}

export function maximalistInput(scene: LivingScene): MaximalistInput {
  const beats = scene.beats;
  if (!beats.length) return { eyebrow: scene.eyebrow, items: [] };

  // THE SCREAM — the single most charged word in the whole story, scored across
  // every beat: an emphasis word the director already picked ranks highest, then
  // a high-arousal word; a beat that's loud boosts its candidates. Its beat
  // becomes the scream beat. Falls back to the loudest beat's charged word.
  const cands: { word: string; i: number; score: number }[] = [];
  beats.forEach((b, i) => {
    const boost = b.loud || b.behavior === "swell" ? 2 : 0;
    (b.spans || []).forEach((s) => { if (s.mark === "em") cands.push({ word: s.text.trim(), i, score: 5 + boost }); });
    const re = new RegExp(AROUSAL.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(b.text))) cands.push({ word: m[0], i, score: 3 + boost });
  });
  let loudIdx: number;
  if (cands.length) {
    cands.sort((a, b) => b.score - a.score || b.word.length - a.word.length);
    loudIdx = cands[0].i;
  } else {
    let best = 0, be = -1;
    beats.forEach((b, j) => { const e = energy(b.text); if (e > be) { be = e; best = j; } });
    loudIdx = best;
  }
  const forcedScream = cands.length ? cands[0].word : undefined;

  const motif = detectMotif(beats.map((b) => b.text).join(" "));
  const shortN = (s: string, n: number) => { const w = s.split(/\s+/); return w.length > n ? w.slice(0, n).join(" ") : s; };

  // energy ranking, so we can cap fragments to the most charged ones (restraint)
  const es = beats.map((b) => energy(b.text));

  const raw: (MaxItem & { i: number; e: number })[] = beats.map((b, i) => {
    if (i === loudIdx) {
      const em = (b.spans || []).find((s) => s.mark === "em");
      const word = (forcedScream ?? (em ? em.text : chargedWord(b.text))).trim();
      const low = b.text.toLowerCase();
      const at = low.indexOf(word.toLowerCase());
      let pre = at > 0 ? b.text.slice(0, at).trim().replace(/[—,:;]+$/, "").trim() : "";
      let post = at >= 0 ? b.text.slice(at + word.length).trim().replace(/^[—,:;.]+/, "").trim() : "";
      return { kind: "scream", pre: pre ? shortN(pre, 5) : undefined, word: word.replace(/[.!?,;:]+$/, "").toUpperCase(), post: post ? shortN(post, 6) : undefined, i, e: 99 };
    }
    let role: Extract<MaxItem, { kind: "frag" }>["role"] = "plain";
    if (i === 0) role = "opener";
    else if (i === beats.length - 1) role = "resolve";
    else if (b.loud || es[i] >= 1) role = "loud";
    else if (b.behavior === "hold" || b.text.trim().split(/\s+/).length <= 5) role = "quiet";
    return { kind: "frag", text: b.text.replace(/\s+/g, " ").trim(), role, i, e: es[i] };
  });

  // cap to ~8 items: always keep scream, opener, resolve; fill with the most charged
  let kept = raw;
  if (raw.length > 8) {
    const must = new Set(raw.filter((r) => r.kind === "scream" || r.e === 99 || (r.kind === "frag" && (r.role === "opener" || r.role === "resolve"))).map((r) => r.i));
    const rest = raw.filter((r) => !must.has(r.i)).sort((a, b) => b.e - a.e).slice(0, 8 - must.size).map((r) => r.i);
    const keep = new Set([...must, ...rest]);
    kept = raw.filter((r) => keep.has(r.i));
  }
  kept.sort((a, b) => a.i - b.i);
  const items: MaxItem[] = kept.map(({ i, e, ...item }) => item as MaxItem);

  // the ghosted background refrain — a SHORT phrase: the recurring motif, else
  // the scream's own trailing phrase ("…of wasting my life" → "wasting my life"),
  // else a trimmed dek. Nothing if there's no good short phrase.
  let refrain = motif && motif.length > 2 ? motif : undefined;
  if (!refrain) {
    const scr = items.find((it): it is Extract<MaxItem, { kind: "scream" }> => it.kind === "scream");
    const cand = (scr?.post || scene.dek || "").replace(/[.!?,;:]+$/, "").replace(/^(of|the|a|an|and|but|into|in|on|to)\s+/i, "");
    const w = cand.split(/\s+/).filter(Boolean);
    if (w.length >= 1 && w.length <= 5) refrain = w.join(" ");
  }
  return { eyebrow: scene.eyebrow, refrain, items };
}
