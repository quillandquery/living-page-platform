"use server";

import { writeFile } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { isSlug, listStories, loadStory, storyExists, storyPath } from "@/lib/stories";
import { serializeStory } from "@/lib/story-blocks.mjs";
import type { Block } from "@/lib/story-blocks.mjs";
import type { StoryMeta } from "@/lib/vocabulary";

/**
 * THE STUDIO'S HANDS.
 *
 * Writing a story is a local authoring act, not a hosted CMS: this is the
 * one place in the app that puts bytes on disk, and it refuses to exist in
 * production. The guard is here rather than on the button because a hidden
 * button is not a guard — a server action is a public endpoint, and this one
 * takes a filename.
 */

export type StoryDraft = {
  slug: string;
  place: string;
  date: string;
  fragment: string;
  accent: string;
  blocks: Block[];
};

export type SaveResult =
  | { ok: true; slug: string; created: boolean }
  | { ok: false; reason: "disabled" | "slug" | "meta" | "exists" | "write"; message: string };

const authoringEnabled = () => process.env.NODE_ENV !== "production";

export async function saveStory(draft: StoryDraft, overwrite = false): Promise<SaveResult> {
  if (!authoringEnabled()) {
    return { ok: false, reason: "disabled", message: "The studio does not write in production." };
  }

  // the slug is derived from a free-text field, which makes it user input,
  // which makes it a path
  if (!isSlug(draft.slug)) {
    return { ok: false, reason: "slug", message: `"${draft.slug}" is not a usable filename. Lowercase letters, numbers and hyphens.` };
  }

  const missing = (["place", "date", "fragment", "accent"] as const).filter((k) => !draft[k]?.trim());
  if (missing.length) {
    return { ok: false, reason: "meta", message: `Still missing: ${missing.join(", ")}.` };
  }

  const exists = await storyExists(draft.slug);
  if (exists && !overwrite) {
    // two pieces from the same place produce the same slug, and silently
    // flattening an edited story is the one unrecoverable thing here
    return { ok: false, reason: "exists", message: `${draft.slug}.mdx already exists.` };
  }

  try {
    const source = serializeStory(
      { place: draft.place, date: draft.date, fragment: draft.fragment, accent: draft.accent },
      draft.blocks,
    );
    await writeFile(storyPath(draft.slug), source, "utf8");
  } catch (e) {
    return { ok: false, reason: "write", message: e instanceof Error ? e.message : "Could not write the file." };
  }

  revalidatePath("/");
  revalidatePath(`/stories/${draft.slug}`);
  return { ok: true, slug: draft.slug, created: !exists };
}

export type OpenedStory = { meta: StoryMeta; blocks: Block[] };

/** Read a story back out of the content directory, blocks and all. */
export async function openStory(slug: string): Promise<OpenedStory | null> {
  if (!isSlug(slug)) return null;
  const story = await loadStory(slug);
  return story ? { meta: story.meta, blocks: story.blocks } : null;
}

export async function studioIndex(): Promise<{ stories: StoryMeta[]; canWrite: boolean }> {
  return { stories: await listStories(), canWrite: authoringEnabled() };
}
