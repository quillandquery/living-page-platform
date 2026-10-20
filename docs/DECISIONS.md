# Living Page — Decisions Log

Locked product decisions that gate implementation. Claude Code should treat
these as settled and NOT re-litigate them mid-build. Date: 2026-09-10.
Owner: Reshika. Source of truth for scope: `living-page-prd-v2` + this log.

---

## D1 — Engine intelligence: **a two-stage brain (local models, no paid LLM)**
*Revised 2026-10-08. Supersedes the original "heuristic, no LLM" rule, which
was too weak to drive the living-page design language (D9).*

The Auto engine is now **two stages**:
1. **Live heuristic** — the deterministic lexicon + rules pass (`lib/annotate.ts`)
   stays, and still runs instantly on keystroke so "watch it transform while I
   type" keeps working in the editor.
2. **The brain** — a richer pass run **server-side / offline on save & publish**
   (`brain/`): spaCy (linguistics) + sentence-transformers (semantic concepts,
   matched against the visual-concept library) + a local emotion classifier,
   producing a `VisualProfile` → `SceneGraph` → casting into the living-page
   libraries (worlds / behaviours / elements — see D9 and
   `docs/LIVING-PAGE-ARCHITECTURE.md`).

- **Why the change:** the heuristic-only engine could not read a story richly
  enough to choose a motivated world, a narrative arc, or which beats earn a
  signature behaviour. The brain can. It understands concepts and emotion, not
  just cue-words — so "don't promise metaphor understanding" no longer applies
  as a hard caveat.
- **What is still true (the original cost discipline holds):** the brain uses
  **local models only** — no paid per-story LLM API, no per-story cost, no
  external network dependency in production beyond loading the (cached) model
  weights. The instant, free feel at the keyboard is preserved by stage 1;
  the deeper transform happens once, on save/publish.

## D2 — Photography: **revised 2026-09-14 — imagery allowed via a curated
library; sourcing still open**
Originally: no external photography, hand-drawn/typographic/collage identity
only. Revised after feedback that the all-SVG doodle system reads too
uniform across stories (same muted palette, thin single-line marks). The
identity is no longer hand-drawn-only — real imagery may enter the system —
but the *mechanism* stays deterministic and curated, not per-story
generative: a tagged, hand-picked illustration/photo library the engine
selects from by the same signals that already drive doodles (environment,
mood, objects), never an AI image call and never a random web fetch
(`MediaProvider`/`PexelsProvider`-style live stock search stays out, per the
original reasoning below).

- **Still true:** stock-photo walls are the fastest way to look like every
  other site; a live, unvetted image search would reintroduce exactly that
  and break the "one visual grammar per page" bar. Any imagery must be
  curated in, not fetched live.
- **Open / not yet decided:** where the curated assets themselves come from —
  commissioned illustration, a licensed pack, or a separate future
  AI batch-generation project to seed the library once, offline. No asset
  sourcing work has started; this is a scope decision, not an implementation.
- **Done in the meantime (this date):** pushed the existing hand-drawn SVG
  system considerably further as an immediately-buildable step — bolder,
  two-tone "filled" treatment (was a flat 0.3-opacity tint), a widened
  doodle vocabulary (tree, dove, heart, camera, balloon, dancer — each wired
  to its own real OBJECT cue, not decorative filler), artwork-layer colour
  now pulls from the story's own accent instead of the neutral ink, and the
  colophon's persistent mark now varies by story instead of always being a
  spiral. The "Visuals" control still ships `Auto / Illustrated / Minimal /
  Collage / Maximal` — those now visibly, not just numerically, differ.

## D3 — Repositioning: **full reframe, travel as flagship example**
Living Page is a general storytelling product (Story / Moment / Thought /
Just start). Product copy, homepage and brand are NOT travel-specific.
Travel stories remain the best, most-populated *example* content.

- **Implication:** strip travel-specific product framing from homepage, nav,
  editor and empty states. Keep the existing travel pieces (e.g. Gokarna) as
  seed/example stories in the discovery surface. World/vocabulary names stay
  generic (a "coast" world, not "a beach in Gokarna").

## D4 — Existing data: **preserve & migrate additively**
Keep Supabase, users, profiles and published stories. Schema changes are
additive only (new columns with sensible defaults). Old stories keep
rendering unchanged.

- **Implication:** migration `0002_*.sql` ADDS `stories.type` and
  `stories.art_direction` (both defaulted); it never drops or rewrites. The
  `blocks` jsonb model is forward-compatible and stays. Do not reset the DB.

## D5 — Phase 1 line: **structure + ONE live hero demo**
Phase 1 delivers: new information architecture, reader/writer split,
Story/Moment/Thought/Just start flow, light editor shell (Auto default, engine
chrome hidden), repositioned copy, additive migration, AND the single live
hero transformation on the homepage. The full 8-section scroll choreography
(PRD §7) and the wider interaction library (PRD §8) are **Phase 2**.

- **Why:** the hero transformation is the whole proposition; everything else
  in the homepage choreography is amplification. Ship the proof, defer the
  amplifiers.

## D6 — Curated vocabulary, not literal taxonomy
The PRD's long lists (≈60 worlds §16, ≈60 motions §21, ≈50 doodles §19) are
*direction, not a spec to implement literally*. Build a curated, extensible
set and let Auto compose it.

- **Targets for Phase 1–2:** ~12 world archetypes, ~20 semantically-distinct
  motion behaviours, an expanded-but-curated doodle set. The engine must be
  data-driven so the library grows without new code paths.
- **Why:** a giant catalogue of effects is exactly the "pile of effects, not
  art direction" the PRD lists as problem #10. The original product's power
  was a *closed, curated* vocabulary.

## D7 — Keep the stack; no framework churn
Next.js 15 App Router + React 19 + Supabase (@supabase/ssr) + hand-written
CSS. **No Tailwind, no CSS framework, no component library, no icon library**
(PRD-aligned and matches the existing codebase). Design tokens are CSS custom
properties (see `docs/DESIGN-TOKENS.md`).

## D8 — Two visual regimes
The **product UI** (homepage, editor, dashboard, auth) is light / warm-paper /
bright / calm. The **reader output** (a published story) is dynamic and may go
fully dark when the world calls for it. These are two token sets; don't let the
dark reader theme leak into the editor, and don't let the bright product theme
flatten the reader.

## D9 — The living-page design language (reader output)
*Added 2026-10-08. The settled design language from the living-page prototypes
(airport, cartographer, noir, Chiswell). This is now the reader-output standard
and governs over any earlier reader styling, including the "nothing shouts /
70% plain" creed in `app/globals.css` and the restraint-only framing of
`docs/EXPRESSIVE-ENGINE-PLAN.md` (now superseded for reader output). Full spec:
`docs/LIVING-PAGE-ARCHITECTURE.md`.*

A published story renders as a **living page**, built from three curated
libraries the brain casts into (worlds · behaviours · elements). Non-negotiable
invariants — every one of these was a failure mode we fixed, not a preference:

1. **No header images.** The visual is present throughout and *changes as you
   read* — never a banner parked at the top.
2. **Elements stay with the words.** Art is co-located with its sentence, or is
   part of the continuous world — never an icon-per-paragraph list.
3. **Words unveil.** The type assembles / comes into focus on arrival. It must
   never read like flat blog text.
4. **The world evolves with the narrative** — brighten-with-progress /
   build-on-scroll / react-to-beats. Static is dead.
5. **Restraint.** Mostly quiet; 2–3 earned surprises; one grammar per page.
   (This keeps PRD §32; restraint is the *budget*, not the ceiling — the page is
   now an immersive evolving world, not a quiet grey sheet.)
6. **Motivated, never default.** Ground / palette / world are chosen from the
   story (a dusk essay → twilight). No black-by-default, no neon-by-default.
7. **Curated, premium craft.** Elements come from a curated, tagged illustration
   library (D2), never procedural clip-art, never childish.

Abstract / internal stories with no concrete objects are a first-class case:
they live on world + word-unveil + typographic behaviour alone, and must still
look beautiful. "No element" is never a broken state.

---

## D10 — Every surface is generative (2026-10-09)

**Decision.** Every reader surface — a **world** (atmosphere the story is set
inside) or a **medium** (the text becomes an artifact: postcard, evidence board,
maximalist, manuscript) — MUST be a **generative capability over any story**,
never a bespoke per-story render. This is a standing requirement for all new
surface work.

**Shape.** Each surface is two parts:
1. an **adapter** `xInput(scene: LivingScene) → Props` in `lib/living/cast.ts`
   that reads ONLY the director's output (emphasis `em` spans, the recurring
   `motif`, the climax/scream, the `dek`, the beats) and maps it to the surface,
   and
2. a **component** that renders those props.

No story content is hardcoded in a component. The proof bar is the Maximalist
pattern: `maximalistInput` picks the scream word and refrain from the scored
beats, verified to produce TERRIFIED / "wasting my life", WRONG, HOME on three
unrelated stories. Worlds are generative by construction — the scene component
is a pure backdrop and the writer's words flow through `LivingStory`'s text
layer on top.

**Consequence.** A new medium/world is not "done" until it has an adapter and
renders correctly on several unrelated stories. Bespoke HTML prototypes are a
design step, not a deliverable.

---

## D11 — Stage 2 is the Claude API; per-story art direction (2026-10-19)

**Decision.** The two-stage brain (D1) keeps Stage 1 (the live, free TS director)
but **Stage 2 is now the Claude API**, not local models. On publish (or an
explicit re-roll) Claude reads the story's tone/mood/vibe, casts it to a **style**
(a world or a medium) with motivated variance, and returns a validated
`ArtDirection` spec that our renderer realises. Full design: `docs/BRAIN-API.md`.

**This revises D1** (local-only, no per-story cost) for Stage 2 only: cost is
**per-publish, cached** by text-hash + model version, never per-view; a failed
call falls back to the deterministic director. **It loosens D6** (closed
taxonomy): the LLM composes within an **open, expressive grammar** rather than a
fixed list.

**Hard rule.** The LLM is the art *director*, not the *coder*: it emits a
schema-validated spec (incl. **sanitised SVG** for bespoke art), never raw
HTML/CSS/JS. Invalid output → fall back. This preserves safety, caching,
versioning and the "one medium" coherence while making every story different.
