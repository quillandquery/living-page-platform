import { ImageResponse } from "next/og";
import { publishedStory } from "@/lib/db";
import { deriveStoryContext } from "@/lib/story-context";
import { StoryOgFrame, FallbackOgFrame, OG_SIZE, seedFromId } from "@/lib/og-render";

/**
 * `/@handle/slug`'s OG image (Module 4, PART 4) — a static frame built
 * from the story's own Story Context + signature, not a generic template
 * card. Node runtime: this reads the database through the same server
 * Supabase client every other page uses.
 */
export const runtime = "nodejs";
export const alt = "A story on Living Page";
export const size = OG_SIZE;
export const contentType = "image/png";

const clean = (h: string) => decodeURIComponent(h).replace(/^@/, "").toLowerCase();

export default async function Image({ params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const story = await publishedStory(clean(handle), slug);
  if (!story) return new ImageResponse(<FallbackOgFrame />, size);

  const context = deriveStoryContext({
    fragment: story.fragment,
    place: story.place,
    date: story.date,
    source: story.source,
    blocks: story.blocks,
    backdrop: story.backdrop,
    artDirection: story.art_direction,
  });

  return new ImageResponse(
    (
      <StoryOgFrame
        kicker={story.place}
        headline={context.title}
        environmentKey={context.environment.key}
        doodleName={story.art_direction?.signature?.doodle ?? null}
        seed={seedFromId(story.id)}
      />
    ),
    size,
  );
}
