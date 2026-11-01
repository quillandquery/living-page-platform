-- Private vs Public publishing — additive only (D4).
--
-- `status` keeps meaning "has this been published at all" (draft | published).
-- `visibility` answers the separate question "who can see it once it is":
--
--   public   world-readable: reader page, writer page, Wander, sitemap, share
--            assets, read-next. This is what every existing story already is.
--   private  published, but only its author can read it. Same row, same slug,
--            same URL — it just 404s for everyone else. Flip it back any time.
--
-- Existing rows backfill to 'public' through the column default, so every
-- story that is live today stays exactly as available as it is today.

alter table public.stories
  add column if not exists visibility text not null default 'public';

alter table public.stories drop constraint if exists stories_visibility_check;
alter table public.stories
  add constraint stories_visibility_check
  check (visibility in ('public', 'private'));

comment on column public.stories.visibility is
  'public = readable by anyone once published; private = published but readable only by its author (RLS "read public or own"). Independent of status: a draft is always author-only regardless of this value.';

-- The public feed (Wander, sitemap, llms-full, read-next) only ever scans
-- public+published rows, so index exactly those.
create index if not exists stories_public_feed_idx
  on public.stories (published_at desc)
  where status = 'published' and visibility = 'public';

-- ── row level security ────────────────────────────────────────────────
-- THE enforcement point. A non-author can no longer SELECT a private row by
-- any route — PostgREST, the anon key, a hand-crafted request — whether or
-- not application code remembers to filter. Insert/update/delete policies are
-- unchanged: they already restrict every write to the row's own author, which
-- is what lets only the author flip visibility.
drop policy if exists "read published or own" on public.stories;
drop policy if exists "read public or own"    on public.stories;
create policy "read public or own" on public.stories
  for select using (
    (status = 'published' and visibility = 'public')
    or auth.uid() = author_id
  );
