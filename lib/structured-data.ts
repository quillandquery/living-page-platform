/**
 * STRUCTURED DATA (Module 4, PART 6 / SEO strategy doc "Structured data,
 * E-E-A-T, and AI Overviews").
 *
 * One builder per schema type, reused by every page that needs it, so a
 * story page and an author page never drift into two slightly different
 * ideas of what a Person or an Article looks like (Part 5: "do not
 * duplicate metadata logic across files" — this is the JSON-LD half of
 * that same rule). Every field here comes from real row data; nothing is
 * fabricated (no invented `sameAs` links, no invented ratings).
 */
import { SITE_NAME, SITE_URL } from "./site";

export type ArticleJsonLdInput = {
  headline: string;
  description: string;
  url: string;
  imageUrl?: string | null;
  authorName: string;
  authorUrl: string;
  datePublished?: string | null;
  dateModified?: string | null;
};

export function articleJsonLd(input: ArticleJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.headline,
    description: input.description,
    url: input.url,
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    ...(input.imageUrl ? { image: [input.imageUrl] } : {}),
    author: { "@type": "Person", name: input.authorName, url: input.authorUrl },
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

export type PersonJsonLdInput = {
  name: string;
  url: string;
  image?: string | null;
  description?: string | null;
};

export function personJsonLd(input: PersonJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    url: input.url,
    ...(input.image ? { image: input.image } : {}),
    ...(input.description ? { description: input.description } : {}),
  };
}

/** The exact `<script>` props for a JSON-LD block, escaping `<` the same
 *  way the original inline Person JSON-LD on `/@handle` already did, so a
 *  string like `</script>` inside a bio can never break out of the tag. */
export function jsonLdScriptProps(data: unknown): { dangerouslySetInnerHTML: { __html: string } } {
  return { dangerouslySetInnerHTML: { __html: JSON.stringify(data).replace(/</g, "\\u003c") } };
}
