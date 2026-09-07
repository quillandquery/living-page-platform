import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoryView } from "@/components/living/StoryView";
import { publishedStory } from "@/lib/db";

const clean = (h: string) => decodeURIComponent(h).replace(/^@/, "").toLowerCase();

export async function generateMetadata(
  { params }: { params: Promise<{ handle: string; slug: string }> },
): Promise<Metadata> {
  const { handle, slug } = await params;
  const story = await publishedStory(clean(handle), slug);
  if (!story) return {};
  return {
    title: `${story.place} — @${story.author.handle}`,
    description: story.fragment,
  };
}

/** `/@handle/slug` — the reader. Renders the story's blocks at request time. */
export default async function StoryReaderPage(
  { params }: { params: Promise<{ handle: string; slug: string }> },
) {
  const { handle, slug } = await params;
  const story = await publishedStory(clean(handle), slug);
  if (!story) notFound();

  return (
    <StoryView
      place={story.place}
      date={story.date}
      fragment={story.fragment}
      accent={story.accent}
      backdrop={story.backdrop}
      veil={story.veil}
      blocks={story.blocks}
      author={{ handle: story.author.handle, display_name: story.author.display_name }}
      seed={story.id}
    />
  );
}
