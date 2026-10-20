# Living Page — Pre-Launch SEO Strategy

2026-09-19 · @Someone

## Rank like a publisher, not a directory

Living Page's SEO problem is closer to Substack's or Medium's than to a marketplace's or directory's. Nobody searches "best travel storytelling site" the way they search "best plumbers near me" — there is no category page to win. What actually ranks a publishing platform is the accumulation of individually-loved pages, each `/@handle/slug` story competing on its own long-tail query, plus a small number of hub pages (the homepage, the discovery surface) that earn links because they're worth linking to, not because they list things.

Two consequences follow. First, most of the SEO work is per-story hygiene the platform does automatically — clean metadata, structured data, stable URLs — so a writer never has to think about SEO, in keeping with the product's own "the writer never has to understand the art-direction system" principle. A directory optimizes its listing pages; a publisher optimizes its render pipeline. Second, growth is driven by inbound links and shares earned by the writing itself, plus writers linking their own page from elsewhere — Substack's own SEO guidance is blunt about this: ranking comes down to creator credibility and inbound links, not on-page tricks.

## Fix these before launch

Found by reading the actual repo (not hypothetical — these are live in the current build):

1. **`app/layout.tsx` still ships pre-repositioning copy.** The site-wide title/description is "The Living Page — A place for travel writing where the sentence decides how it looks, sounds and moves." That's what Google indexes for every page that doesn't override it — including the homepage, which sets no metadata of its own. This directly contradicts Decision D3 (general storytelling, travel as flagship example, not identity). Fix: rewrite the root metadata to the repositioned copy, and give `app/page.tsx` its own `generateMetadata`.
2. **No `metadataBase`.** Without it, Open Graph and canonical URLs resolve relatively instead of absolutely, which breaks social preview images and link previews in Slack, iMessage, WhatsApp, X.
3. **No `app/sitemap.ts` or `app/robots.ts` anywhere in the repo.** Nothing tells Google what to crawl or where a sitemap lives. Utility routes — `/dev`, `/dev/preview`, `/login`, `/signup`, `/onboarding`, `/settings`, `/make`, `/write`, `/write/[id]` — are all crawlable by default today and can get indexed as thin, duplicate, or dead-end pages that waste crawl budget and dilute the real story corpus.
4. **No structured data anywhere.** No Article/BlogPosting JSON-LD on story pages, no Person schema on author pages. This is free eligibility for rich results and is the machine-readable version of the "creator credibility" signal Substack names as its top ranking factor.
5. **Thin social metadata on the two pages that do set it.** `generateMetadata` on `/@handle/slug` and `/wander/s/[slug]` sets only `title` and `description` — no `openGraph`/`twitter` card, no canonical URL, no `article:published_time`/author. A shared story link renders as a bare text link almost everywhere instead of a preview card, which matters because preview quality drives the share-through that feeds the whole growth loop (see below).
6. **`/explore` permanently redirects to `/wander`.** Fine functionally, but make sure the sitemap and every internal link point straight at `/wander`, not through the redirect, so link equity isn't split.
7. **The writer's own page (`/@handle`) has no `generateMetadata` at all** — only `[handle]/[slug]` and `wander/s/[slug]` do. A person's own name page is exactly what "site:livingpage.com \[name\]" or a vanity search should surface well; it needs its own title/description built from the profile.

## Discovery architecture: canonical URLs, not category pages

- **`/@handle/slug` is the atomic ranking unit** — one permanent URL per story. Decision D4 (preserve data, never reset the DB, additive schema only) already guarantees stable URLs; treat a published slug as immutable for the same reason — a changed URL loses every link and query association it earned.
- **`/wander` (formerly `/explore`) is a hub, not a directory.** It should read as a curated, changing front page — closer to Medium's homepage or a Substack publication's own site — than a paginated list-of-everything. It still needs to be genuinely crawlable, meaning every published story should be reachable within 2–3 clicks of it; that's an internal-linking pass, not more listing pages.
- **Sample/seed stories stay out of the real corpus.** `lib/wander-samples`, addressed under `/wander/s/`, exist to make the homepage demo feel alive. The code already keeps them from posing as a real `@handle` — extend that boundary into the metadata layer with `robots: { index: false }` (or a `noindex` meta) so placeholder content never competes with real writers' work in search, and never dilutes topical focus.
- **Theme pages are a later, curated feature — not an auto-generated grid.** `lib/discover.ts`'s `themesOf()` already infers themes per story for the "read next" rabbit hole; that lexicon is a natural, low-effort source for a handful of hand-picked theme hubs later ("grief," "returning home"), consistent with D6's curated-not-literal-taxonomy rule. Resist turning it into one page per theme automatically — see Guardrails.
- **Author pages are a real profile, not a stub.** `/@handle` doubles as the "creator credibility" signal Substack's own guidance names directly as a ranking factor, and is exactly what Google's E-E-A-T model rewards: a consistent, identifiable author across pages.

## The actual growth loop

Substack's own official SEO guidance is unusually direct: ranking comes from creator credibility plus inbound links, and the fastest lever they name is getting linked from elsewhere — a personal site, a social bio, a guest post — not on-page tweaks ([Substack SEO guidance](https://support.substack.com/hc/en-us/articles/4407702258836-How-can-I-optimize-my-Substack-publication-for-SEO)). Medium's posts rank well because they inherit `medium.com`'s domain authority — but as the platform's own writers discover, that authority belongs to Medium, not the author, and most individual writers lack the curated-publication distribution that would let them borrow more of it ([Superblog's analysis](https://superblog.ai/medium-seo)).

The lesson for Living Page: every story gets its own permanent, ownable URL under the writer's own handle, so any link a story earns compounds for the platform's own domain rather than a third party's — the opposite of what happens to a writer publishing on Medium today.

The product's own core loop (home → write → publish → a reader feels something → "I want to make one") *is* the SEO loop, not a separate thing bolted onto it. A reader who lands on a story from search or a share, feels something, and goes and makes their own becomes both the next indexed page and — more valuably — the next person who drops a link to their own `/@handle/slug` into a bio, a group chat, an Instagram caption. So the highest-leverage pre-launch SEO lever isn't keyword work; it's making the artifact people want to send. Concretely, that means the Open Graph image quality named as a blocker above isn't a technical footnote — it's the thing that funds this exact loop: a rendered frame of the story's own hero moment, not a generic template card.

## Editorial and seed-content strategy

Travel is the flagship *example*, not the identity (D3) — and that's also the right pre-launch content strategy. A brand-new domain cannot win a page-one spot for a generic head term ("best travel blog"); it can win for a specific long-tail, feeling-specific phrase a real person types (a place name plus a feeling: "Gokarna solo trip diary," "quitting my job to travel journal"). Aim for a small number of genuinely excellent, *real* stories — published under real or founder handles, never labeled samples — each targeting one such phrase.

Follow a "one evergreen intent per story" rule: a story anchored to a specific place or moment keeps ranking for years, while anything hooked to news or a moment in time spikes and dies. This also matches the product's own definition of a good page (PRD §32) — specific, not generic.

The home hero — Phase 1's single live transformation demo (D5) — is itself the highest-traffic SEO asset the product will have at launch. It should be built from real story content, not placeholder copy, and carry the same metadata/Open Graph treatment as every other page, since it's what press coverage and early shares will link to and screenshot.

## Off-page authority for a brand-new domain

- **Founder and early-writer distribution beats a backlink campaign.** The fastest credible links for a new domain come from linking it in personal bios, social profiles, and communities the founder is already part of — not from outreach spray. This is the concrete version of "inbound links" in Substack's own guidance.
- **A handful of credible referring pages beats many weak ones** — one relevant newsletter mention, a writing-community post, a Product-Hunt-style launch — rather than volume plays.
- **Offer a canonical cross-post path for writers already on Medium or Substack.** Medium's own import tool forces the canonical back to the original, which is exactly why individual Medium writers never accumulate their own domain authority. A lightweight "republish here, canonical points to your Living Page URL" motion flips that: it captures the SEO value on Living Page's own domain instead of losing it, and gives an established writer a reason to try the product.
- **Design for the screenshot, not just the link.** With no stock photography and a distinctive hand-drawn/typographic identity (D2), a finished story is inherently more screenshot-and-repost-able than a generic blog post. Treat that as a real backlink/referral channel — a lightweight embeddable card is worth building for this reason alone, not just as a nicety.

## Structured data, E-E-A-T, and AI Overviews

- Add **Article/BlogPosting JSON-LD** to every `/@handle/slug` page (headline, `datePublished`, author, image) and **Person JSON-LD** on `/@handle`. This is the machine-readable form of the same "creator credibility" signal named above, and it's the format both classic rich results and AI-generated summaries parse most reliably.
- Google's current helpful-content stance rewards genuinely specific, first-person writing over generic optimized content — which is exactly what Living Page's positioning already produces (a personal, specific story, not an SEO-farmed listicle). The product's own quality bar (PRD §32: "visuals relate to the actual story, not generic aesthetics") is already an E-E-A-T asset; the risk is diluting it by chasing keyword volume with generic content.
- AI Overviews mainly compress generic informational queries ("how to pack for a two-week trip") — they don't compete well with Living Page's actual target queries, which are specific and personal ("what it felt like to leave home at 26"). A searcher on that kind of query is better served landing directly on a real first-person story than on a summarized overview. The strategic bet, in other words, is to lean further into long-tail, feeling-specific search intent rather than compete on head terms an AI Overview will absorb regardless.

## What not to do

- **Don't build category/tag directory pages just to catch search volume.** That's the content-side version of the "pile of effects, not art direction" failure the product's own decisions log (D6) already warns against for visuals — a thin, auto-generated grid of "12 world archetypes" or "20 motions" as landing pages would fail the same "one visual grammar per page" bar the writing has to meet.
- **Don't let seed/sample content get indexed as real work.** `/wander/s/*` exists to demo the product; letting it compete in search alongside real writers' stories hurts both trust and topical focus.
- **Don't chase head-term keywords** ("best storytelling app," "travel blog platform") pre-launch. A brand-new domain can't win those pages against Medium, Wattpad, or established travel blogs, and optimizing copy toward them pulls the homepage back toward the generic SaaS language D3 explicitly rejected.
- **Don't add an SEO-driven feed/listing homepage.** Already excluded by the product's own "do not build" list (a Medium-style feed as the homepage) — and it would be a weak SEO asset anyway: a feed page has no unique reason of its own to rank for anything.

## Phased rollout

**Phase 1 (now, alongside the scoped tickets):**

1. Rewrite `app/layout.tsx` metadata to the repositioned copy; give `app/page.tsx` its own `generateMetadata`.
2. Set `metadataBase`; add `openGraph`/`twitter` fields (plus canonical URL) to the existing `generateMetadata` on `/@handle/slug` and `/wander/s/[slug]`, and add one to `/@handle`.
3. Add `app/robots.ts` (disallow `/dev`, `/write`, `/make`, `/login`, `/signup`, `/onboarding`, `/settings`, `/auth`) and `app/sitemap.ts` (published stories + `/@handle` pages + `/wander`, excluding samples).
4. Add Article JSON-LD to the reader page and Person JSON-LD to the profile page.
5. Mark `/wander/s/*` sample stories `noindex`.

**Phase 2 (after the core loop ships, alongside the wider PRD §7/§8 choreography):** 6. Curated theme hub pages built on `lib/discover.ts`'s existing theme lexicon — hand-picked per D6, not auto-generated. 7. Cross-post/canonical-import tooling for writers coming from Medium or Substack. 8. A shareable embed/screenshot card for finished stories.

## First 90 days: what to track

| Metric | What it tells you |
| --- | --- |
| Indexed pages vs. published stories (Search Console coverage) | Whether every real story is getting indexed, and whether sample or utility pages are leaking into the index |
| Referring domains to any `/@handle/*` URL | The real Substack-style growth-loop signal — more meaningful pre-scale than raw impressions |
| Share-through on story links (Open Graph card render → click) | Whether the metadata fix and growth loop above are actually converting shares into visits |
| Search Console query report | Whether stories are in fact found for long-tail, feeling-specific phrases, or whether the content bet needs adjusting |
| Rich-result eligibility (Search Console's structured data report) | Whether the Article/Person JSON-LD is valid and being parsed |

## Sources

- [Substack: How can I optimize my publication for SEO?](https://support.substack.com/hc/en-us/articles/4407702258836-How-can-I-optimize-my-Substack-publication-for-SEO)
- [Superblog: Medium SEO — why your articles aren't ranking](https://superblog.ai/medium-seo)
