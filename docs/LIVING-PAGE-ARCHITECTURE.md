# Living Pages — from prototype to capability

*How to turn the hand-built living pages (airport, cartographer, noir, Chiswell)
into an engine that gives **any** story a living page. Written after the design
session that produced those prototypes; read it with `docs/DECISIONS.md` and
`docs/DESIGN-TOKENS.md`.*

---

## 1. What we actually learned (the invariants)

Every failed version failed against one of these. They are now hard rules the
capability must enforce, not style preferences:

1. **No header images.** A picture parked at the top is dead decoration ("Substack
   with a hero image"). The visual must be *present throughout* and *change as you read*.
2. **Elements stay with the words.** Art is co-located with the sentence it belongs
   to, or it's a continuous environment the words move through — never a banner,
   never a list of icon-beside-paragraph rows.
3. **Words unveil.** Reading is kinetic — words assemble/come into focus as you
   reach them. If it reads like flat blog text, it has failed.
4. **The environment evolves with the narrative.** The strongest device we found:
   one continuous scene that is *faint at the start and resolves/brightens as the
   story progresses* (Chiswell), or *builds element by element on scroll*
   (cartographer), or *reacts beat by beat* (airport). Static = dead.
5. **Restraint.** Most of the page is calm and readable; 2–3 genuine moments of
   surprise, not a page made entirely of surprises (this is PRD §32, and the thing
   the neon-wall version violated). Loudness is scarce and spent on the peaks.
6. **Motivated, never default.** Ground, palette and world derive from the story
   (a dusk essay → twilight; a thriller → cold noir). Arbitrary black / arbitrary
   neon are both tells of a lazy default.
7. **Premium, curated craft.** Hand-drawn SVG tops out at "tasteful editorial";
   anything procedural-random reads childish. Real art is a *curated, tagged
   library* (Decision D2), not generation and not clip-art.
8. **One coherent grammar per page** (PRD §32). One world, one accent system, one
   motion family — not a pile of effects.

The through-line: **a living page is one coherent world that evolves as it's read,
most of it quiet, with the words performing and a few earned surprises — all of it
chosen from the story, none of it defaulted.**

---

## 2. Where the code is today, and the gap

We already built most of the *brain*. What's missing is the *renderer* and the
*libraries* that produce the prototype experience.

**The brain (analysis) — largely done, in `brain/` (Python):**
- `pipeline.py` — text → `VisualProfile` (spaCy linguistics + sentence-transformers
  concept match against `concepts.py` + a HF emotion model + 8 visual dimensions).
- `narrative.py` — the story as an ordered timeline of **beats**, each classified
  into 14 narrative types, with per-beat energy + emotion.
- `grammar.py` + `vprofile.py` — per-beat `visualBehavior` + the `SceneGraph`
  (beats, energy arc, whole-story profile).

**The casting seam — started, in `lib/art-direction/` (TypeScript):**
- `from-visual-profile.ts` — `VisualProfile` → `StoryArtDirection` (mood, look,
  visual intensity, environment) — i.e. whole-story casting.
- `scene-to-blocks.ts` — `SceneGraph` → `Block[]` with the **restraint budget**
  (most beats plain, ≤2 loud). This already encodes learning #5.

**The existing renderer — rich but not "living":** `components/living/StoryView`,
`StoryRender`, `Beat`, the `vocabulary.ts` voice/body/gesture/move axes,
`formats/*`, `backdrops.ts`, the `art-direction` registries, `components/doodles/*`.
It renders a *good page*. It does **not** render the prototype experience
(continuous evolving world + word-unveil reading + co-located reacting elements).

**The prototypes — the target, but hand-built HTML** (`outputs/living-*.html`).
They prove the experience; nothing in the app produces it yet.

> **The gap in one line:** the brain can read any story into a scene graph; the
> prototypes show the target; **there is no renderer or library that turns the
> scene graph into the prototype.** That renderer + three libraries are the build.

---

## 3. The target architecture

A living page is composed from **three curated libraries**, and the brain **casts**
a story into them. Curated + closed is deliberate (Decision D6): it's what keeps
every story coherent instead of a pile of effects, and it's what lets *any* story
map to *something* good.

### Library A — WORLDS (the continuous environment)
A world is the evolving place the words live in. Each world is data +
a render recipe:
```
World = {
  key, palette (ground + one accent, motivated),
  scene: layered scene (SVG/canvas) — e.g. twilight street: lamp, booth, cobbles,
  evolution: how it changes while read — "brighten-with-progress" (Chiswell) |
             "build-on-scroll" (cartographer) | "react-to-beats" (airport),
  ambient: slow motion (rain, drift, flicker),
  scheme: light | dark (reader output may go dark — D8),
}
```
Target ~8–12 worlds (D6): twilight-street, antique-map-desk, noir-room,
dawn-coast, dream, warm-interior/ember, fog, paper/editorial (the quiet default).
The brain picks **one** world per story.

### Library B — BEHAVIORS (how the words perform)
The default behavior is **unveil** (words assemble as you reach them) — every beat
gets it. On top, a small set of **signature** behaviors, spent sparingly on the
energy-arc peaks: board-flip, dissolve, scramble, rush/scatter, fall, swell,
tremor, heartbeat, polyglot, draw-in. Target ~20–30 (D6). This generalizes the
existing `vocabulary.ts` axes rather than replacing them.

### Library C — ELEMENTS (curated artwork)
A tagged illustration set the worlds and behaviors summon by concept — the red
phone box, the suitcase, the lighter, map pieces. **Curated and commissioned, not
generated, not clip-art** (D2). Start ~20, grow. Seeded by `components/doodles/*`.
Crucially, elements are *optional*: abstract/internal stories (e.g. "Tuesday")
carry on world + word-unveil + typographic behaviors alone.

### The CASTING engine (the brain's real job)
Deterministic/heuristic where it must be fast (D1), ML-assisted offline where it
can be richer. Inputs: the `VisualProfile` + `SceneGraph` we already produce.
```
world      ← mood + top concepts + place           (from VisualProfile)
ground     ← world + overall energy                (motivated, never default)
evolution  ← the energy arc                         (brighten toward the climax)
per-beat behavior ← beat.type + beat.energy + cues  (restrained: mostly "unveil")
elements   ← concept matches per beat               (summon curated art; may be none)
```

### The RENDERER (`LivingStory`) — the missing piece
One component that composes the above and owns the *reading mechanics* the
prototypes share: a fixed world layer behind the column; scroll-progress drives
world evolution (a single `--lit`/`--progress` signal); each beat reveals word-by-word
on arrival; signature behaviors and summoned elements mount with their beats;
legibility is handled by type shadow, not a flat scrim; `prefers-reduced-motion`
collapses unveil → fade and freezes the world. This is the generalization of the
four prototypes into one data-driven renderer.

```
TEXT → [brain] VisualProfile + SceneGraph → [casting] world + per-beat behaviors +
       element summons → [LivingStory renderer] the page
```

---

## 4. How this accommodates ANY story

Because the libraries are curated **and** the casting always resolves to *something*:

- The brain extracts a `VisualProfile` + scene graph for arbitrary prose already.
- Casting maps those signals to the nearest world / behaviors / elements. When a
  story has no strong signal, it **degrades gracefully**: the quiet `paper`/dusk
  world + the base word-unveil reading + no summoned elements. So **every** story
  gets a tasteful, readable, gently-living page; richer stories (clear arc,
  recognizable concepts) earn more signature behaviors and summoned art.
- Restraint is enforced by the engine, not the content — so a story that *could*
  go loud everywhere still comes out mostly calm with a few peaks.
- Growth is data, not code (D6): new worlds / behaviors / curated illustrations
  extend reach without new code paths.

The honest limits: **art is the bottleneck.** The brain and behaviors scale
immediately; the Elements library has to be *commissioned and curated* (D2), so
breadth of summoned illustration grows with art investment, not code. And abstract
stories will always lean on world + type, not objects — which is fine, and the
engine must treat "no element" as a first-class, beautiful case.

---

## 5. Mapping to the repo (reuse vs. build)

**Reuse / extend:**
- `brain/*` — the VisualProfile + SceneGraph. Keep. (Resolve the D1 tension: the
  ML brain is a server/offline pass; keep a fast heuristic for live typing.)
- `lib/art-direction/from-visual-profile.ts` → grows into **world casting**.
- `lib/art-direction/scene-to-blocks.ts` → grows into **behavior casting** (its
  restraint budget already encodes learning #5).
- `lib/vocabulary.ts` + `components/living/Beat` → the base of the **Behaviors** library.
- `lib/backdrops.ts` + `lib/art-direction/*` registries → seed the **Worlds** library.
- `components/doodles/*` → seed the **Elements** library.
- `app/brain-test/*` → the proving ground; point it at `LivingStory`.

**Build (new):**
1. `components/living/LivingStory.tsx` — the renderer (world layer + word-unveil
   reading + scroll-progress evolution + behavior/element mount points + a11y).
2. `lib/living/worlds.ts` — the Worlds library (data + recipes).
3. `lib/living/behaviors/*` — the Behaviors library (incl. `unveil` as default).
4. `lib/living/elements/*` — curated illustration set, tagged by concept.
5. Casting extensions in `from-visual-profile.ts` / `scene-to-blocks.ts` to emit
   `{ world, ground, evolution, beats:[{behavior, elements}] }`.

---

## 6. Phased roadmap

- **Phase 1 — the renderer.** Port the prototype mechanics into `LivingStory`
  (one world "twilight-street" + unveil + brighten-with-progress). Drive it from a
  hand-written scene for Chiswell. Proves the generalization in-app.
- **Phase 2 — the libraries.** Worlds (~8), Behaviors (~20 incl. unveil), a first
  curated Elements set (~20). Re-create all four prototypes *from data*, not by hand.
- **Phase 3 — casting.** Wire the brain's VisualProfile + SceneGraph to cast
  world + per-beat behavior + element summons, restrained. Run on 20+ varied
  stories; tune graceful degradation.
- **Phase 4 — the art pipeline.** Commission/curate the tagged illustration
  library (D2); grow Elements. This is the long pole.
- **Phase 5 — product.** Fold `LivingStory` into the reader (additive, old stories
  keep rendering — D4); accessibility, performance, the writer's controls.

---

## 7. Open decisions

- **D1 (live vs. offline).** The ML brain can't run per-keystroke. Decide: fast
  heuristic casting for the live editor + the richer ML pass on save/publish.
- **The art bottleneck.** Who draws the Elements library, in what style, licensed how.
- **Writer control.** Fully-auto (the pitch) vs. light dials (mood/world override)
  — the engine should default to auto and allow nudging (PRD §14/§35: auto everywhere,
  no "none").
- **Accessibility as a gate**, not a toggle: reduced-motion must still read well.

**The one-sentence capability:** *the brain reads any story into a scene graph; the
casting spends a curated world, a few behaviors and some summoned art against that
graph under a restraint budget; and the `LivingStory` renderer plays it as one
coherent place that evolves as it's read — defaulting, always, to something quiet,
readable and alive.*
