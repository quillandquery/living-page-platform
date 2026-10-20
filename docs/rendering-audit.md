# Living Page — Rendering & Filter Audit

*Phase 1 audit. No code changed. Prepared 2026-09-24.*

## 0. Summary for the impatient

The engine is not shallow — it's a genuinely deterministic, well-architected pipeline (`extractStoryProfile` → `generateArtDirection` → `StoryArtDirection` → React) with real per-story mechanics: seeded hashing, OKLCH hue jitter, procedurally wobbled doodle strokes, a rAF-throttled scroll engine, broad `prefers-reduced-motion` coverage. The problem is not "the code is lazy," it's that **one hidden concept — `Look` — currently owns five different jobs at once** (palette, art style, material, composition, typography default, a format hint, and a visualIntensity default), so everything the writer sees as "variety" collapses onto whichever of 13 Looks won, and `Look` itself is dominated by a single gravity well (`minimal`, base score 0.9 + mood/energy affinity, explicitly commented in the code as "the calm centre — the default a plain story lands on"). Running 10 deliberately different sample stories through the real engine (not a simulation — see §4), 7 of 10 landed on identical `mood: quiet / energy: quiet`, and 5 of those 7 landed on identical `look: minimal / format: standard / artStyle: editorial-clean / palette: minimal`. A story about a parent's death and a story about a chai recipe render with the same mood, energy, art style, and palette.

There is also no filter today that corresponds to the target model's VISUALS (illustration technique) or LAYOUT (composition/scroll behaviour) — both exist as real, coded systems (`ArtStyle`, `Composition`) but only as fixed side-effects of whichever `Look` wins, never independently scored from the story or exposed to the writer.

The doodle system itself is good news: 61 hand-authored, procedurally-wobbled SVG motifs, CSS-only animation (no library, no per-frame JS), broad reduced-motion coverage, and a properly rAF-throttled scroll engine. The problems there are variety-of-motion (currently 8 gesture keyframes total, applied per-doodle rather than per-beat-of-story) and a hero-subject system that only has real photographic cutouts for 2 of 20 lexicon entries.

## 1. Pipeline map

**Text → semantic profile.** `lib/semantic-profile.ts::extractStoryProfile(raw)` runs six weighted regex-lexicon scorers over raw story text — `PLACE_CUES`, `OBJECT_CUES`, `ACTION_CUES`, `EMOTION_CUES`, `TEMPORAL_CUES`, `NARRATIVE_CUES` (13–33 entries each) — via a shared `scoreAll<K>(text, table)` helper, producing a `SemanticStoryProfile` of six sorted `Signal[]` arrays plus word/sentence counts. This is purely descriptive ("what exists in this story?") and is explicitly documented in the file's own header as deliberately *not* deciding how anything looks.

**Profile → art direction (the hub).** `lib/art-direction/generate.ts::generateArtDirection(raw, profile, opts)` is the single orchestrator. Called live on every keystroke in the editor (`app/write/[id]/editor.tsx`) and again at save time (persisted to `stories.art_direction` jsonb). Its sequence:
1. `seedHash(raw)` — FNV-1a hash of the raw text, the seed for everything downstream (fully deterministic, no `Math.random` anywhere in the pipeline).
2. `detectRegister()` — narrative vs. reflective mode.
3. `scoreEnvironments(raw, profile)` — scores all `BACKDROPS` (`lib/backdrops.ts`, 22 keys) by cue-word hits plus the PLACE signal (×1.4 weight, with a `PLACE_ALIAS` table folding 7 minor place keys into nearby backdrops); `seededPick()` breaks near-ties within a score band.
4. `inferMood()` (`lib/art-direction/atmosphere.ts`) — EMOTION signal → mood (13→9 map) first, NARRATIVE signal → mood second, else a hard binary fallback (`cinematic` if the backdrop is dark, else `quiet`).
5. `buildAtmosphere(mood)` → a fixed `MoodSpec` (density, voice budget, energy, spatialOpenness, motionIntensity).
6. `getLook()` / `autoLook()` (`lib/art-direction/looks.ts`) — scores all 13 `LOOKS` against mood/energy/environment/mode/raw-text cues, seed-breaks within a band. **This is the real top-level decision** — one pick that simultaneously fixes palette, art style, material, composition, typography default, a format hint, a visualIntensity default, and an optional ambient-motion override.
7. From the winning Look: `PALETTES[look.palette]` + `paletteVars()` (OKLCH hue jitter), `ART_STYLES[look.artStyle]`, `COMPOSITIONS[look.composition]`, `pickArtwork()` (doodle selection/placement), `pickAmbientMotion()` (unless the Look forces one), `MATERIALS[look.material]`, `pickSignature()` (recurring motif), `pickSubject()` (hero illustration).

All of this assembles into `StoryArtDirection` (`lib/art-direction/types.ts`): `environment, atmosphere, artStyle, artwork[], ambientMotion[], material, composition, typography, signature, subject, visualIntensity, palette, look, format, accent, secondaryAccent, seed`.

**Spec → render.** Stored as `stories.art_direction` jsonb (additive migration — old rows without it fall back to legacy `worldVars()`). `components/living/StoryView.tsx` is the consumer: `ad.palette.vars` become inline CSS custom properties; `material-*`, `comp-*`, `palette-*`, `scheme-*` become CSS classes; `<Backdrop>` draws world layers; `<SubjectLayer>` draws the hero illustration; `<Artwork>` places margin doodles; `<Signature>` draws the recurring motif. Separately, `lib/vocabulary.ts`'s per-beat voice system (VOICES/BODIES/GESTURES/MOVES, driven by `lib/annotate.ts`) still governs sentence-level typography/motion independently — art direction "nudges" this per the code's own comments, it doesn't replace it.

Other consumers of the same pure functions: `app/dev/backfill-art/route.ts` (batch regenerate), `app/dev/preview/[key]` and `app/looks/page.tsx` (dev-only galleries — genuinely useful precedent for the Phase 2 `/dev/gallery` requirement). `lib/story-context.ts` and `lib/archive-vibe.ts` call `extractStoryProfile` independently for SEO metadata and archive-level (not per-story) vibe — separate branches, not part of rendering.

## 2. Dimension inventory — how many outcomes are actually reachable

| Dimension | Where defined | Nominal size | Realistically reachable |
|---|---|---|---|
| Look (the master dial) | `looks.ts`, 13 keys | 13 | ~5–6 for ordinary prose with no strong keyword hit (minimal, essay, fieldnotes, postcard, maximal, eighties — the six with `base ≥ 0.3`); the other 7 (diving, paris, noir, neon, wanted, space, ember) need a specific trigger word (eiffel, neon, galaxy, campfire, etc.) |
| Palette | `palettes.ts`, 13 keys | 13 | 1:1 fused to Look — no independent selection. Within one palette, real per-story hue jitter exists (±18–55° for most), but `noir` and `space` are hue-locked at ±4°/±6° — near-monochrome regardless of story |
| Typography | `typography.ts`, 9 font bundles | 9 | 4 of 13 palettes (minimal/maximal/postcard/eighties — "the original four") carry no `fonts` field and share one default — so type genuinely diverges for only 9 of 13 worlds |
| Environment/backdrop | `backdrops.ts`, 22 keys | 22 | Visible contrast mostly comes from a 4-tier `ENERGY` lookup (quiet/warm/vivid/electric) gating paper/ink ratios plus 2 accent hexes — not 22 distinct visual systems |
| Mood/atmosphere | `atmosphere.ts`, 9 `MoodSpec`s | 9 | Only 2 reachable (cinematic/quiet) for any story that trips neither an EMOTION nor NARRATIVE cue — a real, common case (see §4) |
| Composition | `compositions.ts`, 9 keys | 9 | Look-bound (1 per Look, several Looks share one) — reachable diversity ≤ 13, and 2 of 9 (`stage`, `edge-world`) have **no CSS rules at all**, rendering as unstyled default |
| Art style | `art-styles.ts`, 7 keys | 7 | Look-bound; 4 of 13 Looks share `editorial-clean` alone. The style's own `cues`/`moodAffinity` fields are defined but **never read by any scoring function** — dead code, not an independent axis |
| Material (paper texture) | `materials.ts`, 6 keys | 6 | Two numeric knobs only (grain 0.4–0.8, contrast 0.82–1.25); values cluster tightly — subtle variation on one texture, not 6 distinct textures |
| Ambient motion | `ambient-motion.ts` | 4 motifs | In practice a 2–3 outcome space ({motes, bloom} or {}), gated mostly by one boolean (`motionIntensity !== "still"`) |
| Doodle/artwork choice | `pickArtwork()`, `components/doodles/registry.ts` | 61 motifs | Real when `profile.objects` fires; when it doesn't (common), falls to a 17-entry fixed environment→doodle map — **the same doodle, every time, for a given environment**, never varied |
| Hero subject | `subject.ts`, 20-entry `SUBJECT_CUES` | 20 keys | Only 2 of 20 (`whaleshark`, `eiffel`) have a real photographic cutout (`public/subjects/`); the other 18 fall back to a plain SVG line doodle |
| Format | `formats.ts`, 13 keys | 13 | Driven by Look's `format` hint (filtered by a min-beat-count gate) — a *second*, separate mood-affinity table (`AFFINITY`) also claims to rank format, reconciled ad hoc in the editor |

Randomness is fully and deliberately deterministic (`seedHash` + xorshift `rnd()`, no `Math.random`) — correct per the "no LLM, no network" design constraint. The constraint that actually narrows variety is the *width of the seed-tie-break band* (0.72–0.92 depending on call site) combined with a small number of curated lexicon entries, not a lack of seeding.

## 3. Filters audit

### 3.1 What's exposed to writers today

The only writer-facing selector UI is four plain, unlabeled `<select>` dropdowns in `app/write/[id]/editor.tsx` (~lines 226–248), inside a collapsed-by-default "Details & shaping" `<details>` panel, with no helper text and no live thumbnail previews beyond the shared preview pane:

- **Format** — auto + 13 `FormatKey`s (standard, scrapbook, letter, poster, ticket, notebook, gallery, film, ransom, marquee, postcard, listicle, crawl).
- **Mood** — auto + 9 keys (quiet, dreamy, raw, playful, cinematic, warm, romantic, restless, chaotic).
- **Visuals** — auto, minimal, illustrated, collage, maximal (a `VisualIntensity` enum).
- **World** — auto + ~30 backdrop keys (coast, forest, highland, meadow, heat, desertroad, dawn, city, nightcity, underwater, reverie, …).

**Look** (13 keys: minimal, maximal, postcard, eighties, diving, paris, noir, neon, wanted, space, fieldnotes, essay, ember) has **no UI control at all** — always auto-picked, never chosen. It is the actual load-bearing concept and the writer can only nudge it indirectly via Mood/World.

### 3.2 What each current control (or hidden concept) actually writes downstream

- **Format**: controls which whole page renderer/stage is used. Decided by *two* competing heuristics — Look's `format` hint (e.g. `paris→postcard`, `space→crawl`, `wanted→poster`) filtered by a beat-count gate, **and** a separate mood-affinity `AFFINITY` table in `formats.ts` used for the picker's ranking — reconciled ad hoc, not by one rule.
- **World**: controls Backdrop.tsx's rendered `layers`, light `scheme`, and feeds `scoreEnvironments` into Look scoring and one `pickAmbientMotion` rule (`headlights` for nightcity/nightroad). Its own `accent`/`secondaryAccent`/`paperTint` fields are **dead** for any art-directed story — `StoryView.tsx` always prefers the palette's accent (which comes from Look, not World) and only falls back to World's colour for legacy pre-migration rows.
- **Mood**: controls doodle `density`, voice `budget` (how many beats get a non-default voice), and `energy`/`spatialOpenness`/`motionIntensity` (animation pacing). Its own `accent`/`secondaryAccent` fields are dead for the same reason as World's. Also feeds Look scoring (+3 for a mood match) and one ambient-motion rule (wants motes).
- **Visuals**: controls doodle count (1–4) and fill treatment (line vs. filled), and whether stock imagery is allowed at all. In the editor it *also* recomputes doodle density via a second, separate hardcoded map that silently overrides Mood's density contribution when Visuals is set to non-auto — while Mood's voice-`budget` keeps applying regardless. Two numbers answering the same question.
- **Look (hidden)**: the actual union of palette + art style + material + composition + typography-default + visualIntensity-default + format-hint + an ambient-motion override. Nothing else in the app independently scores art style, material, or composition against the story text — they only exist as fixed properties of whichever Look wins.

### 3.3 Filter × property matrix (overlaps in bold)

| Property | Format | World | Mood | Visuals | Look (hidden) |
|---|---|---|---|---|---|
| Accent/palette colour | | **dead field, shadowed** | **dead field, shadowed** | | ● (real owner) |
| World layers/backdrop art | | ● | | | |
| Doodle density | | | **●** | **●(duplicate map, wins)** | |
| Voice budget (text mix) | | | ● | | |
| Motion tempo / ambient motion | | ●(1 rule) | ●(gates + 1 rule) | | **● (can hard-override everything)** |
| Doodle count / fill treatment | | | | ● | |
| Structural page renderer | **●** | | | | ●(hint, 2nd heuristic) |
| Typography | | | | | ● (+ palette + art-style, 3 sources, Look always wins) |
| Composition / spacing / rotation | | | | | ● (only reachable via Look) |
| Illustration technique (line weight, hatching, fill) | | | | | ● (only reachable via Look; own cues are dead code) |

Confirmed overlaps: accent colour (3 nominal owners, 1 real one — 2 dead fields left over from before art-direction shipped); doodle density (Mood and Visuals both claim it, Visuals silently wins, Mood's other effect — voice budget — still applies); motion/ambient effects (Mood, World, and Look all write into the same array, with Look able to override completely); format (Look's hint and a separate mood-affinity ranking table both claim to answer "what format suits this"); typography (three definitions nested, harmless only because Look always wins the race).

Dead/near-dead: World's `accent`/`secondaryAccent`/`paperTint`; ArtStyle's `cues`/`moodAffinity` (defined, never read); compositions `stage` and `edge-world` (no CSS at all).

### 3.4 UI confusion, read cold

"Visuals" (minimal/illustrated/collage/maximal) sounds like it should mean *how is it drawn* (the target VISUALS definition) but actually means *how much artwork/imagery density is allowed* — a loudness dial, not a technique dial. "World" reads correctly as a place picker, but a writer has no way to see that it also nudges Look (and therefore palette/art-style/composition/typography) — that entanglement is entirely invisible. There is no control at all today for illustration technique or for composition/layout — both exist as real systems, both are fully hidden inside Look.

### 3.5 First-pass mapping to the target 5

- **FORMAT** → keep `lib/formats.ts` largely as-is; retire the duplicate mood-affinity ranking so one heuristic decides it.
- **WORLD** → keep the existing World/backdrop control; strip the dead colour fields once palette ownership is made explicit; this is the filter closest to already matching its target definition.
- **MOOD** → keep the existing Mood control; strip its overlapping density contribution so density lives only in VISUALS; widen the NARRATIVE fallback (see §5) so more stories reach a mood other than quiet/cinematic.
- **VISUALS** → does not exist today as "illustration technique." Needs to be built by extracting ArtStyle + Material from inside Look and giving them their own independent scoring against the story text (their `cues`/`moodAffinity` fields already exist in the code, just unused) — plus renaming the current "Visuals" (density/imagery-loudness) concept, since VISUALS is claimed by the new meaning.
- **LAYOUT** → does not exist today as a standalone concept. Needs Composition extracted from inside Look and independently scored/exposed; also needs to be disentangled from Format, since both currently touch structural page shape.
- **Look** as a bundle should stop existing as a single hidden selection; it should decompose into the pieces the 5 target filters need, with the "which of 13 aesthetic packages" idea most closely inherited by VISUALS + WORLD together rather than surviving as its own axis.

## 4. Convergence: 10 real stories run through the live engine

Method: found a genuine pure-function path with no DB/network dependency — `extractStoryProfile(text)` (`lib/semantic-profile.ts`) feeding `generateArtDirection(text, profile)` (`lib/art-direction/generate.ts`), the same path `app/dev/preview/page.tsx` already uses for its own QA. Ran via `npx tsx` against the real repo (not a manual trace) on 10 stories written to be as different as possible in vocabulary, place, emotion and pacing: grief (a parent's death), travel (solo trip abroad), childhood (grandmother's kitchen), breakup, a recipe, a startup/quit-my-job story, a love letter, a funny mishap, a hospital stay, a festival.

| story | format | environment | look | mood | energy | artStyle | palette | topEmotion | topNarrative | topPlace |
|---|---|---|---|---|---|---|---|---|---|---|
| grief | standard | window | minimal | quiet | quiet | editorial-clean | minimal | lonely | grief | — |
| travel | postcard | city | paris | quiet | quiet | vintage-postcard | paris | lonely | — | city |
| childhood | postcard | cafe | paris | quiet | quiet | vintage-postcard | paris | — | — | home |
| breakup | poster | heat | wanted | raw | electric | screenprint-poster | sepia | melancholic | breakup | — |
| recipe | standard | reverie | minimal | quiet | quiet | editorial-clean | minimal | — | — | coast |
| startup | standard | cafe | minimal | quiet | quiet | editorial-clean | minimal | lonely | transition | home |
| love letter | standard | window | minimal | quiet | quiet | editorial-clean | minimal | peaceful | — | train |
| mishap | letter | cafe | ember | restless | vivid | storybook-paint | ember | anxious | celebration* | — |
| hospital | standard | window | minimal | quiet | quiet | editorial-clean | minimal | — | — | city |
| festival | poster | city | wanted | raw | electric | screenprint-poster | sepia | — | failure* | city |

\* both flagged as false positives — see mechanism 4 below.

**4 distinct formats, 4 distinct looks, only 3 distinct mood/energy pairs, 4 distinct palettes** across 10 deliberately different stories. Look/format/artStyle/palette are near-perfectly correlated with each other — not 4 independent axes, one axis expressed 4 ways. Seven of ten (grief, travel, childhood, recipe, startup, love letter, hospital) land on identical `mood: quiet / energy: quiet`; five of those seven also land on identical `look: minimal / format: standard / artStyle: editorial-clean / palette: minimal`. A parent's death, a solo trip to Lisbon, a grandmother's kitchen, a dal recipe, quitting a job to found a company, and a hospital stay all render with the same mood, energy, art style and palette.

**Traced mechanisms** (not guesses — confirmed against the actual regex tables and scoring code):

1. **Emotion is checked before narrative, and a 13→9 map collapses fast.** `inferMood()` checks EMOTION signals before NARRATIVE signals. `EMOTION_TO_MOOD` maps both `lonely` and `peaceful` to `quiet`. The grief story's dominant signal wasn't its correct `grief` NARRATIVE cue (which would map to `raw`) — it was `lonely`, tripped by the word "nobody," which wins first and never lets the narrative signal be consulted. A story about losing a parent gets the identical atmosphere as a cheerful travel story and a recipe.
2. **`minimal` is an engineered gravity well.** Its affinity in `looks.ts` is `{ moods: ["quiet"], energies: ["quiet"], base: 0.9 }` — the code's own comment calls it "the calm centre — the default a plain story lands on." With +3 for a mood match and +1 for energy, any `mood: quiet` story starts `minimal` near 4.9 before any place/cue signal is weighed. Since mechanism (1) pushes 7/10 stories to `mood: quiet`, most of them don't generate enough competing signal to beat that head start.
3. **NARRATIVE_CUES (13 entries) returned zero signal for half the sample.** Travel, childhood, recipe, love letter, and hospital all scored `topNarrative: null` — none of their vocabulary matched any of the 13 curated narrative keys. The one axis meant to answer "what kind of story is this" is blind to five structurally very different stories simultaneously.
4. **Where NARRATIVE_CUES did fire, two of five fired on the wrong word.** Confirmed by direct regex grep: the mishap story ("every dinner party I've ever hosted") tagged `celebration` purely because of the standalone word "party." The festival story ("clothes ruined beyond saving" — a positive, joyful detail) tagged `failure` purely because of the word "ruined." Neither lexicon entry has negation or sentiment awareness.
5. **PLACE signal is frequently absent**, and `window` alone accounts for 3 of 10 environments (grief, love letter, hospital) as a fallback for thin place signal, not a deliberate choice each time.

This is a defensible, code-grounded basis for "every story renders too similarly" — traceable to three specific, named points (`atmosphere.ts`'s emotion-before-narrative ordering, `looks.ts`'s `minimal` default gravity, and `semantic-profile.ts`'s narrow/occasionally-wrong NARRATIVE_CUES table), not vague impression.

## 5. Doodle audit

Doodles are **not static assets** — `components/doodles/registry.ts` defines 61 distinct motifs as hand-authored coordinate data (point-array functions, not SVG files or images), covering hero subjects, sky/weather, water, land, vehicles, objects/people, and marks. `components/doodles/Doodle.tsx` runs each doodle's points through a seeded xorshift RNG to jitter them (±wobble, default 2.6) and fits a Catmull-Rom spline through the jittered points to produce the final SVG path plus a stroke-length estimate for `stroke-dashoffset` draw-in — genuinely procedural per-render variation from shared coordinate data, matching the file's own "imperfection is generated, not faked" claim.

Animation is **entirely CSS**, no library (`package.json` confirms no framer-motion/gsap/react-spring/lottie anywhere). `app/globals.css`/`app/worlds.css` hold the stroke-draw reveal (triggered by a scroll-driven `.arrived` class) and 8 gesture keyframes (`lp-breathe`, `lp-loop`, `lp-swim`, `lp-escape`, `lp-follow`, `lp-fret`, `lp-collide-l/r`) — all animating only `transform`/`opacity`/`stroke-dashoffset`. This is the ceiling and the floor of "living doodles" today: real hand-drawn variation per render, but only 8 possible gesture behaviours applied per-doodle, not staged/progressive per story beat, and no idle ambient life (breathing/swaying/drifting) beyond whichever single gesture a doodle was assigned.

The hero-subject system (`subject.ts`, `SubjectLayer.tsx`) has a **real photographic layer for only 2 of its 20 lexicon entries** (`whaleshark`, `eiffel` — actual PNG cutouts in `public/subjects/`, rendered via a raw `<img>` tag, not `next/image`); the other 18 subjects fall back to the plain SVG line doodle. `signature.ts`/`Signature.tsx` already implement something close to the spec's requested "per-story signature element": one recurring doodle with a narrative-driven arc (grows/shrinks/fades/separates/converges/steady) bound to scroll depth — a good foundation to extend for progressive/beat-keyed sketching.

`ambient-motion.ts` is a small, separate, 4-motif system (headlights/paperdrift/motes/bloom), gated by simple booleans — in practice a 2–3 outcome space, the weakest link in "the page feels alive" today.

## 6. Performance & accessibility audit

`prefers-reduced-motion` is respected broadly — ~20 individual media-query blocks across 8 files (mostly `globals.css`, plus `worlds.css`, two page components, the editor, and JS-level `matchMedia` checks in `TryIt.tsx`/`WanderField.tsx`) — but as many targeted per-effect overrides rather than one systemic gate. Coverage is good today; a newly added `@keyframes`/`animation` rule could in principle ship without a matching override, since there's no single central switch enforcing it.

Animation targets only `transform`, `opacity`, and `stroke-dashoffset` — no layout-triggering box-model properties found animated anywhere. Scroll handling (`components/living/StoryFrame.tsx`) is a single rAF-throttled listener with an explicit design goal (per its own header comment) of not restyling the document every frame: `--depth` is quantized to 20 buckets and only written when the bucket changes. This is the strongest engineering signal in the codebase and should be preserved/reused, not rebuilt, for Phase 2's progressive-sketch scroll mechanism.

Mobile handling is present but shallow: no JS-driven doodle-count reduction, just one CSS rule dimming doodle opacity under 900px and a `pointer: coarse` check in one hover-driven component. No measured-performance artifacts (no Lighthouse/60fps references in source) were found — the perf discipline visible in the code (rAF throttling, compositor-only properties) appears to be good instinct/practice rather than the product of instrumented measurement, which matters for Phase 2's "60fps on mid-range Android" and "Lighthouse ≥ 95" requirements: there's a solid foundation, but no existing baseline number to compare against.

The two checked-in subject PNGs bypass `next/image` (raw `<img>` tag with an eslint-disable) — a minor, easily fixed gap on an otherwise careful codebase.

## 7. Ranked root causes

1. **One hidden concept (`Look`) owns five jobs at once**, and is never itself independently scored per-property — palette, art style, material, composition, and a typography/visualIntensity/format default all move together or not at all. This is the single largest cause of convergence: variety that looks like 5 axes is actually 1 axis expressed 5 times.
2. **`minimal` is an engineered default with a strong head start** (`base: 0.9`), and a large share of ordinary prose is funneled toward it by root cause 3.
3. **Mood is decided by a narrow, ordered fallback** — emotion cues checked before narrative cues, collapsing to a hard binary (quiet/cinematic) when neither fires, which is common for plain prose. A single incidental word ("nobody," "missed") can steer an entire story's atmosphere.
4. **NARRATIVE_CUES is too small and unqualified** (13 entries, no negation/sentiment awareness) — it returns no signal for roughly half of ordinary writing and occasionally fires on the wrong word (party→celebration, ruined→failure).
5. **No filter today maps to VISUALS (illustration technique) or LAYOUT (composition)** as independently-scored, writer-visible concepts — both exist as real coded systems but are trapped inside Look.
6. **Overlapping ownership of shared properties** — doodle density (Mood vs. Visuals), motion/ambient effects (Mood vs. World vs. Look), format (Look's hint vs. a separate affinity table), typography (three nested sources) — small day-to-day confusions layered on top of root cause 1.
7. **Doodle motif selection falls back to one fixed map** when a story names no concrete objects, so the *filler* doodles (not the hero) repeat identically across unrelated stories in the same environment.
8. **The hero-subject system's photographic layer only covers 2 of 20 lexicon entries** — most "signature" visual moments are the generic SVG fallback, not a distinctive image.
9. Minor: dead fields (World's/Mood's shadowed accent colours, ArtStyle's unused cues, two CSS-less compositions), and a leftover `_to_delete/` backup directory.

## 8. Proposed architecture (for approval)

**Decompose `Look` into the 5 independently-scored filters**, each with its own scoring function against the story profile (mirroring the existing `scoreEnvironments`/`scoreLooks` pattern, which is a good template to reuse):

- `resolveFormat(profile)` — keep `lib/formats.ts`'s core, retire the duplicate `AFFINITY` ranking, make the format decision the single source of truth `curatedFormats` also reads.
- `resolveWorld(profile)` — keep `lib/backdrops.ts` mostly as-is; drop the dead colour fields once VISUALS owns palette explicitly; this axis is already closest to healthy.
- `resolveMood(profile)` — keep `lib/art-direction/atmosphere.ts`'s bundle, but (a) check NARRATIVE before EMOTION or blend them instead of a strict priority order, (b) widen NARRATIVE_CUES and add basic negation handling, (c) strip its doodle-density ownership so VISUALS owns density alone.
- `resolveVisuals(profile)` — new: extract `ArtStyle` + `Material` from Look, wire up their already-defined-but-unused `cues`/`moodAffinity` fields into a real scorer, and fold the current "Visuals" (density/imagery-loudness) concept in as one property this filter owns rather than a competing filter.
- `resolveLayout(profile)` — new: extract `Composition` from Look, give it a real scorer, fill in the two CSS-less compositions (`stage`, `edge-world`) or retire them, and make rotation/overlap/spacing explicitly its own properties rather than Format's.

Each resolver would take `(profile, seed, locked?: Partial<...>)` and the five results compose into the render spec in a fixed order, with a property-ownership table (essentially §3.3 turned into an enforced type/test) so a build-time or test-time check can fail if two resolvers ever write the same property again — directly answering the Phase 2 requirement ("fail a test if two layers write the same property").

Palette itself should probably become owned by VISUALS+WORLD jointly in a disciplined way (palette *family/temperature* from WORLD's environment + energy, specific hue jitter from VISUALS' material/technique) rather than continuing to be a 13-way enum 1:1 with the old Look — worth a design discussion before Phase 2, flagged here rather than decided unilaterally.

The doodle/subject/signature/ambient-motion systems are largely sound and should be extended, not rebuilt: keep `Doodle.tsx`'s wobble+spline mechanism, extend `Signature.tsx`'s narrative-arc idea into the beat-keyed progressive sketch Phase 2 wants, widen the 4-motif ambient system and the 8-gesture set, and invest specifically in the hero-subject photographic-cutout gap (2/20) and the object-less doodle fallback (currently one fixed doodle per environment).

## 9. Mapping current filter options to the target model (keep / merge / rename / drop)

| Current concept | Target filter | Action |
|---|---|---|
| `lib/formats.ts` (13 formats) | FORMAT | **keep**, drop the duplicate mood-affinity ranking table |
| `lib/backdrops.ts` (22 backdrops) | WORLD | **keep**, drop dead `accent`/`secondaryAccent`/`paperTint` fields |
| `lib/art-direction/atmosphere.ts` (9 moods) | MOOD | **keep**, rebalance emotion/narrative priority, drop density ownership |
| Current "Visuals" UI control (minimal/illustrated/collage/maximal) | — | **rename/repurpose** — becomes one property *inside* the new VISUALS filter (imagery loudness), not the filter itself |
| `lib/art-direction/art-styles.ts` (7 styles) | VISUALS | **promote** from Look-bound dead-cue attribute to an independently-scored filter |
| `lib/art-direction/materials.ts` (6 materials) | VISUALS | **merge in** as a property VISUALS owns |
| `lib/art-direction/compositions.ts` (9 compositions) | LAYOUT | **promote** from Look-bound attribute to an independently-scored filter; drop or restyle `stage`/`edge-world` |
| `lib/art-direction/looks.ts` (13 Looks, as a bundle) | — | **drop as a monolithic concept** — its useful parts (scoring pattern, specific style/composition/palette pairings as *starting presets*) get redistributed into the 5 resolvers above |
| `lib/art-direction/palettes.ts` (13 palettes) | VISUALS + WORLD | **rework** — needs a design decision (see §8) rather than a mechanical move |

---

Waiting for approval before Phase 2 implementation.
