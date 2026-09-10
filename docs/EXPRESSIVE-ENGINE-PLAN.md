# The Expressive Engine — Audit & Extension Plan
*How to make every story look different, every scroll do something, the words dance, and the colour go bold — without losing coherence.*

## 1. What's there today (audit)

Four independent axes in `lib/vocabulary.ts`, all actually rendered in `app/globals.css`:

- **VOICES (8)** whisper · speak · shout · thought · drift · echo · listen · ledger  → `.v-*`
- **BODIES (10)** tiny · normal · oversized · scattered · offset · handwritten · compressed · centered · edge · floating → `.b-*`
- **GESTURES (11)** follow · underline · react · become · escape · collide · loop · scribble · reveal · trace · breathe → `.g-*`
- **MOVES (6)** enter · grow · move · transform · disappear · hold → `.mv-*`

Supporting systems:
- `lib/annotate.ts` — a keyword-lexicon scorer reads each line into a voice, then `enforceRatio()` demotes the weakest to plain `speak` to hold ~70% plain.
- `lib/backdrops.ts` — 16 worlds = a few SVG layers + one accent + keyword cues.
- `components/doodles/registry.ts` — ~38 doodles as jittered point-sets.
- `app/globals.css` — ONE `--accent` per story; every colour derived from it by low-percentage `color-mix`. Creed in the header comment: *"nothing here is loud… no surface shouts."*
- `app/write/[id]/editor.tsx` — `inferMood` + `inferWorld` (keyword) pick Auto; `MOOD_SPEC` maps a mood to `{accent, density, budget}` only.

## 2. Why every story looks the same (root causes)

1. **70% plain by design.** `enforceRatio` + a `voiceBudget` of ~0.3 means most lines end up `speak` / `normal` body / `enter` move. The *dominant texture* of every story is therefore identical: plain serif lines fading up.
2. **One accent, muted almost to nothing.** Paper is tinted 3.5–9%, ink 9%. Two stories with different accents still look ~90% the same warm-grey page. This directly contradicts the PRD's "colour as interaction state, bold and bright."
3. **Moves are 1:1 with voice.** `DEFAULT_MOVE` gives each voice exactly one move, so `speak` is *always* `enter`. With most lines being speak, nearly every line uses the same fade-up. No scatter, no per-word dance, no scroll-velocity.
4. **Doodles are gated rare.** A doodle needs a keyword hit AND a noise-gate pass AND spacing — so the "second narrator" seldom appears.
5. **World inference is coarse and dark-biased.** Generic prose falls back toward the default (`#2B3ED0` = night road). The most memorable worlds are the dark ones.
6. **A "world" is only background layers**, not the full art-direction bundle the PRD calls for (background + palette + type + motion + doodle language + density).

**The through-line:** the engine is tuned for *restraint*; the PRD wants *controlled maximalism*. This is a re-tuning + widening, **not a rebuild** — the four-axis architecture is exactly the right foundation.

## 3. The single highest-leverage idea: a per-story **variety seed**

Add one deterministic seed per story (hash of slug + first line). Feed it into every "pick one of the valid options" decision so two stories with identical structure still diverge:

- rotate the palette hue/energy within the mood's allowed range,
- choose among *several* valid moves for a voice (not one default),
- vary body (scale/placement) for emphasis lines,
- pick which doodles and which side,
- perturb backdrop layer params (density, drift, count).

Deterministic → the same story always renders the same way, but no two stories match. **This alone breaks the sameness**, and it's small: a `seed.ts` helper + threading `seed` through `annotate`, `StoryView`, `Backdrop`.

## 4. Extensions by axis (file-level)

### Colour — the biggest visual lever  (`globals.css`, `backdrops.ts`, `editor MOOD_SPEC`)
- Promote from *one muted accent* to a **palette**: `--accent`, `--accent-2`, `--pop`, carried per mood/world. Raise the paper/ink mix percentages for "alive" moods so colour actually shows.
- Add a **bright, light-first default** (PRD §9 palette: sunshine, tomato, electric blue, grass, coral, lilac…).
- Colour as **interaction state**: hover-bloom on beats, palette shift bound to scroll depth, accent change on scene transitions.

### Word behaviour — voices / moves / bodies  (`vocabulary.ts`, `annotate.ts`, `globals.css` keyframes)
- **Break the move↔voice 1:1.** Give each voice a *set* of valid moves; the seed + line meaning choose.
- **Add moves** (new keyframes): scatter, fall, rise, ripple, wave (per-word), stretch, smear, snap, type, drift-apart, gather. Map them to meaning (`"I froze"`→freeze/snap; `"everything exploded"`→scatter+scale).
- **Per-word dance:** stagger word animations (the `.word` `--i` index already exists for `mv-move`; extend it to more moves).
- **Raise the voiced share for energetic moods** so "playful/chaotic" genuinely move more than "quiet."

### Worlds / backgrounds  (`backdrops.ts`, new layers in `globals.css`)
- Make a world a **bundle**: `{layers, palette, typeFamily, motionFamily, doodleLanguage, density, scheme}`.
- Add worlds from the PRD (café, neon city, snow, fog, forest depth, train window, rooftop, dreamscape variants, underwater…) and new **layers** (neon, fog, snow, waves, foliage).
- Bright-bias the default so a story with no strong cue lands somewhere sunny, not on the night road.

### Mood  (`editor.tsx MOOD_SPEC` → a real art-direction map)
- Expand each mood to carry **palette + move-family + density + type family + motion energy**, not just `{accent, density, budget}`. This is what makes "playful" and "melancholic" feel like different mediums.

### Doodles  (`registry.ts`)
- Add point-set doodles for the common nouns still missing; add a few **texture/collage** layer types (tape, torn paper, stamp) as a new visual-layer kind; raise density defaults for immersive moods.

### Scroll & interaction  (`StoryFrame.tsx`, reader)
- Publish a `--vel` (scroll velocity) and richer `--depth` to CSS; bind some beats' transform to it (PRD §8.1). Parallax the backdrop layers on depth. Author pacing as **loud → quiet → loud → still** by tagging scenes. Add a few reader micro-interactions (hover a line → letters rearrange; a word follows the cursor briefly).

## 5. Recommended phasing

- **Phase 1 — re-tune for boldness + variety (fast, low risk, biggest delta).**
  Per-story seed; bolder palette + higher colour mix; break move↔voice and add ~6 moves; raise density/voiced-share for alive moods. Touches `vocabulary.ts`, `annotate.ts`, `globals.css`, `editor MOOD_SPEC`, one new `lib/seed.ts`.
- **Phase 2 — worlds as bundles + more worlds + more doodles.**
- **Phase 3 — scroll-velocity motion + reader interaction library + a live homepage demo** (PRD §7–8).
- **Phase 4 — LLM art-direction / blurb-refine** (the earlier "refine a blurb" feature) to infer world/mood/palette semantically instead of by keyword.

## 6. The one decision to make first

The original engine's creed is *"nothing shouts, 70% plain."* The PRD wants the opposite energy. Recommendation: **keep the coherence guardrails** (one palette per story, a ratio cap so it's not noise) but **flip the energy defaults** and **add the variety seed**. That gets you bold + different-every-time while staying one coherent medium — which is the whole promise.
