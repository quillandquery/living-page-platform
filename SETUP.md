# The Living Page — platform setup

The prototype was a single travel diary whose stories were `.mdx` files read
at build time. This is the same reading experience opened up as a platform:
anyone can sign up, write plainly, and publish; the engine gives every line a
voice. Stories now live in Postgres (Supabase) and render at request time.

You need two free accounts: **Supabase** (database + auth) and **Vercel**
(hosting). Total setup is about 15 minutes.

## 1. Create the Supabase project

1. Go to https://supabase.com → New project. Pick a name and a strong database
   password (save it). Choose a region near you.
2. When it's ready, open **SQL Editor** → New query, paste the entire contents
   of `supabase/migrations/0001_init.sql`, and Run. That creates the
   `profiles` and `stories` tables, the row-level-security policies, and the
   trigger that keeps `updated_at` honest.
3. Open **Project Settings → API** and copy three values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secret — only used by
     the seed script and never shipped to the browser)
4. Open **Authentication → Providers → Email**. For the smoothest start, turn
   **"Confirm email" OFF** — new writers land straight in the studio. Leave it
   ON if you'd rather every signup confirm by email first (the app handles
   both; there's an `/auth/callback` route for the confirmation link).

## 2. Local env

Copy `.env.example` to `.env.local` and fill in the three keys plus:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then:

```bash
npm install
npm run dev            # http://localhost:3000
```

Sign up, pick a handle, and publish a piece. That's the whole loop.

## 3. (Optional) seed the Gokarna story

To carry the prototype's story into the database as a published example:

```bash
npm run seed                       # seeds under handle "reshika"
# or: node --env-file=.env.local scripts/seed.mjs yourhandle you@email.com
```

It prints the demo writer's password once — save it if you want to sign in as
that writer.

## 4. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. https://vercel.com → New Project → import the repo. Framework preset:
   **Next.js** (auto-detected).
3. Add the environment variables (Project → Settings → Environment Variables):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SITE_URL` set to your final
   URL (e.g. `https://your-app.vercel.app`).
4. Deploy. Then in Supabase → **Authentication → URL Configuration**, set the
   Site URL to your Vercel URL so confirmation/redirect links point at the
   real site.

That's it — a live, multi-writer Living Page.

## What changed from the prototype

- Content moved from `content/stories/*.mdx` (build-time) to a `stories` table
  rendered at request time. `components/living/StoryRender.tsx` renders a
  story's `blocks` (the same block grammar the studio always spoke), so the
  writing behaves exactly as before.
- `/studio` (local, disk-writing, dev-only) became `/write` — a hosted desk
  and editor that saves to the database, gated by Supabase auth.
- New surfaces: `/` (a feed across all writers), `/@handle` (a writer's page),
  `/@handle/slug` (the reader), plus sign-in, sign-up, onboarding and settings.
- Privacy is enforced by Postgres row-level security, not by an environment
  check: a draft is visible only to its author; a writer can only ever touch
  their own rows.
