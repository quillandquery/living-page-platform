-- The Living Page — platform schema
-- Two tables: a profile per writer, and their stories. Content lives here
-- now, not in content/stories/*.mdx: a story is a row whose `blocks` column
-- is the same Block[] grammar the studio has always spoken (lib/story-blocks.mjs),
-- so the reader renders it at request time instead of at build time.

-- ── profiles ──────────────────────────────────────────────────────────
-- One row per auth user. The handle is the writer's address on the site
-- (/@handle) and is chosen once, at onboarding, by the user themselves —
-- there is no trigger minting a random one, because a handle is a name.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  handle       text unique not null,
  display_name text not null default '',
  bio          text not null default '',
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- 3–30 chars, lowercase letters/digits/hyphen, not starting or ending on a hyphen
alter table public.profiles drop constraint if exists profiles_handle_format;
alter table public.profiles
  add constraint profiles_handle_format
  check (handle ~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$');

-- ── stories ───────────────────────────────────────────────────────────
-- The slug is unique per author, not globally: two writers can each have a
-- /gokarna. The reading URL is /@handle/slug, so the pair is what has to be
-- unique. `blocks` is jsonb — beat/hold blocks emitted by the annotate
-- engine. Frontmatter (place/date/fragment/accent/backdrop/veil) that used
-- to sit above the MDX is now columns.
create table if not exists public.stories (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles (id) on delete cascade,
  slug         text not null,
  place        text not null default '',
  date         text not null default '',
  fragment     text not null default '',
  accent       text not null default '#2B3ED0',
  backdrop     text,
  veil         boolean not null default true,
  -- the writer's raw prose, kept so the editor can round-trip it. `blocks`
  -- is what the reader renders; `source` is what the writer keeps editing.
  source       text not null default '',
  blocks       jsonb not null default '[]'::jsonb,
  status       text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (author_id, slug)
);

create index if not exists stories_feed_idx   on public.stories (status, published_at desc);
create index if not exists stories_author_idx on public.stories (author_id, updated_at desc);

-- keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stories_touch on public.stories;
create trigger stories_touch
  before update on public.stories
  for each row execute function public.touch_updated_at();

-- ── row level security ────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.stories  enable row level security;

-- profiles: anyone may read (writer pages are public); you edit only your own
drop policy if exists "profiles are public"      on public.profiles;
drop policy if exists "insert own profile"        on public.profiles;
drop policy if exists "update own profile"        on public.profiles;
create policy "profiles are public" on public.profiles
  for select using (true);
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- stories: a published story is world-readable; a draft is visible only to
-- its author. Writers can only ever touch their own rows.
drop policy if exists "read published or own" on public.stories;
drop policy if exists "insert own stories"    on public.stories;
drop policy if exists "update own stories"    on public.stories;
drop policy if exists "delete own stories"    on public.stories;
create policy "read published or own" on public.stories
  for select using (status = 'published' or auth.uid() = author_id);
create policy "insert own stories" on public.stories
  for insert with check (auth.uid() = author_id);
create policy "update own stories" on public.stories
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "delete own stories" on public.stories
  for delete using (auth.uid() = author_id);
