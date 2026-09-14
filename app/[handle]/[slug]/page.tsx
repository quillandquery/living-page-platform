import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoryView } from "@/components/living/StoryView";
import { publishedStory, otherPublishedStories } from "@/lib/db";
import { themesOf } from "@/lib/discover";

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
  // a real thematic pick where the words support one — themesOf() is a
  // small local keyword lexicon read off the hook + place, the same kind
  // of deterministic pass lib/annotate.ts already runs, not an LLM and
  // not a tag a writer set — falling back to a same-accent pick when no
  // theme overlaps, and one genuinely random "surprise me" either way.
  const others = await otherPublishedStories(story.id);
  const myThemes = themesOf(`${story.fragment} ${story.place}`);
  const themeMatches = myThemes.length
    ? others
        .map((o) => ({ story: o, themes: themesOf(`${o.fragment} ${o.place}`) }))
        .filter((m) => m.themes.some((t) => myThemes.includes(t)))
    : [];
  const themePick = themeMatches.length ? themeMatches[Math.floor(Math.random() * themeMatches.length)] : null;
  const matchedTheme = themePick ? themePick.themes.find((t) => myThemes.includes(t)) ?? null : null;
  const sameAccent = !themePick ? others.filter((o) => o.accent === story.accent) : [];
  const same = themePick?.story ?? (sameAccent.length ? sameAccent[Math.floor(Math.random() * sameAccent.length)] : null);
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
      artDirection={story.art_direction}
      more={{
        same: same ? { handle: same.author.handle, slug: same.slug, place: same.place, theme: matchedTheme } : null,
        surprise: surprise ? { handle: surprise.author.handle, slug: surprise.slug, place: surprise.place } : null,
      }}
    />
  );
}
