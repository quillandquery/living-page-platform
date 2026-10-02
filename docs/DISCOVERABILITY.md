# Discoverability — what's built, how to maintain it, how to write a findable story

This is the single place that describes the whole discoverability layer —
how a page gets found by a search engine or an AI system, end to end —
rather than leaving that spread across code comments in a dozen files. It
covers what already existed going into this work (most of it: see "What was
already here" below), what this pass added, and the one real gap that
remains (per-story overrides needed a place to live; see "SEO overrides").

The owner's own handle, **@reshikaa30**, is this layer's proof of concept —
everything below is author-generic (works identically for any writer's
handle) and is validated against her real published stories, not a special
code path built just for her. The one place her handle is actually named in
code is `lib/site.ts`'s `OWNER_HANDLE` constant, used by `scripts/seo-
audit.mjs`'s summary line and by `public/llms.txt`'s "Start here" section —
nowhere in the metadata/sitemap/JSON-LD pipeline itself.

## What was already here

A prior pass (`Living Page — Pre-Launch SEO Strategy.md`, 2026-09-19, and the
2026-09-22 audit under `docs/seo-audits/`) already built most of the
machinery this task asked for:

- `lib/story-context.ts` — deterministic, local, no-LLM derivation of a
  title, an *extractive* summary (the story's own sentences, never generated
  prose, capped ~170–220 chars), environment, themes and tone from a story's
  own words. This is what makes every story — published in 2026 or next
  year — discoverable with **zero manual backfill**: there is no "legacy
  story" code path anywhere in this layer.
- `lib/metadata.ts` / `lib/structured-data.ts` / `lib/site.ts` — one shared
  builder each for Next's Metadata API output, JSON-LD, and the site's own
  canonical origin, so a story page and an author page can never quietly
  drift into two different ideas of what their own title or canonical URL
  is.
- `app/sitemap.ts`, `app/robots.ts`, `public/llms.txt` — dynamic sitemap from
  `status = 'published'` rows (RLS-enforced, not an app-code check), a
  robots policy that allows crawling (including AI crawlers — GPTBot,
  ClaudeBot, PerplexityBot, etc. are not singled out or blocked; see
  "AI-crawler policy" below) and points at the sitemap, and a hand-written
  `llms.txt` already deployed at `public/llms.txt` (not 404ing — that was a
  real bug in an earlier draft, fixed before this pass started).
- Article/BlogPosting + Person JSON-LD on every story and author page,
  WebSite/Organization JSON-LD on the homepage, full SSR (confirmed by
  reading `components/living/StoryRender.tsx` / `StoryFrame.tsx` / format
  components: no `IntersectionObserver`-gated text, no
  `dangerouslySetInnerHTML`, exactly one `<h1>` per page across every
  format), security headers, and an `/about` page carrying a plain,
  crawlable "what is Living Page" sentence.

Read `docs/seo-audits/2026-09-22/FULL-AUDIT-REPORT.md` for the full picture
of what existed and why each piece is there — this file doesn't repeat that
reasoning, only what changed on top of it.

## What this pass added

1. **Optional per-story SEO overrides** (migration `0004_seo_overrides.sql`
   — additive, nullable `seo_title`, `seo_description`, and `tags text[]`
   on `stories`). WR-6 shipped publish with none of these on purpose; every
   story has been fully discoverable anyway via auto-derivation. These
   three columns exist only so a writer can *correct* a derived title or
   description when they want different words — never a required publish
   field, never gating anything. `lib/story-seo.ts`'s `resolveStorySeo()` is
   the one place that layers "non-empty override wins, else the derived
   value" — `app/[handle]/[slug]/page.tsx`'s metadata, its JSON-LD, and
   `/llms-full.txt` all call it, so they can never disagree. A small,
   closed "SEO (optional)" drawer inside the editor's existing "Details &
   shaping" section (`app/write/[id]/editor.tsx`) is the only UI for it.
2. **BreadcrumbList JSON-LD** on every story page (Home → the writer's page
   → the story) and a **ProfilePage** wrapping the existing Person entity on
   `/@handle` (`lib/structured-data.ts`'s `breadcrumbJsonLd()` /
   `profilePageJsonLd()`) — both were listed in the task brief and didn't
   exist yet.
3. **Fixed two real "doorway page" gaps** the 2026-09-22 audit had already
   found but not yet closed: every bio-less author's meta description was
   the byte-identical string `"A Living Page author profile."` across every
   profile (`lib/author-seo.ts`'s `deriveAuthorDescription()` now builds a
   real, per-author sentence from their own story count and most recent
   story instead), and the avatar `<img>`'s `alt=""` (now
   `` `${name}'s photo` `` — dormant until an author sets `avatar_url`, but
   correct now rather than later).
4. **Lengthened `/wander`'s meta description** from 47 to ~145 characters
   (audit action-plan item 7) — the original line kept verbatim as the
   opening clause, extended rather than replaced, per the audit's own "same
   voice" instruction.
5. **`/llms-full.txt`** (`app/llms-full.txt/route.ts`) — a dynamically
   generated, author-generic index of **every** published story (title,
   author, canonical URL, the same extractive summary the page itself
   uses), regenerated on each request (`revalidate = 3600`). This is the
   actual "zero manual backfill, full corpus coverage" mechanism the task
   asked for: `public/llms.txt` stays a short, hand-curated map (adding one
   "Start here" section pointing at `@reshikaa30` as a worked example, plus
   a link to this new route) rather than being turned into a giant
   auto-generated file itself.
6. **`scripts/seo-audit.ts`** (run as `npm run seo:audit`) — see below.

## Running the coverage audit

```
npm run seo:audit
```

Connects to the **real** Supabase project (`NEXT_PUBLIC_SUPABASE_URL` +
ideally `SUPABASE_SERVICE_ROLE_KEY`, read from `.env.local` the same way
`scripts/seed.mjs` already does), reads every `status = 'published'` story
and every author with at least one, and runs each through the *exact same*
`lib/story-context.ts` → `lib/story-seo.ts` → `lib/metadata.ts` /
`lib/structured-data.ts` pipeline the live pages use — never a
reimplemented second guess at the logic. It asserts a resolving canonical, a
non-empty title/description within a sane length band, that the JSON-LD
builders don't throw and carry their required fields, and that the story has
real text to render. It also prints how many drafts exist per author
(informational only — an unpublished story is an author decision, "publish
it," never a code gap) and a one-line summary for the POC handle,
`@reshikaa30`.

**This sandbox could not run it against the live database** — outbound
requests to `*.supabase.co` are blocked by the same egress policy the
2026-09-22 audit already hit against `livingpage.one` and `googleapis.com`.
The script itself was verified instead by running its exact derivation
chain (`deriveStoryContext` → `resolveStorySeo` → `buildStoryMetadata` /
`articleJsonLd` / `breadcrumbJsonLd` / `profilePageJsonLd`) against fixture
rows covering a normal story, a story with an override, and a maximally
empty one — all produced non-empty, valid output. Run `npm run seo:audit`
for real from a machine or CI job with normal network access to confirm the
live corpus; nothing about the script requires the sandbox this was built
in specifically.

## AI-crawler policy

`app/robots.ts` currently allows every crawler, undifferentiated — including
full-corpus training bots (GPTBot, Google-Extended, CCBot, Bytespider) and
on-demand/citation bots (OAI-SearchBot, ClaudeBot, PerplexityBot) alike.
That's a deliberate non-decision carried over from the 2026-09-22 audit (its
action-plan item 11): splitting those two categories is a product/legal
call about whether writers' words should train models, not an SEO default,
and it wasn't this task's call to make unilaterally. The rule object in
`app/robots.ts` is the one editable spot if/when that call gets made.

## Known, deliberately out-of-scope items

Carried over from the 2026-09-22 audit's P2/P3 list, still real but not part
of this task's brief (author-page + story discoverability specifically):
story/reader routes not hitting CDN cache (likely the session-refresh
middleware forcing dynamic rendering — `middleware.ts`'s matcher), no
`app/manifest.ts`, no IndexNow support, no real `sameAs` links (correctly
withheld — no fabricated social profiles). None of these block crawling,
indexing, or rendering today.

## Writing a findable story (for any author)

Living Page never asks a writer to think in keywords, and this doesn't
change that — Auto already gives every story a real title, description, and
structured data the moment it's published. These are just the things that
make Auto's job easier, in plain terms:

- **Your opening line carries more weight than you'd think.** It's often
  what becomes both the page's hook and the first candidate sentence for
  its search description — a concrete, specific opening ("the 6:40 out of
  the city I said I'd never leave") gives Auto more to work with than an
  abstract one ("I've been thinking about change lately").
- **A real place or time, even a vague one, helps.** "the 6:40 platform" or
  "that August" both register as a concrete anchor; leaving both blank
  doesn't break anything, but it does mean less for a reader skimming a
  search result to recognize.
- **One genuine summary sentence, if you want to write it.** The new
  optional "SEO" drawer in the editor is for exactly this: if Auto's
  extracted description doesn't read the way you'd describe your own story
  to a friend, write one line that does — it's never required, and leaving
  it blank is just as correct.
- **This doesn't mean write for search instead of for the story.** The
  whole premise ("animate the meaning," not decorate it) still applies
  here: a specific, honest story written for a reader is also the one that
  reads best to a crawler or an AI summarizer — the product's own quality
  bar (PRD §32) and a findable page are the same bar, not two different
  ones to satisfy.
