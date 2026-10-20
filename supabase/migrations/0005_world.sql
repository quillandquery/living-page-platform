-- The living-page WORLD (D9) — additive only (D4). A story's reader output is
-- cast into one of the curated worlds (lib/living/worlds.ts). By default the
-- world is chosen from the story's own words at render time (pickWorld), so this
-- column stays null for almost every row; it is set only when the writer picks a
-- world by hand in the studio, pinning that choice. Old rows keep rendering: a
-- null world means "auto-cast from source", exactly the live behaviour.

alter table public.stories
  add column if not exists world text;

alter table public.stories drop constraint if exists stories_world_check;
alter table public.stories
  add constraint stories_world_check
  check (world is null or world in (
    'daylight','meadow','dawn-coast','paper','ember-interior',
    'storm','twilight-street','noir-room','dream','nocturne'
  ));

comment on column public.stories.world is
  'The writer-pinned living-page world (lib/living/worlds.ts WorldKey). null = auto-cast from the story''s own words at render time (lib/living/cast.ts pickWorld). Additive (D4); never resets an old row.';
