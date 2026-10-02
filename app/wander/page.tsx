import type { Metadata } from "next";

import { publishedFeed } from "@/lib/db";
import { buildField } from "@/lib/discover";
import { SAMPLE_STORIES } from "@/lib/wander-samples";
import { WanderField } from "@/components/wander/WanderField";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

/**
 * SEO audit, Sept 2026: this previously read "Wander — The Living Page",
 * a leftover pre-repositioning wordmark (docs/COPY.md's `[NAV.LOGO]` is
 * "Living Page", never "The Living Page") — it also bypassed the layout's
 * title template instead of using it. It also had no canonical URL and no
 * openGraph/twitter fields, so a shared Wander link had no preview card.
 * The image comes from the co-located opengraph-image.tsx.
 *
 * Re-audited Sept 22 2026 (action-plan item 7): the description itself was
 * only 47 characters — well under Google's ~120–160 char target, so it
 * gets discarded for an auto-generated snippet instead. Extended in the
 * same voice (the original line kept verbatim as the opening clause, not
 * replaced) rather than rewritten into generic SEO language.
 */
const WANDER_TITLE = "Wander";
const WANDER_DESCRIPTION =
  "You don't have to know what you're looking for. Wander is a live, changing field of real, first-person stories — drift until one catches you.";

export const metadata: Metadata = {
  title: WANDER_TITLE,
  description: WANDER_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/wander") },
  openGraph: {
    title: WANDER_TITLE,
    description: WANDER_DESCRIPTION,
    url: absoluteUrl("/wander"),
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: WANDER_TITLE,
    description: WANDER_DESCRIPTION,
  },
};

/**
 * `/wander` — the reader's own surface. Home explains the medium; Wander
 * helps you find something to read. Every Story Seed here is derived from
 * the story's own blocks, world and words (lib/discover.ts) — there is no
 * separate tagging system, so nothing here is invented.
 */
export default async function WanderPage() {
  const published = await publishedFeed(150);
  // Real stories lead; seed stories fill the field so Wander is a gallery,
  // not a ghost town, until enough people have published. A seed is dropped
  // if a real story already tells it, so nothing shows up twice.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const taken = new Set(published.map((s) => norm(s.fragment)));
  const seeds = buildField([...published, ...SAMPLE_STORIES.filter((s) => !taken.has(norm(s.fragment)))]);
  return <WanderField seeds={seeds} />;
}
