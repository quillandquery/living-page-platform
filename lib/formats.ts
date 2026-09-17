/**
 * FORMAT — the medium a story is read in. A format is a whole renderer with
 * its own stage and behaviour, over format-agnostic block data, so the SAME
 * story can be re-read in another format. That "Read as —" switch is a growth
 * lever, so format is a URL-addressable view (?as=).
 *
 * Precedence: reader's ?as= → author default → engine-inferred → "standard".
 */
import type { Block } from "@/lib/story-blocks.mjs";

export type FormatKey =
  | "standard" | "scrapbook" | "letter" | "poster" | "ticket"
  | "notebook" | "gallery" | "film" | "ransom" | "marquee" | "postcard";

export type FormatDef = { key: FormatKey; label: string; verb: string; blurb: string; min: number };

export const FORMATS: Record<FormatKey, FormatDef> = {
  standard:  { key: "standard",  label: "Standard",      verb: "Read",       blurb: "the quiet reader",                    min: 0 },
  scrapbook: { key: "scrapbook", label: "Scrapbook",     verb: "Scrapbook",  blurb: "tilted cards pinned to a board",      min: 3 },
  letter:    { key: "letter",    label: "Letter",        verb: "Letter",     blurb: "read like correspondence",            min: 2 },
  poster:    { key: "poster",    label: "Poster",        verb: "Poster",     blurb: "one enormous line, loud panels",      min: 2 },
  ticket:    { key: "ticket",    label: "Boarding pass", verb: "Ticket",     blurb: "each beat a perforated stub",         min: 3 },
  notebook:  { key: "notebook",  label: "Field notes",   verb: "Field notes",blurb: "graph paper, numbered entries",       min: 3 },
  gallery:   { key: "gallery",   label: "Gallery",       verb: "Gallery",    blurb: "captioned plates on a wall",          min: 3 },
  film:      { key: "film",      label: "Film",          verb: "Film",       blurb: "letterboxed, subtitle lines",         min: 2 },
  ransom:    { key: "ransom",    label: "Cut-up",        verb: "Cut-up",     blurb: "ransom-note, off the grid",           min: 2 },
  marquee:   { key: "marquee",   label: "Marquee",       verb: "Marquee",    blurb: "a lit sign at night",                 min: 2 },
  postcard:  { key: "postcard",  label: "Postcard",      verb: "Postcard",   blurb: "a stamped card, written across",      min: 2 },
};

export const FORMAT_KEYS = Object.keys(FORMATS) as FormatKey[];

export const isFormatKey = (x: unknown): x is FormatKey =>
  typeof x === "string" && (FORMAT_KEYS as string[]).includes(x);

/** how many real text beats a story has — cheap signal for what fits */
function textBeats(blocks: Block[]): number {
  return blocks.filter((b) => b.kind === "beat" || (b.kind === "raw" && !b.text.trim().startsWith("<"))).length;
}

/** the formats worth offering for THIS story — never one that renders thin */
export function fittingFormats(blocks: Block[]): FormatKey[] {
  const n = textBeats(blocks);
  return FORMAT_KEYS.filter((k) => n >= FORMATS[k].min);
}

/** the engine's default pick. Kept calm on purpose: the standard reader is
 *  the default a reader lands on; the switcher (or the writer) chooses more. */
export function inferFormat(_blocks: Block[], _look?: string): FormatKey {
  return "standard";
}

export function resolveFormat(
  requested: string | undefined,
  blocks: Block[],
  opts: { authorDefault?: string; look?: string } = {},
): FormatKey {
  const fit = fittingFormats(blocks);
  if (isFormatKey(requested) && fit.includes(requested)) return requested;
  if (isFormatKey(opts.authorDefault) && fit.includes(opts.authorDefault)) return opts.authorDefault;
  return inferFormat(blocks, opts.look);
}
