import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoryStage } from "@/components/living/StoryStage";
import { resolveFormat, fittingFormats, curatedFormats } from "@/lib/formats";
import { publishedStory, otherPublishedStories } from "@/lib/db";
import { themesOf } from "@/lib/discover";
import { deriveStoryContext } from "@/lib/story-context";
import { buildStoryMetadata } from "@/lib/metadata";
import { articleJsonLd, jsonLdScriptProps } from "@/lib/structured-data";
import { absoluteUrl } from "@/lib/site";

const clean = (h: string) => decodeURIComponent(h).replace(/^@/, "").toLowerCase();

/**
 * The atomic ranking unit (SEO strategy doc). Before this, generateMetadata
 * here set only a bare `title`/`description` — no canonical, no OG/Twitter,
 * no structured data (doc finding #5). Both the title and the description
 * now come from `lib/story-context.ts`'s Story Context: the title is the
 * writer's own hook line (never rewritten), the description is an
 * extractive summary of the story's own words (never invented copy). The
 * OG image comes from the co-located `opengraph-image.tsx` — Next's file
 * convention wires it in automatically, so it isn't repeated here.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ handle: string; slug: string }> },
): Promise<Metadata> {
  const { handle, slug } = await params;
  const story = await publishedStory(clean(handle), slug);
  if (!story) return {};

  const context = deriveStoryContext({
    fragment: story.fragment,
    place: story.place,
    date: story.date,
    source: story.source,
    blocks: story.blocks,
    backdrop: story.backdrop,
    artDirection: story.art_direction,
  });

  return buildStoryMetadata({
    title: context.title,
    description: context.summary,
    path: `/@${story.author.handle}/${slug}`,
    authorHandle: story.author.handle,
    publishedTime: story.published_at,
    modifiedTime: story.updated_at,
  });
}

/** `/@handle/slug` — the reader. Renders the story's blocks at request time. */
export default async function StoryReaderPage(
  { params, searchParams }: { params: Promise<{ handle: string; slug: string }>; searchParams: Promise<{ as?: string }> },
) {
  const { handle, slug } = await params;
  const { as } = await searchParams;
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

  const format = resolveFormat(as, story.blocks, { authorDefault: story.art_direction?.format, look: story.art_direction?.look });
  const curated = curatedFormats(story.blocks, story.art_direction?.atmosphere?.mood);
  const fitting = Array.from(new Set([format, ...curated]));
  const basePath = `/@${story.author.handle}/${slug}`;

  // Article/BlogPosting structured data (Module 4 PART 6 / SEO doc): the
  // same Story Context that built the metadata above, so the two can never
  // disagree about what this story is titled or about.
  const context = deriveStoryContext({
    fragment: story.fragment,
    place: story.place,
    date: story.date,
    source: story.source,
    blocks: story.blocks,
    backdrop: story.backdrop,
    artDirection: story.art_direction,
  });
  const articleUrl = absoluteUrl(basePath);
  const articleLd = articleJsonLd({
    headline: context.title,
    description: context.summary,
    url: articleUrl,
    authorName: story.author.display_name || `@${story.author.handle}`,
    authorUrl: absoluteUrl(`/@${story.author.handle}`),
    datePublished: story.published_at,
    dateModified: story.updated_at,
  });

  return (
    <>
    <script type="application/ld+json" {...jsonLdScriptProps(articleLd)} />
    <StoryStage
      format={format}
      formats={fitting}
      basePath={basePath}
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
    </>
  );
}
