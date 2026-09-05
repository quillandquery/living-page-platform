import matter from "gray-matter";
import { parseBlocks } from "./story-blocks.mjs";

/**
 * A STORY FILE = frontmatter + blocks.
 *
 * The metadata is data, not code. It used to be `export const meta = {…}`,
 * which meant anything wanting to read it had to either execute the file or
 * guess at a JavaScript object literal with a regex. Now the filesystem owns
 * it and the compiled MDX never exports it at all — remark-frontmatter just
 * takes the block out of the document so it does not render. (Without that
 * plugin the `---` fence would come through as an <hr>, which
 * mdx-components.tsx maps to a two-beat silence. A story that opened on a
 * pause it never asked for.)
 *
 * The slug is NOT in the frontmatter. The filename is the slug — one source
 * of truth, and no way for the two to disagree.
 *
 * @typedef {import("./story-blocks.mjs").Block} Block
 *
 * @typedef {object} FileMeta
 * @property {string} place
 * @property {string} date
 * @property {string} fragment
 * @property {string} accent
 * @property {boolean} [veil]
 */

export const REQUIRED_META = ["place", "date", "fragment", "accent"];

/**
 * @param {string} source
 * @returns {{ meta: Record<string, unknown>, blocks: Block[], body: string }}
 */
export function parseStory(source) {
  const { data, content } = matter(String(source));
  return { meta: data ?? {}, blocks: parseBlocks(content), body: content };
}

/**
 * @param {Record<string, unknown>} meta
 * @returns {string[]} the fields that are missing or empty
 */
export function missingMeta(meta) {
  return REQUIRED_META.filter((k) => {
    const v = meta?.[k];
    return typeof v !== "string" || v.trim() === "";
  });
}

/**
 * Writing lives in story-blocks.mjs so the studio can reach it from the
 * browser without dragging gray-matter (and node:fs behind it) into the
 * client bundle. Re-exported here so the two halves of a story file still
 * read as one idea.
 */
export { serializeStory } from "./story-blocks.mjs";

/**
 * `DD.MM.YYYY` (what the stories use) or `YYYY-MM-DD`, as one sortable
 * number. The archive is ordered newest first and the displayed format does
 * not sort lexically, which would have looked like a bug the moment there
 * was a second story.
 *
 * @param {unknown} date
 * @returns {number}
 */
export function dateKey(date) {
  const s = typeof date === "string" ? date.trim() : "";
  const dmy = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (dmy) return Number(dmy[3] + dmy[2] + dmy[1]);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return Number(iso[1] + iso[2] + iso[3]);
  return 0;
}
