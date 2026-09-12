import { publishedFeed } from "@/lib/db";
import { estimateReadTime } from "@/lib/read-time";
import { WanderCanvas, type WanderSeed } from "@/components/wander/WanderCanvas";

export const metadata = {
  title: "Wander — The Living Page",
  description: "You don't have to know what you're looking for.",
};

/**
 * `/wander` — the reader's own surface. Home explains the medium; Wander
 * helps you find something to read. See PART 2 of the reader-experience
 * brief this was built from.
 */
export default async function WanderPage() {
  const stories = await publishedFeed(200);

  const seeds: WanderSeed[] = stories.map((s) => {
    const rt = estimateReadTime(s.blocks);
    return {
      id: s.id,
      slug: s.slug,
      handle: s.author.handle,
      authorName: s.author.display_name || `@${s.author.handle}`,
      place: s.place,
      fragment: s.fragment,
      accent: /^#[0-9a-fA-F]{3,8}$/.test(s.accent) ? s.accent : "#2D6BF0",
      readSeconds: rt.seconds,
      readLabel: rt.label,
    };
  });

  return <WanderCanvas seeds={seeds} />;
}
