/**
 * THE BLOCK GRAMMAR
 *
 * One reading of what a story file is made of, shared by everything that
 * has an opinion about it: the studio (which round-trips a story through
 * an editor), the emitter in lib/annotate.ts, and scripts/check-stories.mjs.
 * Three regexes in three places was going to drift within a week.
 *
 * Deliberately NOT an MDX parse. A story file is blocks separated by blank
 * lines — the same split the reader feels as beats — and a block is either
 * something the studio can model or something it must not touch. Anything
 * carrying structure the editor has no shape for (a <Scene>, a heading, a
 * <Press>, a <Mark> inside a line) is preserved verbatim as a `raw` block,
 * so opening a hand-written story and saving it again cannot quietly
 * destroy it. That guarantee is the whole point of this file.
 *
 * Plain .mjs with JSDoc rather than .ts, because the check script runs on
 * bare node and the app runs through the bundler, and they must read the
 * same file or the guarantee is a fiction.
 *
 * @typedef {"speak"|"whisper"|"shout"|"thought"|"drift"|"echo"|"listen"|"ledger"} VoiceName
 *
 * @typedef {object} RawBlock
 * @property {"raw"} kind
 * @property {string} text  carried through exactly as written
 *
 * @typedef {object} HoldBlock
 * @property {"hold"} kind
 * @property {number} beats
 *
 * @typedef {object} BeatBlock
 * @property {"beat"} kind
 * @property {VoiceName} voice
 * @property {string} text
 * @property {boolean} bare  true when the source was a plain paragraph
 * @property {string} [body]
 * @property {string} [doodle]
 * @property {string} [side]
 * @property {string} [gesture]
 * @property {string} [becomes]
 * @property {string} [move]
 *
 * @typedef {object} MediaBlock
 * @property {"media"} kind
 * @property {string} src
 * @property {string} alt
 * @property {string} credit
 * @property {string} creditUrl
 * @property {string} link
 *
 * @typedef {RawBlock|HoldBlock|BeatBlock|MediaBlock} Block
 */

export const VOICE_TAGS = ["Speak", "Whisper", "Shout", "Thought", "Drift", "Echo", "Listen", "Ledger"];

/** @type {Record<string, string>} */
const TAG_OF = {
  speak: "Speak", whisper: "Whisper", shout: "Shout", ledger: "Ledger",
  thought: "Thought", drift: "Drift", echo: "Echo", listen: "Listen",
};

const BEAT_RE = new RegExp(`^<(${VOICE_TAGS.join("|")})\\b([^>]*)>([\\s\\S]*)</\\1>$`);
const HOLD_RE = /^<Hold\b([^>]*)\/>$/;

/** @param {string} attrs @param {string} name */
const strAttr = (attrs, name) => {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : undefined;
};

/** @param {string} attrs @param {string} name */
const numAttr = (attrs, name) => {
  const m = new RegExp(`\\b${name}=\\{\\s*(-?\\d+(?:\\.\\d+)?)\\s*\\}`).exec(attrs);
  return m ? Number(m[1]) : undefined;
};

/**
 * One block of source into one block of story.
 * @param {string} text
 * @returns {Block}
 */
function toBlock(text) {
  const hold = HOLD_RE.exec(text);
  if (hold) return { kind: "hold", beats: numAttr(hold[1], "beats") ?? 2 };

  const m = BEAT_RE.exec(text);
  if (m) {
    const [, tag, attrs, inner] = m;
    // A line with something living inside it — a <Mark>, a nested voice —
    // or an attribute that is an expression rather than a string, is more
    // than the editor can hold. Keep it exactly as the writer left it.
    if (inner.includes("<") || attrs.includes("{")) return { kind: "raw", text };
    return {
      kind: "beat",
      voice: /** @type {VoiceName} */ (tag.toLowerCase()),
      text: inner.trim(),
      bare: false,
      body: strAttr(attrs, "body"),
      doodle: strAttr(attrs, "doodle"),
      side: strAttr(attrs, "side"),
      gesture: strAttr(attrs, "gesture"),
      becomes: strAttr(attrs, "becomes"),
      move: strAttr(attrs, "move"),
    };
  }

  // A bare paragraph is already a SPEAK beat — see mdx-components.tsx. That
  // mapping is load-bearing for the animation ratio, so it holds here too.
  if (!text.includes("<") && !/^#{1,6}\s/.test(text) && text !== "---") {
    return { kind: "beat", voice: "speak", text, bare: true };
  }

  return { kind: "raw", text };
}

/**
 * @param {string} body  story source with any frontmatter already removed
 * @returns {Block[]}
 */
export function parseBlocks(body) {
  return String(body)
    .replace(/\r\n/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map(toBlock);
}

/**
 * @param {Block} b
 * @returns {string}
 */
export function serializeBlock(b) {
  if (b.kind === "raw") return b.text;
  if (b.kind === "hold") return `<Hold beats={${b.beats}} />`;
  if (b.kind === "media") return ""; // media lives in the blocks JSON, not the prose source

  const attrs = [
    b.body ? `body="${b.body}"` : "",
    b.doodle ? `doodle="${b.doodle}"` : "",
    b.doodle && b.side ? `side="${b.side}"` : "",
    b.becomes ? `becomes="${b.becomes}"` : "",
    b.gesture ? `gesture="${b.gesture}"` : "",
    b.move ? `move="${b.move}"` : "",
  ].filter(Boolean).join(" ");

  // a plain speak line goes back out as prose, so the file keeps reading
  // as writing rather than as markup
  if (b.voice === "speak" && !attrs && b.bare) return b.text;

  const Tag = TAG_OF[b.voice] ?? "Speak";
  return `<${Tag}${attrs ? " " + attrs : ""}>${b.text}</${Tag}>`;
}

/** @param {Block[]} blocks */
export const serializeBlocks = (blocks) => blocks.map(serializeBlock).join("\n\n") + "\n";

/**
 * Writing frontmatter is not the same job as reading it, and only one of
 * them needs a YAML library.
 *
 * Reading has to cope with whatever a person typed by hand, so lib/story-file
 * .mjs uses gray-matter — on the server, where node:fs already lives. Writing
 * only ever emits these four known scalars, so it can live here, in a module
 * the studio is free to import into the browser. Every value goes out as a
 * double-quoted string, which is both valid YAML and immune to a fragment
 * that happens to contain a colon.
 *
 * @param {{place:string,date:string,fragment:string,accent:string,veil?:boolean}} meta
 * @param {Block[]} blocks
 * @returns {string}
 */
export function serializeStory(meta, blocks) {
  const line = (k, v) => `${k}: ${JSON.stringify(String(v))}`;
  const head = [
    line("place", meta.place),
    line("date", meta.date),
    line("fragment", meta.fragment),
    line("accent", meta.accent),
    ...(meta.veil === false ? ["veil: false"] : []),
  ];
  return `---\n${head.join("\n")}\n---\n\n${serializeBlocks(blocks)}`;
}

/* ── the quality bar, mechanical half ──────────────────────────────────
   Counts blocks, not sentences, so treat the numbers as a reading of the
   shape rather than a measurement. Arguing with it is the point.         */

const VOICE_TAG_RE = new RegExp(`<(${VOICE_TAGS.join("|")})\\b`);

/**
 * Prose carrying inline markup — `It is the same as being <Mark ring>tired</Mark>.`
 *
 * toBlock keeps this as `raw` on purpose: the studio must not claim to
 * understand a line it could damage. But it IS a line of writing, and the
 * quality bar has to count it as one. Missing that meant such a line left
 * the denominator entirely, so demoting it to plain made the plain share
 * go DOWN — the ratio guard was quietly lying about the shape of the piece.
 */
const isProseRaw = (b) =>
  b.kind === "raw" && !b.text.startsWith("<") && !/^#{1,6}\s/.test(b.text) && b.text !== "---";

/** a block that reads as a line of writing, rather than structure */
const isLine = (b) => b.kind === "beat" || isProseRaw(b) || (b.kind === "raw" && VOICE_TAG_RE.test(b.text));
const isPause = (b) => b.kind === "hold" || (b.kind === "raw" && b.text === "---");

/**
 * @typedef {object} Analysis
 * @property {number} total
 * @property {number} speakShare
 * @property {number} voicedShare
 * @property {number} interactions
 * @property {number} holds
 * @property {number} longestRunWithoutHold
 * @property {string[]} voicesUsed
 * @property {string[]} notes
 *
 * @param {Block[]} blocks
 * @returns {Analysis}
 */
export function analyse(blocks) {
  const voicesUsed = new Set();
  let total = 0, speak = 0, interactions = 0, holds = 0, run = 0, longest = 0;

  for (const b of blocks) {
    if (isPause(b)) { longest = Math.max(longest, run); run = 0; holds++; continue; }

    if (b.kind === "beat") {
      total++; run++;
      voicesUsed.add(b.voice);
      if (b.voice === "speak") speak++;
      if (b.doodle) interactions++;
      continue;
    }

    if (b.kind === "raw") {
      const tags = [...b.text.matchAll(new RegExp(`<(${VOICE_TAGS.join("|")})\\b`, "g"))].map((m) => m[1]);
      if (tags.length) {
        for (const t of tags) { voicesUsed.add(t.toLowerCase()); if (t === "Speak") speak++; }
        total += tags.length;
        run += tags.length;
      } else if (isProseRaw(b)) {
        // mdx-components.tsx will render this exactly as SPEAK, so count it
        total++; run++; speak++; voicesUsed.add("speak");
      }
      if (/doodle="|<Press\b|<Drag\b/.test(b.text)) interactions++;
    }
  }
  longest = Math.max(longest, run);

  const n = total || 1;
  const speakShare = speak / n;
  const notes = [];
  if (speakShare < 0.6)
    notes.push(`${Math.round((1 - speakShare) * 100)}% of the piece is doing something. Let some lines just be sentences.`);
  if (holds === 0)
    notes.push("No pauses. Silence is an element — put a <Hold /> where the reader should stop.");
  if (longest > 9)
    notes.push(`${longest} beats run without a pause. That is a paragraph wearing a costume.`);
  if (interactions === 0)
    notes.push("The margin is empty. The doodle is a second narrator — give it one line to answer.");
  if (interactions / n > 0.35)
    notes.push("The margin is crowded. A doodle on every other line stops being a surprise.");
  if (!voicesUsed.has("shout") && !voicesUsed.has("listen"))
    notes.push("Nothing lands. No shout, no listen — is there a moment the piece turns?");
  if (notes.length === 0)
    notes.push("Pacing looks right. Read it out loud before you believe me.");

  return {
    total, speakShare, voicedShare: 1 - speakShare,
    interactions, holds, longestRunWithoutHold: longest,
    voicesUsed: [...voicesUsed], notes,
  };
}
