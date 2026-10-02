-- Optional per-story SEO overrides (discoverability layer, 2026-10) —
-- additive only (D4). WR-6 deliberately shipped publish with no seo/slug/
-- tags fields; every published story since has been fully discoverable
-- anyway because `lib/story-context.ts` + `lib/metadata.ts` derive a
-- title, description, canonical and structured data from the story's own
-- words (place/fragment/blocks), never a blank. These three columns exist
-- only so a writer who wants to CORRECT a derived description (not supply
-- one from scratch — nothing requires that) has a place to do it. All
-- three are nullable and default to "no override" (null / empty array);
-- a row saved before this migration and a row saved after it are
-- functionally identical to every reader of this data: the auto-derivation
-- path in `lib/story-context.ts` is completely unchanged and remains the
-- only thing most stories ever use.

alter table public.stories
  add column if not exists seo_title       text,
  add column if not exists seo_description text,
  add column if not exists tags            text[] not null default '{}'::text[];

comment on column public.stories.seo_title is
  'Author override for the page <title>/OG title/Article headline. Null (the default) means "use the derived Story Context title" (lib/story-context.ts) — never a required publish field.';
comment on column public.stories.seo_description is
  'Author override for the meta description/OG description/Article description. Null (the default) means "use the derived extractive summary" (lib/story-context.ts deriveSummary) — never a required publish field.';
comment on column public.stories.tags is
  'Optional, author-supplied short topic words (Article `keywords`, future internal-linking signal). `{}` (the default) means the story carries no author-set tags; nothing today requires or infers them — see docs/DISCOVERABILITY.md before building any auto-tagging on top of this.';

-- No RLS change: these are ordinary columns on a table whose existing
-- policies already govern who can read/write a row (own draft, or any
-- published row to any reader) — see supabase/migrations/0001_init.sql.
