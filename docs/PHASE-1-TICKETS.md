# Living Page — Phase 1 Tickets

Phase 1 only (Decision D5): new IA, reader/writer split, Story/Moment/Thought/
Just start, light editor shell (Auto default, engine hidden), repositioned
copy, additive migration, **and one live hero transformation**. The 8-section
scroll choreography and wider interaction library are Phase 2 — out of scope
here.

Conventions: each ticket is independently buildable, names real files, points
at copy by `[KEY]` (see `COPY.md`) and tokens (see `DESIGN-TOKENS.md`), and has
a one-line **AC** (acceptance criterion) drawn from PRD §38. Build order roughly
top-to-bottom; `FND` first.

---

## Epic A — Foundation

### FND-1 — Light product-UI token layer
Implement §1,3,4,5,6 of `DESIGN-TOKENS.md` as CSS custom properties. Introduce
a `.product` scope (or `data-surface="product"`) for homepage/editor/dashboard/
auth so the bright/paper theme is isolated from reader output (D8). Do not
touch the reader's per-story `--accent` derivation.
- Files: `app/globals.css`, `app/layout.tsx` (surface class).
- **AC:** the homepage renders on creamy paper with dark ink and bright accents; the reader page's dark worlds are unaffected.

### FND-2 — Additive migration: type + art_direction
`supabase/migrations/0002_type_artdirection.sql`: `alter table stories add
column type text not null default 'story' check (type in
('story','moment','thought','freeform'))`; `add column art_direction jsonb not
null default '{}'::jsonb`. No drops. Extend `StoryRow`/`StoryDraftInput`
(`lib/types.ts`) and the save action (`app/write/actions.ts`).
- Files: new migration, `lib/types.ts`, `lib/db.ts`, `app/write/actions.ts`.
- **AC:** existing published stories still render; new drafts persist `type` and `art_direction` round-trip through save/reload.

### FND-3 — Auto art-direction module (kill "none")
`lib/art-direction.ts` (client-safe): `inferWorld(text)` (never returns none),
`inferMood(text)`, and `artDirect(text, {mood,visuals,motion})` →
`{world, accent, doodleDensity, voiceBudget, motionScale}` per the mood table
in `DESIGN-TOKENS.md §7`. Expand `lib/backdrops.ts` worlds to the ~12
archetypes (§9) with `accent` + `cues`; default selection is inferred, not
"none". Add the new backdrop layers (trees, city, window, field, glow) to
`components/living/Backdrop.tsx` + CSS.
- Files: new `lib/art-direction.ts`, `lib/backdrops.ts`, `components/living/Backdrop.tsx`, `app/globals.css`.
- **AC:** given any non-empty draft, the engine returns a concrete world + accent with zero user input; no code path yields "none".

## Epic B — Homepage (the reframe + one live demo)

### HP-1 — Homepage shell & IA
Replace `app/page.tsx`. Bright hero + two equal entry points (Make / Explore),
then lightweight section markers using `[SEC.*]` headlines and a small live
"explore" strip of real published stories (reuse `publishedFeed()`), closing
CTA `[CLOSE.*]`. Structure only for the non-hero sections (full interactions =
Phase 2), but each must read as bright and intentional.
- Files: `app/page.tsx`, `components/home/*`, `app/globals.css`.
- Copy: `[HERO.*]`, `[SEC.*]`, `[CLOSE.*]`, `[NAV.*]`.
- **AC (§38 homepage):** a first-time visitor can answer "what is this?" and "my words become a different kind of page" within ~5s without reading a feature list; the page reads predominantly bright and energetic.

### HP-2 — Live hero transformation
`components/home/HeroTransform.tsx`: renders `[HERO.DEMO_RAW]` and, on load,
visibly transforms it into a living page using the *real* primitives (`Beat`,
voices, a doodle, an accent/light shift on "sunset", "stayed anyway" settling
larger). Loop gently; respect reduced-motion (show the transformed end-state).
Reuse `lib/annotate.ts` + `components/living/*`; do not fake it with bespoke CSS.
- Files: `components/home/HeroTransform.tsx`.
- **AC:** watching the hero for 3–5s communicates the whole proposition; with reduced-motion on, the transformed result is shown statically and still legible.

### HP-3 — Nav + routing
Slim corner nav (not a SaaS header): `[NAV.MAKE]` → `/make`, `[NAV.EXPLORE]` →
`/explore`, `[NAV.SIGNIN]`/`[NAV.DESK]` by auth state. Add `/explore` route
(discovery surface — can reuse the feed for Phase 1).
- Files: `app/page.tsx`, `app/explore/page.tsx`, nav component.
- **AC:** reader and writer have visibly distinct entry points from the homepage without it feeling like a product chooser (PRD §4).

## Epic C — Writer entry & light editor

### WR-1 — `/make` entry with four modes
New route `app/make/page.tsx`: four cards (Story/Moment/Thought/Just start)
with `[MODE.*]` copy; selecting one creates a typed draft
(`createStoryAction` extended with `type`) and routes to the editor. Tiny live
hover flourish optional (Phase 2 for the full mini-demos).
- Files: `app/make/page.tsx`, `app/write/actions.ts`.
- Copy: `[MODE.*]`.
- **AC (§38 writer):** a first-time writer can start writing within 10s of clicking Make something, and is never asked to choose a background/animation/doodle before writing.

### WR-2 — Light editor shell
Rebuild the editor UI (`app/write/[id]/editor.tsx`) as a warm-paper writing
stage: top bar (logo · autosave `[EDIT.AUTOSAVE.*]` · Preview · Publish), a
large writing canvas with one faint rotating prompt (`[PROMPT.*]` by type),
and the live transformation preview. **Remove** the persistent controls panel
(beats/voice-budget/density/veil/refine tabs). Keep the `annotate()`-on-type →
preview loop underneath.
- Files: `app/write/[id]/editor.tsx`, `app/globals.css`.
- Copy: `[EDIT.*]`, `[PROMPT.*]`.
- **AC:** the editor shows no engine-internal concepts (beats, voice budget, veil, world config) by default; the page begins changing before the writer finishes the story.

### WR-3 — Auto default + writer screen states
Wire `artDirect()` so a new draft is Auto (world/accent/mood inferred, never
"none"). Implement states A→D (`[EDIT.EMPTY.*]`, `[EDIT.STATE_B/C/D]`): prompt
dominates when empty; subtle system appears after 1–3 lines; richer past a
threshold; `[EDIT.STATE_D.CTA]` "See my page →" transitions to the full reader
render of the draft.
- Files: `app/write/[id]/editor.tsx`.
- **AC:** Auto is the default art direction; "See my page" opens the generated page full-screen using the same `StoryView` a reader gets.

### WR-4 — Three shape controls (preview-on-select)
Add the Mood / Visuals / Motion rows (`[SHAPE.*]`) below/beside the preview.
Selecting a value re-runs `artDirect()` and the preview updates immediately. No
other controls visible here.
- Files: `app/write/[id]/editor.tsx`, control component.
- Copy: `[SHAPE.MOOD/VISUALS/MOTION]`.
- **AC:** tapping a Mood immediately changes the page; only three controls are exposed in the primary UI.

### WR-5 — Advanced drawer (demote the old controls)
Move the existing per-line refine UI + density/voice-budget knobs behind
`[SHAPE.ADVANCED]` / `[SHAPE.FINE_TUNE]` in a compact drawer (voice · motion ·
visual · size · position · `[SHAPE.RESET]`). Reuse the current refine
implementation; just relocate it.
- Files: `app/write/[id]/editor.tsx`.
- **AC:** advanced/line-level editing exists but is never shown by default; nothing from the old control panel is lost.

### WR-6 — Publish (lightweight)
Publish screen per PRD §27: title · author · optional description · visibility ·
Publish. No tags/SEO/slug/newsletter fields. Auto cover uses the story's world
+ opening line. Success shows `[PUB.DONE]` + copy-link + view.
- Files: `app/write/[id]/editor.tsx` or `app/write/[id]/publish` component, `app/write/actions.ts`.
- Copy: `[PUB.*]`.
- **AC:** first publish requires nothing beyond title; the story goes live and returns a shareable link.

## Epic D — Reader touch-ups

### RD-1 — Reader chrome recedes + strong opening
Tune `components/living/StoryView.tsx` / `[handle]/[slug]`: full-viewport,
minimal chrome that appears only on interaction, a strong first scene
(title · optional place/date · opening line · world · subtle movement).
- Files: `components/living/StoryView.tsx`, `app/[handle]/[slug]/page.tsx`.
- **AC (§38 reader):** a reader can start reading immediately; the interface recedes once the story begins.

### RD-2 — End-of-story creation loop
Append the contextual CTA `[READ.LOOP.KICKER]` / `[READ.LOOP.CTA]` at the end
of every reader page, routing to `/make`.
- Files: `components/living/StoryView.tsx`.
- **AC:** every finished story offers "Have one of your own? → Tell it" linking into the writer flow.

## Epic E — Repositioning & consistency

### RP-1 — De-travel the product surface
Replace travel-diary copy/nav across homepage, dashboard, auth and empty
states with `COPY.md` strings (D3). Keep existing travel stories as example
content in `/explore`. Update `<title>`/metadata to the general framing.
- Files: `app/page.tsx`, `app/write/page.tsx`, `app/login|signup|onboarding|settings`, `app/layout.tsx`.
- Copy: `[NAV.*]`, `[DESK.*]`, `[EXPLORE.*]`, `[AUTH.*]`.
- **AC:** no product-surface string implies the app is only for travel; travel pieces still appear as examples.

### RP-2 — Repo guardrails
Land the new root `CLAUDE.md` (from this package) and `docs/` so every future
Code session inherits the thesis, Do-Not-Build list and token pointers.
- Files: `CLAUDE.md`, `docs/*`.
- **AC:** a fresh Code session, reading only `CLAUDE.md`, can state the product thesis, the Do-Not-Build list, and where the design tokens live.

---

## Out of scope for Phase 1 (do not build now)
- The 8-section scroll choreography & 12+ interaction library (PRD §7–8) → Phase 2.
- Semantic image search / Pexels (D2).
- LLM art direction (D1).
- Collage/illustration/photography visual layers (Phase 2/4).
- Share-card image generation (Phase 5) — Phase 1 ships a basic link + title.

## Definition of done (Phase 1)
All AC met; `npm run typecheck` and `npm run build` clean; existing published
stories still render; a new visitor can go Home → Make something → write →
"See my page" → Publish → open the reader → "Tell it", entirely on Auto,
without ever seeing an engine-internal control.
