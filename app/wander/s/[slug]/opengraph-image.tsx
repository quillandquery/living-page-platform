import { ImageResponse } from "next/og";
import { sampleBySlug } from "@/lib/wander-samples";
import { deriveStoryContext } from "@/lib/story-context";
import { StoryOgFrame, FallbackOgFrame, OG_SIZE, seedFromId } from "@/lib/og-render";

/**
 * `/wander/s/[slug]` — seed stories get a real share image too (they're a
 * genuine Living Page reading experience), but see `page.tsx` in this same
 * folder for why they're `noindex`: a good OG card and being excluded from
 * search are not in tension.
 */
export const runtime = "nodejs";
export const alt = "A story on Living Page";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = sampleBySlug(slug);
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
