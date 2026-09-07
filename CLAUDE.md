# The Living Page

A platform for living travel diaries. Not an interactive travel blog network.

> **Don't decorate the writing. Animate the meaning.**

The reader should not feel like they are scrolling a website with animations
added to it. They should feel like they are moving through a memory. Now many
people get to make one.

Full design grammar: `.claude/skills/living-page/SKILL.md`. Read it before
composing or annotating a story.

## Commands

```bash
npm run dev        # localhost:3000
npm run build
npm run typecheck
npm run seed       # carry content/stories/*.mdx into the DB (needs .env.local)
```

Setup, provisioning and deploy: **`SETUP.md`**.

`next/font` fetches from Google at build time. A build that fails with a font
error in a network-restricted environment is a network problem, not a code
problem.

## The rule everything else hangs off

The unit is the **line**, not the paragraph:

```
line → voice → body → gesture → pause → line
```

A story is made of **scenes**, not paragraphs. The animation ratio is roughly
70% plain sentences, 20% another voice, 10% a full interaction. The writer
writes prose; `lib/annotate.ts` reads it into that shape, and `enforceRatio()`
demotes the least-confident non-speak beats when a draft goes over budget —
the engine loses its favourites first.

## The vocabulary is a closed set

Four independent axes in `lib/vocabulary.ts`: **VOICE** (8), **BODY** (10),
**GESTURE** (11), **MOVE** (6; `hold` means nothing happens). Add an entry
only when a story genuinely cannot be told with what exists — the constraint
is what makes the site read as one medium instead of a pile of effects.

## Architecture — a platform, not a folder of files

The prototype kept stories in `content/stories/*.mdx` and compiled them at
build time. The platform keeps them in Postgres and renders them at request
time. The pivot that made this cheap: a story has always been, underneath,
a `Block[]` — the grammar in `lib/story-blocks.mjs` that the studio speaks.
So the migration was "store the blocks, render the blocks", not a rewrite.

- **Data** — Supabase (Postgres + Auth). Two tables, `profiles` and
  `stories`; a story's `blocks` column is that same `Block[]`. Schema and
  row-level-security policies live in `supabase/migrations/0001_init.sql`.
- **Privacy is the database's job.** RLS — not an environment check — makes a
  draft visible only to its author and stops a writer touching another's rows.
  `lib/db.ts` (read side) and `app/write/actions.ts` (write side) never
  enforce privacy themselves; they rely on the policies.
- **Rendering** — `components/living/StoryRender.tsx` turns `Block[]` into the
  living components at runtime. `components/living/StoryView.tsx` is the whole
  reading shell (ground, backdrop, frontispiece, veil), shared by the reader
  page and the studio preview so what a writer sees is what a reader gets.
- **Auth** — `@supabase/ssr`. `lib/supabase/{server,client,middleware}.ts`;
  `middleware.ts` refreshes the session and gates `/write`, `/settings`,
  `/onboarding`. Open email/password signup.

## Routes

```
/                     the feed — published stories across all writers
/@handle              a writer's page (also answers /handle without the @)
/@handle/slug         the reader — renders the story's blocks
/login /signup        auth (client, Supabase)
/onboarding           pick a handle (once)
/settings             edit display name / bio, sign out
/write                the desk — your drafts and published pieces
/write/[id]           the studio — write prose, auto-annotate, refine, publish
/auth/callback        email-confirmation landing
```

The reader address carries an `@`. That can't be a folder name (`@` is Next's
parallel-route sigil), so the route is the root dynamic segment `app/[handle]`
and the `@` rides in the URL; the page strips a leading `@`. Literal folders
(`login`, `write`, …) win over the dynamic segment, so only genuinely unknown
single segments fall through to a handle lookup.

## The studio

`/write/[id]` is the old `/studio`, rewired. **Write** mode is the product:
prose in, the engine reads it into voices, the preview is the page. **Refine**
mode lets a writer argue with the machine line by line. Saving writes a row via
the server actions in `app/write/actions.ts`; `source` (the raw prose) and
`blocks` (what renders) are both stored, so a piece round-trips. Nothing is
destructive until **publish**.

## Gotchas

- **`lib/story-blocks.mjs` must stay free of node imports.** The studio runs it
  in the browser. Frontmatter *reading* (gray-matter) lives in
  `story-file.mjs`, used only by the seed script on the server.
- **`StoryRender` must never throw.** Auto-annotated stories are only `beat`
  and `hold`; the `raw` branch is best-effort for hand-tuned structure and
  degrades to a plain line rather than a blank page.
- **Voice and body classes belong on `.words`, never on `.beat`.** Move and
  gesture go on `.beat` — they choreograph the whole cell.
- **Nothing is ever parked at `opacity: 0` waiting on an observer.** The veil
  and arrival animations are applied by script, so a page with JS disabled
  still reads in full.
- **Doodles are point sets, not path data** (`components/doodles/registry.ts`).
  To add one, add points.
- **The seed store `content/stories/` is legacy input**, not the registry any
  more. `npm run seed` reads it once into the DB; the site never reads it.

## Layout

```
app/
  page.tsx              the feed
  [handle]/             writer page · [slug] reader
  login signup onboarding settings
  write/                page.tsx (desk) · [id] (studio) · actions.ts (writes)
  auth/                 actions.ts (auth) · callback (email confirm)
  globals.css
components/
  living/   Beat, voices, Scene, Hold, Margin, Marks, StoryFrame,
            StoryRender (blocks→UI), StoryView (reading shell)
  doodles/  the registry and the renderer
lib/
  vocabulary.ts   the four axes
  annotate.ts     prose → beats, the ratio
  story-blocks.mjs the block grammar (client-safe)
  story-file.mjs  frontmatter reader (seed only)
  db.ts           read-side queries (RLS-bound)
  types.ts        Profile, StoryRow, …
  supabase/       server, client, middleware
supabase/migrations/  the schema + RLS
scripts/seed.mjs      content/stories → DB
```

## Don't

- Don't add Tailwind or any CSS framework. The CSS is hand-written and the
  voices *are* the design system.
- Don't import an icon library or use stock SVGs for doodles.
- Don't enforce story privacy in application code — trust and extend the RLS
  policies. If a query could leak a draft, fix the policy.
- Don't use more than one accent colour in a story. Colour is narrative
  punctuation, set per story.
