# Living Page

A storytelling product for people who have stories but don't think of
themselves as "writers." The writer tells the story naturally; Living Page
turns it into an expressive, animated, visual page — typography, motion,
colour, illustration and pacing chosen automatically from the writing.

> **You have a story. It shouldn't look like a blog post.**
> Write it normally. We'll make it come alive.

**raw thought → words → living page.** The writer never has to understand the
art-direction system. The reader should feel they're entering someone's story,
not reading an article.

This file is the standing brief for every Code session. Full spec:
`living-page-prd-v2`. Settled decisions: **`docs/DECISIONS.md`** (read it —
those are not up for re-litigation). Style truth: **`docs/DESIGN-TOKENS.md`**.
Current work: **`docs/PHASE-1-TICKETS.md`**. Locked copy: **`docs/COPY.md`**.
What exists and what to reuse: **`docs/AUDIT.md`**.

## Positioning
Living Page is **a new way to tell a story** — general storytelling (Story /
Moment / Thought / Just start). It is NOT a blogging platform, newsletter tool,
creator dashboard, website builder, writing tool, or design editor. Travel
stories are the flagship *example* content, not the product's identity
(Decision D3).

## The core loop (optimise everything for this)
Home → choose Story/Moment/Thought/Just start → answer an easy prompt → write
naturally → watch the page transform *while writing* → optionally shape mood /
visuals / motion → publish → a reader experiences it → the reader thinks
"I want to make one."

Principle: **Write first. The page figures itself out.** The payoff: the user
wrote something ordinary and accidentally made something extraordinary.

## Interaction principles (PRD §35 — hold these)
1. The interface disappears when the story begins.
2. Writing never feels like configuring a website.
3. **Auto is the default, everywhere.** There is no "none".
4. Every effect needs a reason (narrative, not novelty).
5. Scroll is a storytelling input.
6. The homepage is the product demo.
7. Colour should feel alive (a state, not decoration).
8. Maximalism is dynamic, not cluttered.
9. Readers and writers need different journeys.
10. The magic happens before the explanation.

## Do NOT build (PRD §36)
- A Medium-style feed as the homepage, or a Substack-style dashboard.
- A traditional CMS editor, or a giant right-side property inspector.
- Mandatory templates. "Choose your background" as the first creative step.
- Manual animation configuration as the primary workflow.
- A fixed set of six backgrounds; a fixed set of eight animations; a
  doodle-only visual system.
- Generic stock-photo walls.
- Dark cinematic UI throughout the product. (Reader *output* may go dark; the
  product UI — homepage, editor, dashboard, auth — stays light/warm/bright.)
- **No Tailwind / CSS framework / component library / icon library** (Decision
  D7). CSS is hand-written; the tokens in `docs/DESIGN-TOKENS.md` are the
  system.

## Engine guardrails (from `docs/DECISIONS.md`)
- **Heuristic, no LLM** (D1). The Auto engine is a deterministic lexicon +
  rules (`lib/annotate.ts` + the art-direction wrapper). No AI API, no
  per-story cost, no network in the transform loop. Auto is good, not
  omniscient — don't promise metaphor understanding.
- **No photography yet** (D2). Identity is hand-drawn / typographic / collage.
  The "Visuals" control offers Auto/Illustrated/Minimal/Collage/Maximal.
- **Curated, not literal, taxonomy** (D6). ~12 world archetypes, ~20 motions.
  Build the engine data-driven so the library grows without new code paths;
  resist implementing the PRD's long lists verbatim. The constraint is what
  makes the site one medium instead of a pile of effects.
- **Preserve data** (D4). Schema changes are additive; old stories keep
  rendering. Never reset the DB.

## Architecture (what to reuse — see `docs/AUDIT.md`)
Next.js 15 App Router · React 19 · Supabase (`@supabase/ssr`, RLS) · content as
`blocks` jsonb rendered at request time. **Privacy is the database's job** —
RLS, not app code, keeps drafts private; extend the policies, don't reimplement.

Reusable primitives already in the repo (keep and extend, don't rewrite):
- `lib/annotate.ts` — prose → beats (the Auto engine's core, runs on keystroke).
- `lib/story-blocks.mjs` — the Block grammar + quality bar (client-safe).
- `lib/vocabulary.ts` — the closed voice/body/gesture/move axes.
- `components/living/*` — Beat (word-split typography-motion atom), voices,
  Scene/Hold/Margin, Marks, `StoryFrame` (scroll choreography, `--depth`,
  veil), `StoryRender` (Block[]→UI, **must never throw**), `StoryView`
  (reading shell).
- `components/doodles/*` — generative point-set doodles (imperfection is drawn,
  not faked).
- `components/living/Backdrop.tsx` + `lib/backdrops.ts` — layered SVG worlds
  tied to `--depth`.
- `lib/db.ts` · `lib/types.ts` · `lib/supabase/*` · `middleware.ts` · auth —
  the whole backend.

To build (Phase 1): `lib/art-direction.ts` (Auto wrapper, kills "none"),
`app/make` (four modes), the light editor shell (hide the engine), the live
hero, migration `0002` (type + art_direction), the light token layer.

## Data model direction
A story is heading toward a scene graph (`Story → Scenes → Blocks → Visual
layers → Motion → Media`, PRD §30) but reaches it *additively* from today's
`blocks` jsonb — evolve, don't replace. `stories` gains `type`
(story/moment/thought/freeform) and `art_direction` (mood/visuals/motion/
density).

## Routes (Phase 1 target)
```
/                homepage — the product demo (bright, one live hero)
/explore         discovery surface of published stories
/@handle         a writer's page   ·   /@handle/slug  the reader
/make            writer entry: Story / Moment / Thought / Just start
/write           the desk (returning writers)  ·  /write/[id]  the editor
/login /signup /onboarding /settings   auth (light-restyle, keep flows)
```

## Commands
```bash
npm run dev        # localhost:3000
npm run build
npm run typecheck
```
`next/font` fetches from Google at build; a font error in a network-restricted
env is a network problem, not a code problem.

## Definition of a good page (PRD §32 — the quality bar)
Readable at all times · every strong visual decision has a narrative reason ·
maximalism ≠ every layer active at once · one visual grammar per page · 2–3
genuine moments of surprise · quiet and loud sections alternate · visuals relate
to the actual story, not generic aesthetics.

The whole thing succeeds when the user thinks:
**"I didn't know I could tell a story like this."**
