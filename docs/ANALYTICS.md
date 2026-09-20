# Living Page — Analytics

How "activity" gets tracked, why these events and not others, and how to
add one more without turning this into a pile of trackers.

## Provider: PostHog

Chosen over Plausible/Vercel Analytics because the questions worth
answering here — where the core loop drops off, whether Auto gets
overridden, whether reading converts to writing — need custom events with
properties and multi-step funnels, not just pageviews. PostHog's free tier
(~1M events/month) covers this comfortably pre-launch.

Nothing is wired to a specific PostHog project in code. Set these to turn
tracking on; leave them unset and every call below is a silent no-op (see
"Fails safe" below) — local dev and CI need nothing here:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # or your self-hosted URL
```

## What gets tracked, and why

The three questions this exists to answer, per CLAUDE.md's core loop:

1. **Core loop** — home → `/make` mode chosen → draft created → published.
   `make_mode_selected`, `draft_created`, `story_published`,
   `story_unpublished`.
2. **Engine trust** — does Auto get left alone, or overridden? Every time a
   writer touches the Format/Mood/Visuals/World select away from its
   default, `engine_control_changed` fires with which control and what they
   picked. A story with lots of these is a story where Auto guessed wrong —
   this is the most direct signal D1's heuristic engine is or isn't
   landing.
3. **Reader engagement** — `story_viewed` and `story_scroll_depth` (25/50/
   75/100%) on the real `/@handle/slug` reader route only. `reader_create_
   cta_clicked` is defined for the "have one of your own? → tell it" loop
   (PRD §26, AUDIT.md item 6, not yet built) — wire it up when that ships.

The full, typed list lives in **`lib/analytics/events.ts`** — that file,
not this doc, is the source of truth for exact event names and payload
shapes. Add an event there before firing it anywhere, the same way D6 keeps
the world/motion vocabulary curated instead of sprawling.

## Where it lives

- `lib/analytics/events.ts` — the typed event registry.
- `lib/analytics/client.ts` — browser-side wrapper around `posthog-js`.
  `initAnalytics()` (called once from `app/providers.tsx`) and `track(name,
  props)`.
- `lib/analytics/server.ts` — server-side wrapper around `posthog-node`.
  `captureServer(name, distinctId, props)`, for events fired from inside a
  server action that redirects immediately after (a client-side `track()`
  call there would race the unmount).
- `app/providers.tsx` — inits PostHog once and fires `$pageview` on route
  change (App Router has no native route-change event to hook, unlike the
  Pages Router).
- `components/analytics/ReaderTracking.tsx` — the reader-side view + scroll
  tracker. Deliberately **not** part of `StoryFrame.tsx`: that engine is
  shared by the real reader, `/looks`, `/dev/preview` and `/wander/s/*` seed
  stories, and wiring analytics into it would either count demo traffic as
  real reads or require threading an opt-out through every internal caller.
  `ReaderTracking` is mounted only from `app/[handle]/[slug]/page.tsx`.

## Fails safe, by design

- No key configured → `initAnalytics()`/`getClient()` return early, `track`/
  `captureServer` become no-ops. Every call site is unconditional; nothing
  needs an `if (analyticsEnabled)` guard.
- Never touches the Auto engine's hot path. D1 ("no network in the transform
  loop") is about the writing experience — `lib/annotate.ts` and
  `lib/art-direction` never import anything from `lib/analytics`. Tracking
  calls fire after a save/publish, never inside the per-keystroke preview.
- No story content is ever sent. `autocapture: false` in
  `lib/analytics/client.ts` is deliberate — PostHog's DOM autocapture would
  otherwise scrape text out of the editor and reader. Every event above
  carries only ids, enum-like labels and booleans.
- Distinct id is the writer's internal profile id, never their email
  address.

## Adding a new event

1. Add it to the `AnalyticsEvent` union in `lib/analytics/events.ts` with a
   typed payload.
2. Call `track(...)` (client) or `captureServer(...)` (server action that
   redirects) from the one place that actually knows it happened.
3. Ask which of the three questions above it answers. If it doesn't answer
   one of them, it's probably not worth adding — this list stays curated,
   not comprehensive.
