import { publishedFeed } from "@/lib/db";
import { deriveStoryContext } from "@/lib/story-context";
import { resolveStorySeo } from "@/lib/story-seo";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

/**
 * /llms-full.txt (discoverability layer, 2026-10 — companion to the
 * hand-curated `public/llms.txt`). `llms.txt` itself stays a short, hand-
 * written map (the llms.txt convention's own intent: a curated pointer, not
 * a dump) — but the task this route answers is different: every published
 * story, from every writer, with zero manual upkeep. A story published
 * today or five minutes from now appears here on its very next request;
 * nothing about this route is specific to any one author (contrast
 * `public/llms.txt`'s "Start here" section, which deliberately does name
 * one handle as a worked example).
 *
 * Reuses the exact same `deriveStoryContext` + `resolveStorySeo` pipeline
 * the story page's own `generateMetadata` and JSON-LD use, so this index
 * can never describe a story differently than the page itself does.
 *
 * Generated at request time (not a static file) for the same reason
 * `app/sitemap.ts` and `app/robots.ts` are routes rather than files in
 * `public/`: a plain file can only ever be as current as the last deploy;
 * a route is as current as the database.
 */
export const revalidate = 3600;
// NB: a route handler must NOT export `contentType` — Next 15.5 rejects it as
// an invalid route export (it's a Metadata-route field, not a Route one). The
// Content-Type is set on the Response below, which is the correct place.

export async function GET() {
  const stories = await publishedFeed(5000);

  const lines: string[] = [];
  lines.push(`# ${SITE_NAME} — full story index`);
  lines.push("");
  lines.push(
    "> Every story currently published on Living Page, one per line, generated fresh on each request. " +
    "Not a human-facing page — see llms.txt for the curated overview and /about for what this product is.",
  );
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Count: ${stories.length}`);
  lines.push("");
  lines.push("## Stories");
  lines.push("");

  for (const s of stories) {
    const context = deriveStoryContext({
      fragment: s.fragment,
      place: s.place,
      date: s.date,
      source: s.source,
      blocks: s.blocks,
      backdrop: s.backdrop,
      artDirection: s.art_direction,
    });
    const seo = resolveStorySeo(s, context);
    const url = absoluteUrl(`/@${s.author.handle}/${s.slug}`);
    const authorName = s.author.display_name?.trim() || `@${s.author.handle}`;
    // One line per story, link-list style (the llms.txt convention's own
    // "- [title](url): description" shape) — summary is the same extractive
    // one the page's own meta description uses, never a second guess at it.
    lines.push(`- [${seo.title}](${url}) — by ${authorName}: ${seo.description}`);
  }

  if (!stories.length) {
    lines.push("(nothing published yet)");
  }

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
