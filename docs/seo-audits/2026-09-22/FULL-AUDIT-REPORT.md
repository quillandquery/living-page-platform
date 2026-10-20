# Living Page — Full SEO / AEO / GEO Audit

**Date:** 2026-09-22 · **Site audited:** https://www.livingpage.one (canonical host; `livingpage.one` redirects here) · **Method:** Agentic SEO Skill, LLM-first, 4 parallel specialist passes (Technical, Content/Schema, GEO/AEO, Images/Architecture) · **Sampled pages:** homepage, `/wander`, `/@reshikaa30`, `/@headinclouds`, `/@reshikaa30/paris`, `/@reshikaa30/bali`, `/@headinclouds/taiwanese-fairies`, `/wander/s/chargers` (sample/demo)

## Environment note (read this first)

Direct outbound HTTP requests to `livingpage.one` from this sandbox's Bash tool and from the linked computer's shell were **blocked by organization egress policy** (confirmed repeatedly — `403 from proxy` / `CONNECT tunnel failed`), so the skill's own network-fetch scripts (`fetch_page.py`, `robots_checker.py`, `pagespeed.py`, `security_headers.py`, `broken_links.py`, `redirect_checker.py`, etc.) could not run against the live URL. Evidence in this report instead comes from three channels that **do** reach the live internet: the `WebFetch` tool, a real Chrome browser on the user's own computer (navigation, DOM inspection, network-header capture), and web search — cross-checked against the actual Next.js source code as ground truth. Two specific gaps from this: real Core Web Vitals (Google PageSpeed/CrUX) could not be measured, and exact redirect status codes (301 vs 308) could not be captured. Both are called out again below with a recommended manual follow-up.

## Overall score: 44 / 100 — Poor (solid engineering foundation, held back by a handful of concrete, fixable gaps)

| Category | Weight | Score | Weighted |
|---|---|---|---|
| Technical SEO | 25% | 36 | 9.0 |
| Content Quality | 20% | 25 | 5.0 |
| On-Page SEO (titles/meta/headings) | 15% | 58 | 8.7 |
| Schema / Structured Data | 15% | 35 | 5.25 |
| Performance / Core Web Vitals | 10% | 55* | 5.5 |
| Image Optimization | 10% | 78 | 7.8 |
| AI Search Readiness (GEO) | 5% | 54 | 2.7 |
| **Total** | **100%** | | **≈ 44** |

\*Performance score is a low-confidence estimate from lab timings only (TTFB ~34ms, FCP ~148ms on the homepage — excellent; DCL ~2.8s on a story page — slower) — **not** real-user Core Web Vitals. Run https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fwww.livingpage.one%2F from a normal browser (outside this sandbox) for authoritative LCP/INP/CLS numbers.

**AEO (Answer Engine Optimization) score: 28 / 100** — reported separately, not blended into the weighted total above (the skill's default scoring table doesn't include AEO as a weighted category). This score is *appropriately* low: most classic AEO tactics don't apply to a narrative storytelling product, and the one real opportunity (a definitional "what is Living Page" snippet) is unaddressed. See the GEO/AEO section below.

**Zero 🔴 Critical findings.** Every issue found is a genuine, fixable gap — nothing here is currently blocking crawling, indexing, or rendering. The one item that comes closest to critical (an AI-crawler-facing file that 404s) is filed as a top-priority Warning because it directly undercuts the GEO/AEO work already done for this site.

---

## 1. Technical SEO (25% weight) — Score: 36/100

### ⚠️ Warnings

**Google Analytics is broken sitewide — a real, reproducible bug, not an SEO issue per se.**
`lib/analytics/ga.ts` is a `"use client"` module exporting `GA_MEASUREMENT_ID` from `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID`. `app/layout.tsx` is a **Server Component** that imports this client-module value directly into its JSX. Next.js serializes that cross-boundary import as an error-throwing stub instead of the real string — confirmed live: the rendered `<link rel="preload" href="https://www.googletagmanager.com/gtag/js?id=function(){throw Error(...)}">`, and a reproducible `Uncaught SyntaxError` fires on every single page load (home + story pages). **Result: no GA data has been collecting in production.** *Fix:* read `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` directly in `app/layout.tsx` (a plain env read, not a cross-boundary import), or move the `<Script>` tags into their own small client component. Confidence: Confirmed.

**No security headers beyond Vercel's default (partial) HSTS.**
Live responses show only `strict-transport-security: max-age=63072000` (missing `includeSubDomains`/`preload`). No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` anywhere — `next.config.mjs` has no `headers()` block at all. `X-Powered-By: Next.js` also leaks stack info by default. *Fix:* add a `headers()` function to `next.config.mjs`; set `poweredByHeader: false`. Confidence: Confirmed.

**`llms.txt` is written but never actually deployed — 404 in production.**
`llms.txt` exists at repo root with real, well-written content, but the repo has **no `public/` directory** and no `app/llms.txt/route.ts` handler. Live `GET https://www.livingpage.one/llms.txt` → **404**, falling through to the dynamic `[handle]` route (it's interpreted as a handle lookup). This means the whole AI-crawler-facing file this team already wrote is currently invisible to every crawler. It also resolves the www/non-www question moot for now — but the file's own links use `livingpage.one` (no www) while everything else on the site resolves to `www.livingpage.one`, so fix both at once. *Fix:* move `llms.txt` into `public/llms.txt` (Next serves `public/` at root automatically), or add `app/llms.txt/route.ts`; update its internal links to the `www` host. Confidence: Confirmed. **This is the single highest-priority fix in this whole audit** — it's a quick fix that directly restores value the team already built and the user specifically asked about (GEO/AEO).

**Story/reader routes are fully dynamic — no CDN/ISR caching, unlike the homepage.**
Homepage: `cache-control: public, max-age=0, must-revalidate`, `x-vercel-cache: HIT`. Story pages and `/wander/s/*`: `cache-control: private, no-cache, no-store`, `x-vercel-cache: MISS` on every request. `middleware.ts`'s matcher runs Supabase session-refresh logic on these routes too, which is the likely (not fully confirmed) cause of forced dynamic rendering. Not a crawl/index blocker today (TTFB is still fast), but a real scalability/consistency gap. *Fix:* scope the session-refresh middleware away from purely-public reader routes, or opt story pages into ISR (`export const revalidate = <n>`, the same pattern `app/sitemap.ts` already uses). Confidence: Confirmed (headers) / Likely (root cause).

### ✅ Confirmed solid

- **Host/canonical consistency, live:** `http://livingpage.one`, `https://livingpage.one`, and `http://www.livingpage.one` all single-hop to `https://www.livingpage.one`, matching the self-referencing canonical, `robots.txt`, and `sitemap.xml` — no duplicate-content risk between hosts. (Exact redirect status code, 301 vs 308, could not be captured in this environment — browser `fetch()` hides it even same-origin.)
- **robots.txt** live output matches `app/robots.ts` exactly; sane disallow list (`/dev`, `/write`, `/make`, `/login`, `/signup`, `/onboarding`, `/settings`, `/auth`, `/looks`, `/preview-tile`, `/render`); correct `Sitemap:` pointer.
- **sitemap.xml**: exactly 12 URLs (2 hubs, 2 authors, 8 stories), valid ISO-8601 `lastmod`, sensible priority tiers, `/explore` correctly omitted (it permanent-redirects to `/wander`, avoiding split link equity). All spot-checked URLs return the correct status (200 real / 404 fake handle — no soft-404s).
- **No JS-render dependency**: raw pre-hydration HTML for story pages contains full story text, complete JSON-LD, canonical, and viewport meta — nothing is client-JS-injected, confirming CLAUDE.md's SSR claim.
- **Sample/demo pages correctly `noindex`**: `/wander/s/chargers` server-renders `<meta name="robots" content="noindex, follow">`.
- **Mobile rendering**: no overlap/cutoff/horizontal-scroll on 375×812 screenshots of homepage and a story page.
- **Brotli compression** on all tested HTML/XML responses. **TTFB ~33–34ms** (lab measurement, single session).
- **AI crawlers are not blocked** — the wildcard `Allow: /` covers GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, Bytespider, CCBot, etc. (see GEO section for whether that's the *optimal* policy, not just a non-blocking one).

---

## 2. Content Quality (20%) — Score: 25/100 · On-Page SEO (15%) — Score: 58/100

### ⚠️ Warnings

**Author-page meta descriptions are a hardcoded, identical string across every author with no bio.** `app/[handle]/page.tsx`: `author.bio?.trim() || "A Living Page author profile."` — confirmed live, byte-identical on both sampled authors (`@reshikaa30`, `@headinclouds`). As the platform grows this becomes a template-string pattern across every profile — the same "doorway page" shape the skill's own quality gates warn about. *Fix:* derive a real per-author fallback (story count, handle, latest story's place/title) instead of one static sentence, matching the "extractive, not generic" discipline `lib/story-context.ts` already applies to stories.

**`/wander`'s meta description is far too short.** Live: `"You don't have to know what you're looking for."` — 47 characters vs. the ~120–160 target; Google will likely discard it and auto-generate a snippet instead. *Fix:* extend in the same voice.

**Story descriptions have no length ceiling — 50 to 211+ characters seen across 4 samples.** `/@reshikaa30/paris`'s description runs 211 characters and gets cut off mid-clause; `/@reshikaa30/bali`'s runs only 50. `lib/story-context.ts`'s `deriveSummary()` extracts real writer text (correct, on-brand) but has no upper bound. *Fix:* cap at ~155–160 chars, trimming to the last complete sentence/clause, keeping the "never invent, only extract" rule intact.

**No platform trust/About surface exists.** `/about` → 404 live. Homepage body copy is ~150–180 words by design (CLAUDE.md: "the interface disappears," homepage "is the product demo," not a blog) — that's a deliberate, correct product choice and this audit is **not** recommending padding the homepage. But per current (Dec 2025+) E-E-A-T guidance, *some* page stating who runs the site, why, and how to contact them matters for trust signals across all competitive queries now, not just YMYL. *Fix:* a lightweight `/about` or footer expansion — doesn't have to touch the locked hero.

### ✅ Confirmed solid

- **Single, correct `<h1>` per page, matching the JSON-LD `headline`, across every page type and every story format sampled** (including the ones a prior internal audit flagged as missing h1 — Ransom, Marquee, Letter, Ticket, Postcard — all confirmed fixed now).
- **Story titles are the writer's own words, verbatim, never rewritten into "SEO language"** — a deliberate, on-brand trade-off (these will rank on long-tail/brand/exact-phrase matches, not travel head terms — worth knowing, not worth "fixing").
- **Visible bylines and publish/update dates render to readers**, not just in JSON-LD (e.g. "by resh," published + modified dates shown on-page).
- **OG/Twitter cards complete and correct** on every page type checked, real 1200×630 images.
- **Sample stories correctly excluded and `noindex`ed** — no duplicate-content risk from demo content.

---

## 3. Schema / Structured Data (15%) — Score: 35/100

### ⚠️ Warnings

**No standalone `WebSite` or `Organization` entity anywhere on the site.** The only `Organization` markup is nested inside each story's `BlogPosting.publisher` (name + url only, no `logo`) — invisible to entity-graph extraction, which generally only recognizes root-level nodes. The homepage itself ships **zero** JSON-LD of any kind. *Fix:* add one root-level `WebSite` + `Organization` JSON-LD block on the homepage (`app/layout.tsx` or `app/page.tsx`) — ready templates exist in the skill toolkit's `resources/schema/templates.json`. **This matters more than usual right now** — see the GEO section: there are confirmed real name-collisions with other "Living Page" entities on the open web, and this schema is the concrete fix.

### ✅ Confirmed solid

- **BlogPosting (story) and Person (author) schema are valid, active types**, correctly built from real row data via one shared builder (`lib/structured-data.ts`) so a story and an author page can never drift into two different ideas of what a Person or Article looks like.
- **The `image` field is genuinely populated** on story JSON-LD — a prior audit flagged this as missing; confirmed fixed (`"image":["https://www.livingpage.one/@reshikaa30/paris/opengraph-image"]`, pulled directly from the live DOM).
- **JSON-LD only, zero Microdata/RDFa** anywhere in the codebase (`itemscope`/`itemprop`: 0 matches).
- **No deprecated or restricted schema types**: no `FAQPage` (restricted to gov/healthcare since Aug 2023), no `HowTo` (deprecated Sept 2023) — correctly absent.
- **XSS-safe JSON-LD escaping** via a shared `jsonLdScriptProps()` helper.
- **Note:** WebFetch's HTML→Markdown conversion silently strips `<script type="application/ld+json">` tags, so a naive WebFetch-only check would have wrongly reported "no JSON-LD" — this audit verified schema directly in the live DOM/source to avoid that false negative.

---

## 4. Performance / Core Web Vitals (10%) — Score: ~55/100 (low confidence, see caveat)

Real PageSpeed Insights / CrUX data could not be obtained — `googleapis.com` is blocked by the same org egress policy as the live site. Lab-only measurements from a single warm Chrome session: homepage TTFB ~34ms, FCP ~148ms (excellent); a story page's DOMContentLoaded/load were ~2.8–2.9s (slower, though this is a lab number on one machine, not field data). **Action: run https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fwww.livingpage.one%2F yourself** (outside this sandbox) and grade against `resources/references/cwv-thresholds.md` in the SEO skill toolkit (LCP good ≤2.5s, INP good ≤200ms, CLS good ≤0.1). The dynamic-rendering finding in the Technical section above (story pages never hit CDN cache) is the most likely lever if real CWV numbers come back weak on story pages specifically.

---

## 5. Image Optimization (10%) — Score: 78/100

Living Page is intentionally non-photographic (hand-drawn SVG doodles + typography + generated OG images, per product decision D2) — so this category has a genuinely small surface area, and that's correctly reflected in the good score.

### ⚠️ Warnings (both currently dormant — zero live pages affected)

- The one real raster `<img>` in the codebase — the author avatar (`app/[handle]/page.tsx`) — has `alt=""` (empty) rather than descriptive alt text, and bypasses `next/image`. **Confirmed dormant:** neither sampled author currently has `avatar_url` set, so this affects zero live pages today — but fix it before it matters. *Fix:* `alt={`${name}'s photo`}`, conditioned on `avatar_url` being present.
- A disabled "media"/photo story-block type (`components/living/StoryRender.tsx`) has no width/height/CLS protection — but it's dead code (`return null` before render), so no action needed unless it's re-enabled later.

### ✅ Confirmed solid

- All 5 image-generating routes (root OG, per-story OG, wander OG, icon, apple-icon) return live 200s at correct dimensions; homepage OG image is a lean ~34KB PNG at 1200×630.
- Every decorative SVG/doodle across 15 components consistently carries `aria-hidden="true"`.
- No `public/` dir / no web manifest — informational, not an image defect; the dynamic icon routes already cover the two real needs (favicon, iOS home-screen icon).

---

## 6. GEO — AI Search Readiness (5% weight in the standard scoring table, but see below) — Score: 54/100

**Given real weight in this audit** because the user specifically asked for extensive GEO/AEO coverage, even though the skill's default full-audit weighting only assigns it 5%.

### ⚠️ Warnings

**Confirmed real name collisions with other "Living Page" entities on the open web.** WebSearch for the product name returned zero results for the actual platform and instead surfaced: *The Living Page* (a well-known Charlotte Mason homeschooling book, multiple hits), `thelivingpage.me` (an unrelated blog), a "Living Pages" YouTube channel, and — most pointedly — **`livingpage.app`, a competing product with an almost identical name and a similar one-line pitch** ("turn any PDF into a living page"). Without a disambiguating entity graph, an AI system has no structured way to tell these apart. This is the concrete reason the missing `WebSite`/`Organization` schema (Section 3) matters more than it would on a more uniquely-named site.

**The one clean, citable "Living Page is..." definition lives only in `llms.txt` — which is currently 404 (see Section 1) — and nowhere in crawlable page HTML.** The homepage's actual rendered copy is deliberately evocative ("You have a story. It shouldn't look like a blog post"), which is exactly right for a human visitor but not a literal definition an extraction system pattern-matches on. *Fix (once llms.txt is redeployed):* add one plain, crawlable sentence somewhere indexable (footer, or a future `/about`) reusing `llms.txt`'s own wording — not touching the locked hero.

**AI crawler policy is an undifferentiated wildcard.** `robots.txt`'s single `Allow: /` doesn't distinguish training-corpus crawlers (GPTBot, Google-Extended, CCBot, Bytespider) from on-demand retrieval/citation crawlers (OAI-SearchBot, ClaudeBot, PerplexityBot, ChatGPT-User) — current (2026) practice treats this as an unexamined default rather than a neutral choice, though it doesn't currently hurt AI-search visibility (everything is allowed, including the retrieval bots that drive citations). This sits in some tension with `llms.txt`'s own stated position that writers "retain authorship." *Fix:* a considered product/legal decision, not an SEO default — not urgent.

**`llms.txt` uses the non-www host throughout** while everything else resolves to `www.livingpage.one` — fix alongside the deploy fix in Section 1.

### ✅ Confirmed solid

- **Once actually deployed, `llms.txt`'s content itself is strong** — hand-scored against the skill toolkit's own `llms_txt_checker.py` logic: title present, description via blockquote >50 chars, 3 clear sections, 3 markdown links, content length >200 chars → **~90/100**. Better-organized than most sites in this category bother to produce at all. (Minor: 2+ more links would cross the checker's bonus thresholds.)
- **Full server-side rendering, no JS-gated content** — confirmed via WebFetch on homepage and a story page.
- **Story JSON-LD matches what `llms.txt` promises**: real author, real dates, real image, nothing fabricated.
- **`sameAs` links are correctly withheld today** (repo comment: "no invented `sameAs` links, no invented ratings") rather than fabricated — the right call for an early-stage product with no real social profiles yet. Wire them in once real profiles exist.
- **robots.txt doesn't block any AI crawler** — GPTBot, ClaudeBot, PerplexityBot, etc. all currently permitted.

---

## 7. AEO — Answer Engine Optimization — Score: 28/100 (not part of the weighted total)

This score is appropriately low largely *by design*, not by neglect:

- Living Page is a narrative storytelling product, not an informational/how-to site — classic AEO tactics (FAQ schema, step-by-step HowTo content, question-phrased headings) genuinely don't fit, and per the skill's own rules, FAQPage schema is restricted to government/healthcare sites and HowTo is fully deprecated. **Correctly, neither is implemented anywhere.** Don't add them.
- The one real, applicable AEO opportunity — winning a definition-style snippet/AI-Overview citation for "what is Living Page" — is currently unaddressed, because (a) `llms.txt` 404s and (b) no page carries a literal definitional sentence. This is the same fix as the GEO citability finding above; fixing it once helps both.
- No `sameAs`/Knowledge Panel signals yet — expected for a brand-new product (see GEO section), not a current defect.
- **Current visibility is effectively zero** in both plain search (`site:livingpage.one` → no relevant results) and, by extension, AI answer engines — expected and normal for a domain this new; not evidence of a technical problem.

### What an AI answer engine would currently understand about Living Page

If a system fetches `llms.txt` directly, it gets a clean, honest, well-organized explanation of what Living Page is and how to attribute its content — but a shrinking-yet-still-partial share of crawlers actually request that file, and right now it 404s anyway. If the same system instead crawls normally — following links, reading rendered HTML, parsing JSON-LD — the picture is thinner: no root-level entity schema, no literal on-page definition, and a domain too new to have any real citation footprint yet. Individual stories, if surfaced, are correctly attributable (real author, real dates, real image) — but the *entity* ("what is Living Page, and which one, given the name collisions") is currently underspecified everywhere except a file most systems haven't found. Fixing the `llms.txt` 404 and adding root-level `WebSite`/`Organization` schema are the two highest-leverage GEO/AEO fixes in this entire audit.

---

## Environment Limitations (consolidated)

- **Direct HTTP access to `livingpage.one`/`www.livingpage.one` is blocked** from this sandbox's Bash tool and from the linked computer's shell by organization egress policy — confirmed via repeated `403`/`CONNECT tunnel failed` errors, not retried per the skill's own rules. All live-site evidence instead came from WebFetch, a real Chrome browser on the user's device, and WebSearch.
- **Real Core Web Vitals (PageSpeed Insights / CrUX API) were not obtainable** — `googleapis.com` is also blocked. Lab-only timing approximations are reported with a manual-check recommendation.
- **Exact redirect HTTP status codes** (301 vs 308) for the host-canonicalization hops could not be captured — browser `fetch()` hides this even same-origin. The *fact* of a clean single-hop redirect is confirmed; the exact code is not.
- **WebFetch strips `<script type="application/ld+json">` tags** during its HTML→Markdown conversion — this audit avoided a false "no schema found" conclusion by verifying structured data directly against the source code and live DOM instead.
- **No Google Search Console or Vercel dashboard access** — GSC sitemap-submission status and the exact production value of `NEXT_PUBLIC_SITE_URL` (vs. the gitignored local placeholder) could not be directly confirmed; live behavior was used as ground truth instead and is consistent with correct configuration.
- Sampling covered 8 of the site's 12 sitemap URLs and roughly 3 of 11 story-format visual templates directly — findings about shared code paths (JSON-LD builders, heading structure) are Confirmed for the mechanism (same code path for every page of that type) but not exhaustively spot-checked on every individual page.
