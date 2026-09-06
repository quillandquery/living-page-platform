import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { dateKey, missingMeta, parseStory } from "./story-file.mjs";
import type { StoryMeta } from "./vocabulary";
import type { Block } from "./story-blocks.mjs";

/**
 * STORY DISCOVERY.
 *
 * The content directory is the registry. A piece appears on the site because
 * it exists, not because someone remembered to add a line to an array.
 *
 * SERVER ONLY — this reaches for node:fs. Importing it from a client
 * component poisons the browser bundle. The studio talks to it through the
 * server actions in app/studio/actions.ts and never imports it directly.
 *
 * The set of stories is still fixed at build time, which is the honest
 * boundary: app/stories/[slug]/page.tsx resolves the compiled component
 * through a template-literal import, and the bundler decides what that can
 * possibly mean while it is building. Dropping an .mdx into a running
 * production server does nothing until the next build. What you no longer
 * have to do is edit TypeScript.
 */

export const STORIES_DIR = path.join(process.cwd(), "content", "stories");

/** A slug is a filename, so it has to be one before it is anything else. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isSlug = (s: unknown): s is string => typeof s === "string" && SLUG_RE.test(s);

/** Resolve a slug to its file, refusing anything that would leave the directory. */
export function storyPath(slug: string): string {
  if (!isSlug(slug)) throw new Error(`not a story slug: ${JSON.stringify(slug)}`);
  const file = path.resolve(STORIES_DIR, `${slug}.mdx`);
  if (!file.startsWith(path.resolve(STORIES_DIR) + path.sep)) {
    throw new Error(`story path escapes the content directory: ${slug}`);
  }
  return file;
}

export async function storySlugs(): Promise<string[]> {
  let names: string[];
  try {
    names = await readdir(STORIES_DIR);
  } catch {
    return [];
  }
  return names
    .filter((n) => n.endsWith(".mdx"))
    .map((n) => n.slice(0, -".mdx".length))
    .filter(isSlug)
    .sort();
}

function toMeta(slug: string, raw: Record<string, unknown>): StoryMeta {
  return {
    slug,
    place: String(raw.place),
    date: String(raw.date),
    fragment: String(raw.fragment),
    accent: String(raw.accent),
    ...(raw.veil === false ? { veil: false as const } : {}),
    ...(typeof raw.backdrop === "string" ? { backdrop: raw.backdrop } : {}),
  };
}

export type LoadedStory = { meta: StoryMeta; blocks: Block[]; source: string };

/** Read one story off disk. Returns null when there is no such file. */
export async function loadStory(slug: string): Promise<LoadedStory | null> {
  let source: string;
  try {
    source = await readFile(storyPath(slug), "utf8");
  } catch {
    return null;
  }
  const { meta, blocks } = parseStory(source);
  const missing = missingMeta(meta);
  if (missing.length) {
    console.warn(`[stories] ${slug}.mdx is missing frontmatter: ${missing.join(", ")} — skipped`);
    return null;
  }
  return { meta: toMeta(slug, meta), blocks, source };
}

/**
 * Every readable story, newest first. A file with broken frontmatter is
 * skipped with a warning rather than taken down the whole build — a
 * half-saved draft should not stop the dev server rendering the site.
 * `npm run check` is where they get named loudly.
 */
export async function listStories(): Promise<StoryMeta[]> {
  const slugs = await storySlugs();
  const loaded = await Promise.all(slugs.map((s) => loadStory(s)));
  return loaded
    .filter((s): s is LoadedStory => s !== null)
    .map((s) => s.meta)
    .sort((a, b) => dateKey(b.date) - dateKey(a.date) || a.slug.localeCompare(b.slug));
}

export async function getStoryMeta(slug: string): Promise<StoryMeta | null> {
  if (!isSlug(slug)) return null;
  return (await loadStory(slug))?.meta ?? null;
}

export async function storyExists(slug: string): Promise<boolean> {
  return (await storySlugs()).includes(slug);
}
