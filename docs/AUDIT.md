# Living Page — Codebase Audit vs PRD v2

A file-level map of the live repo (`living-page-platform`, commit `4acc266`)
against the PRD. Verdict per system: **REUSE** (asset, keep and extend),
**REPLACE** (exists but wrong for the new model — swap the surface, often keep
the machinery underneath), or **BUILD** (does not exist).

The headline: **the hard, differentiating machinery already exists and is
good.** The transformation engine, the runtime block renderer, the
scroll-choreography primitive, the generative doodle system and the layered
world engine are all real and reusable. What's wrong is mostly *surface*: the
homepage, the editor UI exposing the engine's guts, and the dark travel-diary
skin. This is a reskin + IA change + engine-deepening, **not a rebuild**.

---

## Stack (unchanged, keep)
Next.js 15.5 App Router · React 19 · TypeScript (strict) · hand-written CSS
(`app/globals.css`, ~830 lines, no framework) · Supabase Postgres + Auth via
`@supabase/ssr` · content stored as `blocks` jsonb, rendered at request time.
Deployed on Vercel from GitHub. No Tailwind, no component lib, no icon lib.

---

## 1. The transformation engine — **REUSE (core asset)**

| File | What it is | Action |
|---|---|---|
| `lib/annotate.ts` | The "first pass". Lexicon (`LEX`, `DOODLE_HINTS`) + rules read raw prose into `BeatSpec[]`: assigns voice, body, doodle, side; `enforceRatio()` keeps ~70% plain. Runs client-side, instant. | **REUSE.** This *is* the Auto engine's core. Extend the lexicon; wrap it with the new art-direction inference (world/accent/mood/density). |
| `lib/story-blocks.mjs` | The Block grammar (`beat`/`hold`/`raw`), `parseBlocks`, `serializeBlocks`, and `analyse()` (the quality bar). Client-safe, no node imports. | **REUSE.** This is the data model the whole product speaks. Extend Block with optional visual-layer fields additively. |
| `lib/vocabulary.ts` | The four axes: VOICE(8), BODY(10), GESTURE(11), MOVE(6) + defaults. | **REUSE + EXTEND.** Curated expansion to ~20 motions (see `DESIGN-TOKENS.md`). Keep it a closed set. |
| `app/write/[id]/editor.tsx` (logic only) | Already runs `annotate()` on every keystroke → live `BlockPreview`. | **REUSE the loop, REPLACE the UI.** The "transform while you type" mechanism exists today. |

> Gap vs PRD §15/§17: the engine is lexical, not semantic. Per D1 this is
> accepted — Auto is good, not magic. Do not promise metaphor understanding.

## 2. Rendering & motion primitives — **REUSE**

| File | What it is | Action |
|---|---|---|
| `components/living/StoryRender.tsx` | Turns `Block[]` → living components at runtime; never throws (degrades unknown blocks to a plain line). | **REUSE.** Extend to render new visual-layer block types. |
| `components/living/StoryView.tsx` | The reading shell: ground colour, world injection, frontispiece, veil, byline, colophon. Shared by reader + editor preview. | **REUSE.** Add end-of-story creation loop; make chrome recede (PRD §23). |
| `components/living/StoryFrame.tsx` | The scroll-choreography engine: one rAF pass, `--depth`, `near`/`arrived`, veil applied in JS (JS-off still readable). | **REUSE.** This is the backbone for reader scroll behaviour (PRD §24). |
| `components/living/Beat.tsx` | The atom: word-splitting, deterministic scatter via `--tf`, voice/body on `.words`, move/gesture on `.beat`. | **REUSE.** The typography-motion primitive the PRD's "words dance" needs. |
| `components/living/voices.tsx` · `Scene.tsx` · `Marks.tsx` | Voice components; Scene/Hold/Margin/StoryH2; Mark/Press/Drag interactions. | **REUSE + EXTEND** into the curated motion/surface library. |
| `components/doodles/registry.ts` · `Doodle.tsx` | Doodles as point-sets → jittered, smoothed strokes (imperfection is *generated*). | **REUSE + EXTEND.** Add curated doodles by adding points. Currently line-only; collage/illustration styles are new (Phase 2+). |

## 3. Worlds / backdrops — **REUSE engine, REPLACE the set + default**

| File | What it is | Action |
|---|---|---|
| `components/living/Backdrop.tsx` | Layered SVG world renderer (sky/stars/moon/sun/ridge/road/sea/rain/haze) tied to `--depth`. | **REUSE + EXTEND.** Add layers (trees, city, window, field, glow) to widen from 6 dark-ish worlds toward ~12 bright-biased archetypes. |
| `lib/backdrops.ts` | World definitions; **default is `none`**. | **REPLACE the default + expand.** "none" must die (PRD §15). Worlds become art-direction bundles (layers + scheme + accent + cue-words) so the engine can auto-select. |

## 4. Backend, data, auth — **REUSE (keep entirely)**

| File | What it is | Action |
|---|---|---|
| `supabase/migrations/0001_init.sql` | `profiles` + `stories`, RLS policies, `updated_at` trigger. | **REUSE.** Add `0002` additively (D4): `stories.type`, `stories.art_direction jsonb`. |
| `lib/db.ts` · `lib/types.ts` | RLS-bound read queries; typed rows (`StoryRow` has `source` + `blocks`). | **REUSE + EXTEND** types with `type`/`art_direction`. |
| `lib/supabase/*` · `middleware.ts` | SSR clients + session refresh + route gating. | **REUSE as-is.** |
| `app/auth/*` · `login`/`signup`/`onboarding`/`settings` | Open email/password auth, handle onboarding. | **REUSE.** Light-restyle only (D8). |
| `app/write/actions.ts` | Server actions: create/save/publish/delete, slug uniqueness. | **REUSE + EXTEND** to persist `type` + `art_direction`. |

## 5. What must change — **REPLACE**

| File | Problem (PRD ref) | Action |
|---|---|---|
| `app/page.tsx` | Dark "doorways" feed; explains nothing, shows nothing, no reader/writer split (PRD §1.1–1.3, §5). | **REPLACE** with the bright homepage-as-demo + one live hero (D5). |
| `app/write/[id]/editor.tsx` (UI) | Exposes beats / voice-budget / density / veil / refine — writer forced to art-direct (PRD §1.4, §10, §13). | **REPLACE the shell.** Auto default; hide the guts; expose only Mood/Visuals/Motion (PRD §14); old controls → Advanced. Keep the engine calls. |
| `app/globals.css` (product-UI parts) | Dark stock, single-accent, cinematic everywhere (PRD §1.5, §29). | **REPLACE the product-UI theme** with light/paper/bright tokens (D8). Keep + expand the reader-output theming. |
| `app/write/page.tsx` (dashboard) + entry | Entry is a "desk"; "new piece" makes a blank draft. No Story/Moment/Thought/Just start (PRD §11). | **REPLACE entry** with `/make`. Keep a light dashboard for returning writers. |
| Nav / CTA copy across pages | "the studio", "places", "doorway" — travel-diary voice (D3). | **REPLACE copy** per `COPY.md`; primary CTAs "Make something" / "Explore stories". |

## 6. What doesn't exist — **BUILD**

- `lib/art-direction.ts` — wraps `annotate()` with world/accent/mood/density
  inference; maps the Mood/Visuals/Motion controls; never returns "none". (The
  intended shape is small and heuristic — see `DESIGN-TOKENS.md` mood table.)
- `app/make/` — writer entry: four mode cards + rotating prompts (PRD §11–12).
- Homepage hero live-transformation component (`components/home/*`).
- Mood / Visuals / Motion control row with **preview-on-select** (PRD §14).
- Advanced line-level drawer (reuse the current refine UI, demoted behind
  "Fine tune this line").
- Reader end-of-story creation loop ("Have one of your own? → Tell it", §26).
- Migration `0002` + type/art_direction plumbing.
- Light product-UI design-token layer (`DESIGN-TOKENS.md`).

## 7. Known risks / watch-items
1. **Auto ≠ semantic** (D1). Keep expectations honest in copy.
2. **Taxonomy creep** (D6). Curate; resist implementing the literal lists.
3. **Two themes bleeding** (D8). Scope product-UI vs reader tokens carefully;
   the reader injects world tokens at `:root` today — keep that isolated.
4. **Performance:** many animated SVG layers + word-split beats. Honour
   `prefers-reduced-motion` (already partly wired), pause off-screen, cap
   layers per world (PRD §33).
5. **`StoryRender` must keep never-throwing** as new block types land.
6. **Fonts fetch from Google at build** (`app/layout.tsx`). Fine on Vercel;
   a font error in a network-restricted env is a network issue, not code.

## 8. One-line summary
Keep the engine, the renderer, the choreography, the doodles, the worlds
engine and the whole backend. Replace the homepage, the editor's exposed
controls and the dark product skin. Build the Auto inference wrapper, the
four-mode entry, the light token layer, and one live hero. Everything hard is
already done.
