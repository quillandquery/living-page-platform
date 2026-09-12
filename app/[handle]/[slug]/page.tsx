import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoryView } from "@/components/living/StoryView";
import { publishedStory, otherPublishedStories } from "@/lib/db";

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

  // The rabbit hole at the end of the piece (PART 3 / "after the story"):
  // one honest "same feeling" pick — the nearest thing to it we can claim
  // without a real tagging system is another story sharing its accent
  // colour — and one genuinely random "surprise me". No fabricated theme
  // graph; both come straight out of what's actually published.
  const others = await otherPublishedStories(story.id);
  const sameAccent = others.filter((o) => o.accent === story.accent);
  const same = sameAccent.length ? sameAccent[Math.floor(Math.random() * sameAccent.length)] : null;
  const surprisePool = others.filter((o) => o.id !== same?.id);
  const surprise = surprisePool.length ? surprisePool[Math.floor(Math.random() * surprisePool.length)] : null;

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
      more={{
        same: same ? { handle: same.author.handle, slug: same.slug, place: same.place } : null,
        surprise: surprise ? { handle: surprise.author.handle, slug: surprise.slug, place: surprise.place } : null,
      }}
    />
  );
}
