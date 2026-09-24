-- Claim links — hand a seeded piece to the person who actually wrote the
-- words, without ever needing an account for them up front (D4: additive
-- only; nothing here changes how an existing row reads or renders).
--
-- The flow: you paste someone else's writing into a normal draft (the Auto
-- engine treats it exactly like your own prose — nothing new to build
-- there), generate a private link for that draft, and send it. The link
-- opens the page exactly as a reader would see it, unlisted and
-- unindexed, with one quiet way to claim it. Claiming requires an account;
-- claiming TRANSFERS author_id to the new writer's profile, so from that
-- moment on it is their row in every way RLS already understands — no new
-- policy needed for the steady state, only for the brief pending window.

alter table public.stories
  add column if not exists claim_token  text unique,
  add column if not exists claim_status text not null default 'none',
  add column if not exists claimed_at   timestamptz,
  -- who generated the link — kept even after author_id moves on, as the
  -- one durable record of "this piece started as a gift from ___".
  add column if not exists seeded_by    uuid references public.profiles (id);

alter table public.stories drop constraint if exists stories_claim_status_check;
alter table public.stories
  add constraint stories_claim_status_check
  check (claim_status in ('none', 'pending', 'claimed'));

create index if not exists stories_claim_token_idx
  on public.stories (claim_token) where claim_token is not null;

comment on column public.stories.claim_token  is
  'Random unguessable slug for /claim/<token>. Set when a link is generated, cleared the moment it is claimed or revoked — a link is good for exactly one successful claim.';
comment on column public.stories.claim_status is
  'none = never invited. pending = a link is live and waiting. claimed = ownership has already transferred; the token is gone.';
comment on column public.stories.seeded_by is
  'The writer who generated the claim link (almost always who pasted the source text in). Distinct from author_id, which moves to the claimant once claimed.';

-- No new RLS policy is needed for the pending window: the row is still a
-- private draft (status='draft') owned by whoever generated the link, so
-- the existing "read published or own" / "update own stories" policies
-- already govern it correctly for its author. The public claim page and
-- the finalize step both read/write it via the service-role key instead
-- of the anon key precisely BECAUSE the visitor and the claimant have no
-- ownership over the row yet — see lib/claim.ts. That is a deliberate,
-- narrowly-scoped bypass, not a gap: nothing here grants the anon or
-- authenticated Postgres roles any new access to `stories`.
