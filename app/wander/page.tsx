import { publishedFeed } from "@/lib/db";
import { buildField } from "@/lib/discover";
import { SAMPLE_STORIES } from "@/lib/wander-samples";
import { WanderField } from "@/components/wander/WanderField";

export const metadata = {
  title: "Wander — The Living Page",
  description: "You don't have to know what you're looking for.",
};

/**
 * `/wander` — the reader's own surface. Home explains the medium; Wander
 * helps you find something to read. Every Story Seed here is derived from
 * the story's own blocks, world and words (lib/discover.ts) — there is no
 * separate tagging system, so nothing here is invented.
 */
export default async function WanderPage() {
  const published = await publishedFeed(150);
  // Real stories lead; seed stories fill the field so Wander is a gallery,
  // not a ghost town, until enough people have published. Both flow through
  // the same fragmentation — one story can cast several objects.
  const stories = [...published, ...SAMPLE_STORIES];
  const seeds = buildField(stories);
  return <WanderField seeds={seeds} />;
}
