# Living Page — SEO / AEO / GEO Action Plan

Companion to `FULL-AUDIT-REPORT.md` (2026-09-22). Ordered by impact ÷ effort — do the P0 group first; it's four small, concrete fixes that resolve the audit's most consequential findings, including the one that directly affects GEO/AEO.

## P0 — Do first (quick fixes, real bugs, high impact)

1. **Deploy `llms.txt` — it currently 404s.** Move `llms.txt` from the repo root into `public/llms.txt` (or add `app/llms.txt/route.ts` returning it as `text/plain`). While there, update its internal links from `https://livingpage.one/...` to `https://www.livingpage.one/...` to match the live canonical host. *Why first:* this is the single highest-leverage GEO/AEO fix in the audit — the file is already well-written (~90/100 by the toolkit's own scoring) and just isn't reaching anyone. Files: `llms.txt` → `public/llms.txt`.

2. **Fix broken Google Analytics.** `app/layout.tsx` (Server Component) imports `GA_MEASUREMENT_ID` from a `"use client"` module (`lib/analytics/ga.ts`), which Next.js serializes as an error-throwing stub — GA has never received a real measurement ID in production, and it throws a JS error on every page load. Read `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` directly in `app/layout.tsx`, or move the `<Script>` tags into their own small client component. Files: `app/layout.tsx`, `lib/analytics/ga.ts`.

3. **Add baseline security headers.** Add a `headers()` function to `next.config.mjs`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, a baseline `Content-Security-Policy`, and extend HSTS to `max-age=63072000; includeSubDomains; preload`. Also set `poweredByHeader: false` to stop leaking `X-Powered-By: Next.js`. Files: `next.config.mjs`.

4. **Add root-level `WebSite` + `Organization` JSON-LD on the homepage.** Currently zero — the only `Organization` markup is nested inside each story's `publisher` field, invisible to entity extraction. This matters more than usual right now: WebSearch confirmed real name collisions with other "Living Page" entities online, including a competing product (`livingpage.app`) with an almost identical name and pitch. Ready templates exist in the Agentic SEO Skill toolkit's `resources/schema/templates.json`. Files: `app/layout.tsx` or `app/page.tsx`, new builder in `lib/structured-data.ts` following the existing `articleJsonLd()`/`personJsonLd()` pattern.

## P1 — High value, moderate effort

5. **Fix duplicate author meta descriptions.** `app/[handle]/page.tsx` falls back to the literal string `"A Living Page author profile."` for every bio-less author — confirmed byte-identical across both live authors today. Derive a real per-author fallback (story count, handle, most recent story's place/title) instead.

6. **Cap story description length.** `lib/story-context.ts`'s `deriveSummary()` has no upper bound — live samples ranged 50 to 211+ characters, with the 211-char one truncating mid-clause in search results. Cap at ~155–160 chars, trimming to the last complete sentence/clause (keep the "extract, never invent" rule).

7. **Lengthen the `/wander` meta description.** Currently 47 characters ("You don't have to know what you're looking for.") vs. the ~120–160 target; Google will likely discard and auto-generate instead. Extend in the same voice.

8. **Add one plain, crawlable "what is Living Page" sentence on an indexable page.** Don't touch the locked homepage hero (`docs/COPY.md`) — add it to the footer or a future `/about`, reusing `llms.txt`'s own definitional wording so both stay consistent. This is the same fix for both the AEO snippet opportunity and the GEO citability gap identified in the audit.

9. **Add a lightweight `/about` (or expand the footer) with real trust signals.** Who runs Living Page, why, how to contact — addresses the E-E-A-T Trustworthiness gap (Dec 2025+ guidance applies this to all competitive queries now, not just YMYL) without touching the product's intentionally minimal homepage.

## P2 — Worth doing, not urgent

10. **Investigate why story/reader routes never hit CDN cache** (`x-vercel-cache: MISS` on every request, vs. the homepage's `HIT`) — likely the session-refresh middleware forcing dynamic rendering on public routes. Either scope the middleware matcher away from reader routes, or opt story pages into ISR (`export const revalidate = <n>`, same pattern as `app/sitemap.ts`).

11. **Make a deliberate call on AI-crawler policy** — right now `robots.txt`'s wildcard allows everything including full-corpus training bots (GPTBot, Google-Extended, CCBot, Bytespider) with no considered position, which sits a little oddly next to `llms.txt`'s own "writers retain authorship" stance. This is a product/legal decision, not an SEO default — flagged for awareness, not urgent.

12. **Fix the avatar `<img>`'s empty alt text before it matters.** `app/[handle]/page.tsx`: `alt=""` on what would be a real author photo — currently dormant (no author has `avatar_url` set yet) but fix now while it's a one-line change. Consider `next/image` at the same time.

13. **Add `app/manifest.ts`** (site name, theme color, and the icon sizes the existing `app/icon.tsx`/`app/apple-icon.tsx` already generate) for PWA/"Add to Home Screen" completeness — no `public/` directory or manifest exists today.

14. **Add IndexNow support** — low-effort Bing/Yandex indexing win, not implemented anywhere currently.

15. **Wire real `sameAs` links into the new Organization schema (item 4) once real social profiles exist.** Correctly withheld today (no fabricated links) — revisit the moment there's a real X/LinkedIn/GitHub presence to point at.

## P3 — Monitor / manual follow-up (can't be done from this sandbox)

16. **Run a real PageSpeed Insights check**: https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fwww.livingpage.one%2F from a normal browser outside this environment (Google's API is network-blocked here). Grade against `resources/references/cwv-thresholds.md` in the SEO skill toolkit. If story-page LCP/INP look weak, item 10 above is the likely lever.

17. **Confirm Google Search Console sitemap submission** — status unknown from here (no GSC access); a prior internal audit flagged this as an open to-do.

18. **Re-check `site:livingpage.one` indexing in 1–2 weeks.** Currently shows nothing — expected for a domain this new, not a defect, but worth confirming it starts appearing.

---

## What's already solid (no action needed)

Host/canonical consistency, robots.txt/sitemap correctness, full server-side rendering with no JS-gated content, complete and accurate BlogPosting/Person JSON-LD (image field genuinely populated — a prior gap, now fixed), correct `noindex` on all sample/demo stories, exactly one correct `<h1>` per page across every story format (a prior audit's h1 gap is now fixed everywhere), no deprecated or restricted schema types, JSON-LD only with zero Microdata/RDFa, all OG/icon image routes rendering correctly at the right dimensions, zero orphan pages (every real story is 0–1 click from `/wander`), no programmatic-SEO risk (nothing auto-generated at scale), and decorative SVG art consistently marked `aria-hidden`. This is a strong base to build the fixes above on top of.
