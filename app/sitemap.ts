import type { MetadataRoute } from "next";
import { publishedFeed } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";

/**
 * SEO strategy doc, phase 1 item 3 / Module 4 PART 13 — the atomic ranking
 * unit is `/@handle/slug`, so the sitemap is: every published story, every
 * author with at least one, and the couple of real hub pages. No sample
 * stories (they aren't rows in `stories` at all — see
 * `lib/wander-samples.ts`), no drafts (`publishedFeed` already only reads
 * `status = "published"`), no utility routes, no `/explore` (it permanently
 * redirects to `/wander` — linking the redirect target directly keeps link
 * equity from splitting, per the doc's finding #6).
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stories = await publishedFeed(5000);

  const authors = new Map<string, string | null>();
  for (const s of stories) {
    const seenAt = authors.get(s.author.handle);
    if (!seenAt || (s.published_at && s.published_at > seenAt)) {
      authors.set(s.author.handle, s.published_at ?? seenAt ?? null);
    }
  }

  const hubs: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/wander"), changeFrequency: "daily", priority: 0.9 },
    // Added alongside /about (SEO/GEO/AEO audit, Sept 2026) — static,
    // rarely-changing, low-priority relative to the two real hubs above.
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.3 },
  ];

  const authorPages: MetadataRoute.Sitemap = Array.from(authors.entries()).map(([handle, lastModified]) => ({
    url: absoluteUrl(`/@${handle}`),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const storyPages: MetadataRoute.Sitemap = stories.map((s) => ({
    url: absoluteUrl(`/@${s.author.handle}/${s.slug}`),
    ...(s.updated_at || s.published_at ? { lastModified: s.updated_at ?? s.published_at! } : {}),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...hubs, ...authorPages, ...storyPages];
}
