# Claim links — seed a piece, hand it to whoever wrote it

For the GTM motion where you already know people whose writing (a LinkedIn
post, a Substack essay, a blog they keep) would make a good Living Page, and
you want to show them the transformed result before asking them to sign up
for anything.

## How it works

```
you paste their words into an ordinary draft
        │  (the Auto engine treats pasted prose exactly like your own —
        │   nothing new to author, no separate "import" flow)
        ▼
"get a claim link"  (app/write/[id]/editor.tsx, only shown on a draft)
        │  createClaimLink()  — lib/claim.ts, as YOU, normal RLS
        ▼
stories.claim_token = <random>, claim_status = 'pending'
        │
        ▼
you send  living.page/claim/<token>  to them however you like
        │
        ▼
they open it — app/claim/[token]/page.tsx renders it through the exact same
StoryStage the real reader page uses. Unlisted: no feed entry, no sitemap,
`robots: noindex`. Still just a private draft under the hood — nothing
about privacy changed, they're seeing it via a service-role read
(getPendingClaim), not because the row became public.
        │
        ▼
"this is yours — claim it"  →  /signup?next=/claim/<token>/finish
        │  (or "already write here? log in" → /login?next=…)
        ▼
signup / login → onboarding (handle) if needed → /claim/<token>/finish
        │  finalizeClaim()  — service-role, the one privileged operation:
        │  author_id moves to them, claim_status → 'claimed', token cleared
        ▼
redirected straight into /write/<id> — THEIR editor, on THEIR now-own
draft, exactly where a writer decides mood/visuals/motion and hits Publish
themselves.
```

## Why a claimed piece stays a draft

Claiming hands over ownership, not a publish decision. The person who
actually wrote the words should be the one who looks at the transformed
page and decides it's ready — same as anyone starting a piece from
scratch. It also means a link can be revoked or can simply sit unclaimed
forever with zero footprint: nothing about it was ever public.

## Guardrails already in place

- **Only a draft can be seeded.** `createClaimLink` refuses anything with
  `status = 'published'` — a story you've already put out under your own
  name isn't a "seed," and quietly reassigning it later would break a URL
  someone may have already shared.
- **A link claims exactly once.** `finalizeClaim`'s `UPDATE … WHERE
  claim_status = 'pending'` is the concurrency guard: the first request to
  land wins the row; a second (a stale tab, a resent link) gets a clean
  "already claimed" instead of a race.
- **The privileged reads/writes are narrow and named.** Only
  `getPendingClaim` (one row, by its exact token, only while pending) and
  `finalizeClaim` (one conditional update) touch the service-role client
  (`lib/supabase/admin.ts`). Nothing else in the claim flow bypasses RLS —
  generating and revoking a link runs as you, the same as every other
  write in `app/write/actions.ts`.
- **`seeded_by` survives the handoff.** `author_id` moves to the claimant,
  but `seeded_by` (set once, at link creation) doesn't — it's the durable
  "this one started as a gift from ___" record, useful later for seeing
  which seeds turned into real writers.

## One-time setup

`SUPABASE_SERVICE_ROLE_KEY` needs to be set wherever this runs (it already
is in `.env.local` for local dev, per `scripts/seed.mjs` / the share-loops
Action). Apply `supabase/migrations/0003_claim.sql` to the database before
using any of this — it's additive (new columns + a check constraint + an
index), nothing existing changes shape.
