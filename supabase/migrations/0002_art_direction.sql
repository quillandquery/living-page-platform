-- Story Visual System 2.0 — additive only (D4). Old rows default to an
-- empty jsonb object; the reader treats that the same as null (see
-- `lib/art-direction/types.ts` isCompleteArtDirection) and falls back to
-- rendering from the existing place/accent/backdrop columns exactly as it
-- always has. Nothing here changes what an old story looks like until it is
-- next saved, at which point the editor computes and stores a real
-- StoryArtDirection.

alter table public.stories
  add column if not exists art_direction jsonb not null default '{}'::jsonb;

alter table public.stories
  add column if not exists type text not null default 'story';

alter table public.stories drop constraint if exists stories_type_check;
alter table public.stories
  add constraint stories_type_check
  check (type in ('story', 'moment', 'thought', 'freeform'));

comment on column public.stories.art_direction is
  'A serialized StoryArtDirection (lib/art-direction/types.ts) — environment, atmosphere, art style, artwork, ambient motion, material, composition, typography hints and a persistent signature. Empty object = not yet generated; the reader falls back to place/accent/backdrop.';
comment on column public.stories.type is
  'Story / Moment / Thought / Just start — the writer entry mode (D3). Cosmetic today; does not change rendering.';
