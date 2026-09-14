import { publishedFeed } from "@/lib/db";
import { buildSeeds } from "@/lib/discover";
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
  const stories = await publishedFeed(150);
  const seeds = buildSeeds(stories);
  return <WanderField seeds={seeds} />;
}
