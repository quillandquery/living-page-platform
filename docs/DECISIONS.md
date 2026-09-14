# Living Page — Decisions Log

Locked product decisions that gate implementation. Claude Code should treat
these as settled and NOT re-litigate them mid-build. Date: 2026-09-10.
Owner: Reshika. Source of truth for scope: `living-page-prd-v2` + this log.

---

## D1 — Engine intelligence: **heuristic, no LLM**
The Auto art-direction engine is a deterministic lexicon + rules system. No
LLM call at authoring, render or publish time. No AI API key, no per-story
cost, no network in the loop.

- **Why:** the "watch it transform while I type" promise needs instant, free,
  deterministic feedback. Per-keystroke LLM calls can't deliver that.
- **Implication:** Auto will be *good, not omniscient*. It pattern-matches
  concrete nouns, weather, time and emotional cue-words. It will NOT truly
  understand metaphor or "my grandmother's kitchen" the way PRD §15/§17
  imagine. Write the copy and set expectations accordingly. An LLM pass can be
  added later as an optional enhancement — architect the engine so a smarter
  provider could slot in, but do not build it now.

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
