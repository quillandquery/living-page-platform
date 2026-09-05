import {
  COSTLY_VOICES, DEFAULT_BODY, type BeatSpec, type Body, type Gesture, type Voice,
} from "./vocabulary";

/* ══════════════════════════════════════════════════════════════════════
   THE FIRST PASS
   A machine reading of a draft. It is wrong often enough that you have
   to argue with it, which is the point — arguing with a first pass is
   faster than facing a blank page, and the final call stays yours.
   ══════════════════════════════════════════════════════════════════════ */

const LEX = {
  loud: /\b(shout|shouted|scream|screamed|roar|crash|bang|horn|siren|thunder|suddenly|slammed|exploded|enormous|huge|massive)\b/i,
  quiet: /\b(silence|silent|quiet|still|hush|slow|breath|asleep|sleeping|whisper|nobody|nothing|no one|alone|empty|waiting|soft)\b/i,
  water: /\b(sea|ocean|water|wave|waves|rain|monsoon|river|swim|swam|salt|tide|underwater|dive|dived|current|shore)\b/i,
  dream: /\b(dream|dreamt|remember|memory|forget|forgot|somewhere|somehow|floating|blur|blurred|hours|time|felt like)\b/i,
  small: /\b(hand|coin|thread|crumb|pocket|seed|tiny|little|small|finger|shell|grain|stone|rupee|rupees)\b/i,
  doubt: /\b(maybe|perhaps|should|shouldn't|wonder|wondered|suppose|thought|thinking|why|what if|didn't know|no idea)\b/i,
  weight: /\b(never|always|everything|nothing|forever|alone|home|myself|afraid|alive|free|lost|found)\b/i,
  motion: /\b(bus|train|road|drove|driving|walked|walking|ran|left|leaves|went|going|arrive|arrived|journey|ride|flight|flew)\b/i,
};

const hits = (re: RegExp, s: string) => (s.match(new RegExp(re.source, "gi")) ?? []).length;

const DOODLE_HINTS: [RegExp, string, Gesture][] = [
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

export type Segment = { text: string } | { pause: true };

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
    parts.forEach((text) => out.push({ text }));
  });
  while (out.length && "pause" in out[out.length - 1]) out.pop();
  return out;
}

type Ctx = { recent: Voice[]; opensScene: boolean; isLast: boolean; prevText: string };

function readVoice(text: string, ctx: Ctx): { voice: Voice; margin: number } {
  const t = text.trim();
  const n = t.split(/\s+/).length;
  const caps = n > 1 && t === t.toUpperCase() && /[A-Z]/.test(t);

  const s: Record<Voice, number> = {
    speak: 2.4,
    shout: hits(LEX.loud, t) * 2.6 + (/!\s*$/.test(t) ? 3.6 : 0) + (caps ? 6 : 0) + (n <= 8 ? 0.6 : -1.4),
    thought: hits(LEX.doubt, t) * 2.2 + (/\?\s*$/.test(t) ? 3.4 : 0) + (/^[a-z]/.test(t) ? 0.8 : 0) + (n <= 14 ? 0.5 : -1),
    whisper: hits(LEX.quiet, t) * 1.9 + hits(LEX.small, t) * 1.1 + (n <= 12 ? 1.0 : -1.6),
    drift: hits(LEX.water, t) * 1.5 + hits(LEX.dream, t) * 1.5 + (t.split(".").length > 3 ? 1.4 : 0) - (n < 6 ? 1.2 : 0),
    listen: (ctx.isLast ? 3.2 : 0) + hits(LEX.weight, t) * 1.2 + (n <= 9 ? 0.9 : -1.8),
    echo: t.toLowerCase() === ctx.prevText.toLowerCase() && t.length > 0 ? 7 : -6,
  };

  // rhythm: a voice fades from the ear slowly, and costly voices need room
  ctx.recent.forEach((v, d) => {
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
};

export function annotate(raw: string, opts: AnnotateOptions = {}): BeatSpec[] {
  const { splitSentences = true, doodleDensity = 5, voiceBudget = 0.3 } = opts;
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
    if ("pause" in seg) { beats.push({ text: "", voice: "speak", hold: true }); opensScene = true; return; }
    const isLast = idx === segs.length - 1;
    const { voice, margin } = readVoice(seg.text, { recent, opensScene, isLast, prevText });
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

    beats.push({ text: seg.text, voice, body, gesture, doodle, side });
    margins.push(voice === "speak" ? Infinity : margin);
    recent.unshift(voice);
    if (recent.length > 5) recent.pop();
    prevText = seg.text;
    opensScene = false;
    i++;
  });

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
  const rank: Record<Voice, number> = { echo: 5, shout: 4, listen: 3, thought: 2, drift: 1, whisper: 1, speak: 0 };
  const sorted = [...voiced].sort((a, b) => rank[b.voice] - rank[a.voice]);
  const keep = new Set(sorted.slice(0, allowed));
  return beats.map((b) =>
    b.hold || b.voice === "speak" || keep.has(b)
      ? b
      : { ...b, voice: "speak" as Voice, body: DEFAULT_BODY.speak },
  );
}

/* ── the quality bar (§22) ───────────────────────────────────────────── */

export type Report = {
  total: number;
  speakShare: number;
  voicedShare: number;
  interactions: number;
  holds: number;
  longestRunWithoutHold: number;
  voicesUsed: Voice[];
  notes: string[];
};

export function report(beats: BeatSpec[]): Report {
  const words = beats.filter((b) => !b.hold);
  const speak = words.filter((b) => b.voice === "speak").length;
  const holds = beats.filter((b) => b.hold).length;
  const interactions = beats.filter((b) => b.doodle).length;
  const voicesUsed = Array.from(new Set(words.map((b) => b.voice)));

  let run = 0, longest = 0;
  beats.forEach((b) => { if (b.hold) { longest = Math.max(longest, run); run = 0; } else run++; });
  longest = Math.max(longest, run);

  const total = words.length || 1;
  const speakShare = speak / total;
  const notes: string[] = [];
  if (speakShare < 0.6) notes.push("More than 40% of the piece is doing something. Let some lines just be sentences.");
  if (holds === 0) notes.push("No pauses. Silence is an element — put a blank line where the reader should stop.");
  if (longest > 9) notes.push(`${longest} beats run without a pause. That is a paragraph wearing a costume.`);
  if (interactions === 0) notes.push("The margin is empty. The doodle is a second narrator — give it one line to answer.");
  if (interactions / total > 0.35) notes.push("The margin is crowded. A doodle on every other line stops being a surprise.");
  if (!voicesUsed.includes("shout") && !voicesUsed.includes("listen")) notes.push("Nothing lands. No shout, no listen — is there a moment the piece turns?");
  if (notes.length === 0) notes.push("Pacing looks right. Read it out loud before you believe me.");

  return { total: words.length, speakShare, voicedShare: 1 - speakShare, interactions, holds, longestRunWithoutHold: longest, voicesUsed, notes };
}

/* ── emit ─────────────────────────────────────────────────────────────── */

const CAP: Record<Voice, string> = {
  speak: "Speak", whisper: "Whisper", shout: "Shout",
  thought: "Thought", drift: "Drift", echo: "Echo", listen: "Listen",
};

export function toMDX(meta: { slug: string; place: string; date: string; fragment: string; accent: string }, beats: BeatSpec[]): string {
  const head =
    `export const meta = {\n` +
    `  slug: ${JSON.stringify(meta.slug)},\n` +
    `  place: ${JSON.stringify(meta.place)},\n` +
    `  date: ${JSON.stringify(meta.date)},\n` +
    `  fragment: ${JSON.stringify(meta.fragment)},\n` +
    `  accent: ${JSON.stringify(meta.accent)},\n};\n\n<Scene>\n\n`;

  const body = beats
    .map((b) => {
      if (b.hold) return `<Hold beats={2} />\n`;
      if (b.voice === "speak" && !b.doodle && (!b.body || b.body === "normal")) return `${b.text}\n`;
      const attrs = [
        b.body && b.body !== "normal" && b.body !== DEFAULT_BODY[b.voice] ? `body="${b.body}"` : "",
        b.doodle ? `doodle="${b.doodle}"` : "",
        b.side && b.doodle ? `side="${b.side}"` : "",
        b.gesture && b.doodle ? `gesture="${b.gesture}"` : "",
      ].filter(Boolean).join(" ");
      return `<${CAP[b.voice]}${attrs ? " " + attrs : ""}>${b.text}</${CAP[b.voice]}>\n`;
    })
    .join("\n");

  return head + body + "\n</Scene>\n";
}
