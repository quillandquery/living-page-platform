/**
 * SHARED METADATA BUILDER (Module 4, PART 5 / SEO strategy doc phase 1).
 *
 * One place that turns "a title, a description, a path, maybe an image"
 * into a full Next.js `Metadata` object — canonical + OpenGraph + Twitter
 * all agreeing with each other — so `/@handle/slug` and `/wander/s/[slug]`
 * stop each hand-rolling their own half-finished version (the SEO doc's
 * finding #5: "generateMetadata... sets only title and description").
 */
import type { Metadata } from "next";
import { SITE_NAME, absoluteUrl } from "./site";

export type StoryMetadataInput = {
  title: string;
  description: string;
  /** e.g. "/@handle/slug" */
  path: string;
  /** an absolute OG image URL, when one exists (Part 4's OG renderer) */
  imageUrl?: string | null;
  authorHandle?: string | null;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  /** samples and other non-authored content (Part 12 / SEO doc: seed
   *  stories must never compete with real writers' work in search) */
  noindex?: boolean;
};

export function buildStoryMetadata(input: StoryMetadataInput): Metadata {
  const url = absoluteUrl(input.path);
  const images = input.imageUrl ? [{ url: input.imageUrl, width: 1200, height: 630, alt: input.title }] : undefined;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    ...(input.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "article",
      title: input.title,
      description: input.description,
      url,
      siteName: SITE_NAME,
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
      ...(input.authorHandle ? { authors: [absoluteUrl(`/@${input.authorHandle}`)] } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
  };
}
