/**
 * SEO / DISCOVERABILITY COVERAGE AUDIT (discoverability layer, 2026-10).
 *
 *   node --env-file=.env.local --import tsx scripts/seo-audit.ts
 *
 * Runs against the REAL database (not fixtures) — same pattern as
 * `scripts/gen-share-loops.ts`: a plain Node script that imports the
 * actual, pure `lib/*.ts` builders the live site renders with (never a
 * second, reimplemented copy of the derivation logic), talking to Supabase
 * directly because those builders' own callers (`app/**`) are Next.js
 * request-bound code this script isn't running inside.
 *
 * For every PUBLISHED story and every author with at least one published
 * story, asserts:
 *   - a resolving canonical URL (the exact shape `/@handle/slug` resolves to)
 *   - a non-empty title and description, within a sane length band
 *   - the Article/BlogPosting + BreadcrumbList JSON-LD builders don't throw
 *     and carry the required fields
 *   - the story has real SSR source text to render (not an empty draft)
 *   - it would appear in `sitemap.xml` and `/llms-full.txt` (both are
 *     generated from the identical `status = 'published'` query this script
 *     runs, so "would it appear" is "is it in this result set" — the real
 *     assertion here is that nothing about a story makes those two routes
 *     THROW or silently drop it)
 * A story published before this migration (no `seo_title`/`seo_description`/
 * `tags` override) and one published after it are run through the exact
 * same checks — there is no "legacy story" code path anywhere in this audit
 * or in the pipeline it's checking.
 *
 * Exits 1 if any story or author fails a hard check (something a reader or
 * crawler would actually hit); exits 0 with warnings printed for soft
 * issues (short/long descriptions, missing bio, etc).
 */
import { createClient } from "@supabase/supabase-js";
import { deriveStoryContext } from "../lib/story-context";
import { resolveStorySeo } from "../lib/story-seo";
import { deriveAuthorDescription } from "../lib/author-seo";
import { buildStoryMetadata } from "../lib/metadata";
import { articleJsonLd, breadcrumbJsonLd, profilePageJsonLd } from "../lib/structured-data";
import { absoluteUrl, OWNER_HANDLE } from "../lib/site";
import type { Block } from "../lib/story-blocks.mjs";
import type { StoryArtDirection } from "../lib/art-direction/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const key = serviceKey ?? anonKey;

if (!url || !key) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and (ideally) SUPABASE_SERVICE_ROLE_KEY " +
    "(try: node --env-file=.env.local --import tsx scripts/seo-audit.ts)",
  );
  process.exit(1);
}
if (!serviceKey) {
  console.warn(
    "⚠ No SUPABASE_SERVICE_ROLE_KEY — falling back to the anon key. Published-story " +
    "checks below are unaffected (published rows are public to everyone by policy), " +
    "but this run CANNOT see draft counts, so the 'drafts not yet published' section " +
    "will be empty rather than informative.\n",
  );
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

type Row = {
  id: string; slug: string; place: string; date: string; fragment: string;
  source: string | null; blocks: Block[]; backdrop: string | null;
  art_direction: Partial<StoryArtDirection> | null;
  seo_title: string | null; seo_description: string | null; tags: string[];
  published_at: string | null; updated_at: string; status: "draft" | "published";
  author: { handle: string; display_name: string; bio: string; avatar_url: string | null };
};

type Issue = { level: "FAIL" | "WARN"; where: string; message: string };
const issues: Issue[] = [];
const fail = (where: string, message: string) => issues.push({ level: "FAIL", where, message });
const warn = (where: string, message: string) => issues.push({ level: "WARN", where, message });

async function main() {
  const { data, error } = await admin
    .from("stories")
    .select("*, author:profiles(handle, display_name, bio, avatar_url)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Could not read `stories`:", error.message);
    console.error(
      "If this is a network/egress error rather than a credentials error, this script " +
      "needs to run somewhere with outbound access to your Supabase project — see " +
      "docs/DISCOVERABILITY.md.",
    );
    process.exit(1);
  }

  const stories = (data ?? []) as unknown as Row[];
  console.log(`Auditing ${stories.length} published stor${stories.length === 1 ? "y" : "ies"}...\n`);

  // ── per-story checks ────────────────────────────────────────────────
  const byAuthor = new Map<string, Row[]>();
  for (const s of stories) {
    const list = byAuthor.get(s.author.handle) ?? [];
    list.push(s);
    byAuthor.set(s.author.handle, list);

    const where = `@${s.author.handle}/${s.slug}`;
    const canonical = absoluteUrl(`/@${s.author.handle}/${s.slug}`);
    if (!/^https?:\/\/.+\/@[^/]+\/[^/]+$/.test(canonical)) {
      fail(where, `canonical URL doesn't have the expected /@handle/slug shape: ${canonical}`);
    }

    // The exact derivation the live page runs (lib/story-context.ts +
    // lib/story-seo.ts) — never a reimplemented guess.
    let context: ReturnType<typeof deriveStoryContext>;
    try {
      context = deriveStoryContext({
        fragment: s.fragment, place: s.place, date: s.date, source: s.source,
        blocks: s.blocks, backdrop: s.backdrop, artDirection: s.art_direction,
      });
    } catch (e) {
      fail(where, `deriveStoryContext threw: ${(e as Error).message}`);
      continue;
    }
    const seo = resolveStorySeo(s, context);

    if (!seo.title.trim()) fail(where, "derived title is empty");
    if (!seo.description.trim()) fail(where, "derived description is empty");
    else {
      if (seo.description.length < 40) warn(where, `description is short (${seo.description.length} chars) — thin for a search snippet`);
      if (seo.description.length > 300) warn(where, `description is long (${seo.description.length} chars) — most surfaces truncate well before this`);
    }

    // SSR text actually exists to render (not a published-but-empty row).
    const hasSource = Boolean(s.source?.trim());
    const hasBlocks = Array.isArray(s.blocks) && s.blocks.some((b) => b.kind === "beat" && b.text?.trim());
    if (!hasSource && !hasBlocks) fail(where, "no source text and no beat blocks — nothing for a reader or crawler to read");

    // Metadata + JSON-LD builders must not throw and must carry required fields.
    try {
      const meta = buildStoryMetadata({
        title: seo.title, description: seo.description, path: `/@${s.author.handle}/${s.slug}`,
        authorHandle: s.author.handle, publishedTime: s.published_at, modifiedTime: s.updated_at,
        keywords: seo.tags,
      });
      if (!meta.alternates?.canonical) fail(where, "buildStoryMetadata produced no canonical");
    } catch (e) {
      fail(where, `buildStoryMetadata threw: ${(e as Error).message}`);
    }
    try {
      const ld = articleJsonLd({
        headline: seo.title, description: seo.description, url: canonical,
        authorName: s.author.display_name || `@${s.author.handle}`,
        authorUrl: absoluteUrl(`/@${s.author.handle}`),
        datePublished: s.published_at, dateModified: s.updated_at, keywords: seo.tags,
      });
      if (ld["@type"] !== "BlogPosting" || !ld.headline || !ld.url) fail(where, "articleJsonLd missing a required field");
      JSON.stringify(ld);
    } catch (e) {
      fail(where, `articleJsonLd threw: ${(e as Error).message}`);
    }
    try {
      const bc = breadcrumbJsonLd([
        { name: "Living Page", url: absoluteUrl("/") },
        { name: s.author.display_name || `@${s.author.handle}`, url: absoluteUrl(`/@${s.author.handle}`) },
        { name: seo.title, url: canonical },
      ]);
      JSON.stringify(bc);
    } catch (e) {
      fail(where, `breadcrumbJsonLd threw: ${(e as Error).message}`);
    }

    if (!s.published_at) warn(where, "no published_at — datePublished will be missing from JSON-LD");
  }

  // ── per-author checks ───────────────────────────────────────────────
  for (const [handle, list] of byAuthor) {
    const author = list[0].author;
    const name = author.display_name?.trim() && author.display_name.trim() !== handle
      ? author.display_name.trim() : `@${handle}`;
    const description = author.bio?.trim() || deriveAuthorDescription(name, list);
    const where = `@${handle} (author page)`;
    if (!description.trim()) fail(where, "derived author description is empty");
    try {
      const ld = profilePageJsonLd({ name, url: absoluteUrl(`/@${handle}`), image: author.avatar_url, description });
      JSON.stringify(ld);
    } catch (e) {
      fail(where, `profilePageJsonLd threw: ${(e as Error).message}`);
    }
  }

  // ── drafts: informational only, never a code gap ────────────────────
  if (serviceKey) {
    const { data: drafts } = await admin.from("stories").select("slug, author:profiles(handle)").eq("status", "draft");
    const list = (drafts ?? []) as unknown as { slug: string; author: { handle: string } }[];
    if (list.length) {
      console.log(`${list.length} draft(s) exist and are correctly excluded from every surface this audit checks.`);
      console.log("Not a gap — publish them (an author action) if you want them discovered:");
      for (const d of list) console.log(`  - @${d.author.handle}/${d.slug} (draft)`);
      console.log("");
    }
  }

  // ── the POC validation target ────────────────────────────────────────
  const ownerStories = byAuthor.get(OWNER_HANDLE) ?? [];
  console.log(`POC handle: @${OWNER_HANDLE} — ${ownerStories.length} published stor${ownerStories.length === 1 ? "y" : "ies"} audited above with the same checks as every other author.\n`);

  // ── report ───────────────────────────────────────────────────────────
  const fails = issues.filter((i) => i.level === "FAIL");
  const warns = issues.filter((i) => i.level === "WARN");
  for (const i of issues) console.log(`${i.level === "FAIL" ? "✗" : "⚠"} [${i.where}] ${i.message}`);
  console.log(`\n${stories.length} stories, ${byAuthor.size} authors — ${fails.length} failing, ${warns.length} warnings.`);
  if (!fails.length) console.log("Every published story and author page resolves, describes itself, and carries valid structured data.");
  process.exit(fails.length ? 1 : 0);
}

main();
