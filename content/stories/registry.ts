import type { StoryMeta } from "@/lib/vocabulary";
import Gokarna, { meta as gokarna } from "./gokarna.mdx";

type Entry = { meta: StoryMeta; Story: React.ComponentType };

/**
 * Explicit, not globbed. There will never be hundreds of these, and an
 * import you can read beats a build-time filesystem trick.
 */
export const STORIES: Entry[] = [{ meta: gokarna, Story: Gokarna }];

export const bySlug = (slug: string) => STORIES.find((s) => s.meta.slug === slug);
