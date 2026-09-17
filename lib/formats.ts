/**
 * FORMAT — the medium a story is read in.
 *
 * A format is not a colour or a skin: it is a whole renderer with its own
 * layout, behaviour and pacing (a letter, a poster, a scrapbook). The story
 * data (place, fragment, blocks) is format-agnostic, so the SAME story can be
 * re-read in another format — that "Read as —" switch is a growth lever, so
 * format is a URL-addressable view from day one.
 *
 * Precedence for what a reader lands on:
 *   reader's choice (?as=) → author default → engine-inferred → "standard".
 */
import type { Block } from "@/lib/story-blocks.mjs";

export type FormatKey = "standard" | "scrapbook";

export type FormatDef = {
  key: FormatKey;
  label: string;
  /** the verb on the switcher, e.g. "Read" / "Scrapbook" */
  verb: string;
  blurb: string;
};

export const FORMATS: Record<FormatKey, FormatDef> = {
  standard:  { key: "standard",  label: "Standard",  verb: "Read",      blurb: "the quiet reader" },
  scrapbook: { key: "scrapbook", label: "Scrapbook", verb: "Scrapbook", blurb: "torn-paper cards, pinned to a board" },
};

export const FORMAT_KEYS = Object.keys(FORMATS) as FormatKey[];

export const isFormatKey = (x: unknown): x is FormatKey =>
  typeof x === "string" && (FORMAT_KEYS as string[]).includes(x);

/** how many real text beats a story has — cheap signal for what fits */
function textBeats(blocks: Block[]): number {
  return blocks.filter((b) => b.kind === "beat" || (b.kind === "raw" && !b.text.trim().startsWith("<"))).length;
}

/** the formats worth offering for THIS story — never a format that would
 *  render thin. Standard always fits; scrapbook wants a few beats to scatter. */
export function fittingFormats(blocks: Block[]): FormatKey[] {
  const out: FormatKey[] = ["standard"];
  if (textBeats(blocks) >= 3) out.push("scrapbook");
  return out;
}

/** the engine's default pick, from the story and its art direction */
export function inferFormat(blocks: Block[], look?: string): FormatKey {
  const fit = fittingFormats(blocks);
  if (fit.includes("scrapbook") && (look === "maximal" || look === "postcard")) return "scrapbook";
  return "standard";
}

/** resolve the format to render, honouring the precedence chain */
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
