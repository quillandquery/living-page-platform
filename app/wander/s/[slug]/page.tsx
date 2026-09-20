import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoryView } from "@/components/living/StoryView";
import { sampleBySlug, otherSamples } from "@/lib/wander-samples";
import { themesOf } from "@/lib/discover";
import { deriveStoryContext } from "@/lib/story-context";
import { buildStoryMetadata } from "@/lib/metadata";
import { articleJsonLd, jsonLdScriptProps } from "@/lib/structured-data";
import { absoluteUrl } from "@/lib/site";

/**
 * `/wander/s/[slug]` — a seed story, read through the very same StoryView
 * the real reader uses. Its rabbit hole stays inside the seed set (and
 * always leads back out to Wander), so falling into one is a real Living
 * Page, not a dead end. Author + links are addressed under /wander/s/,
 * never a real @handle, so a seed never poses as a person's published work.
 *
 * `noindex` (SEO strategy doc / Module 4 PART 12): these exist to make
 * Wander feel alive before enough people have published, not to compete
 * with real writers' work in search — the doc is explicit that letting a
 * sample get indexed "hurts both trust and topical focus." A good share
 * card and being excluded from search are not in tension, so the OG image
 * (the co-located opengraph-image.tsx) still renders normally.
 */

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const story = sampleBySlug(slug);
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
    path: `/wander/s/${slug}`,
    noindex: true,
  });
}

export default async function SampleReaderPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const story = sampleBySlug(slug);
  if (!story) notFound();

  const others = otherSamples(slug);
  const myThemes = themesOf(`${story.fragment} ${story.place}`);
  const themeMatches = myThemes.length
    ? others
        .map((o) => ({ story: o, themes: themesOf(`${o.fragment} ${o.place}`) }))
        .filter((m) => m.themes.some((t) => myThemes.includes(t)))
    : [];
  const themePick = themeMatches.length ? themeMatches[Math.floor(Math.random() * themeMatches.length)] : null;
  const matchedTheme = themePick ? themePick.themes.find((t) => myThemes.includes(t)) ?? null : null;
  const sameAccent = !themePick ? others.filter((o) => o.accent === story.accent) : [];
  const same = themePick?.story ?? (sameAccent.length ? sameAccent[Math.floor(Math.random() * sameAccent.length)] : (others[0] ?? null));
  const surprisePool = others.filter((o) => o.id !== same?.id);
  const surprise = surprisePool.length ? surprisePool[Math.floor(Math.random() * surprisePool.length)] : null;

  const href = (s: { slug: string }) => `/wander/s/${s.slug}`;

  const context = deriveStoryContext({
    fragment: story.fragment,
    place: story.place,
    date: story.date,
    source: story.source,
    blocks: story.blocks,
    backdrop: story.backdrop,
    artDirection: story.art_direction,
  });
  const articleLd = articleJsonLd({
    headline: context.title,
    description: context.summary,
    url: absoluteUrl(`/wander/s/${slug}`),
    authorName: story.author.display_name,
    authorUrl: absoluteUrl("/wander"),
    datePublished: story.published_at,
  });

  return (
    <>
    <script type="application/ld+json" {...jsonLdScriptProps(articleLd)} />
    <StoryView
      place={story.place}
      date={story.date}
      fragment={story.fragment}
      accent={story.accent}
      backdrop={story.backdrop}
      veil={story.veil}
      blocks={story.blocks}
      author={{ handle: story.author.handle, display_name: story.author.display_name, href: "/wander" }}
      seed={story.id}
      more={{
        same: same ? { handle: same.author.handle, slug: same.slug, place: same.place, theme: matchedTheme, href: href(same) } : null,
        surprise: surprise ? { handle: surprise.author.handle, slug: surprise.slug, place: surprise.place, href: href(surprise) } : null,
      }}
    />
    </>
  );
}
