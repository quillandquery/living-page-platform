# Living Page — Design Tokens & Style Guide (locked)

The single source of visual truth. Implement as CSS custom properties in
`app/globals.css`. Two regimes (Decision D8): **Product UI** (homepage,
editor, dashboard, auth — light/bright/calm) and **Reader Output** (published
stories — dynamic, per-world, may go dark). Do not invent values per
component; if something is missing here, add it here first.

No Tailwind. No hard-coded hex in components — reference the tokens.

---

## 1. Colour — Product UI

Bright, warm-paper ground; dark ink; bold colour used as **interaction
state**, not decoration (PRD §9). Muddy gradients and dark neutrals are banned
as dominant fields.

```css
:root{
  /* ground & ink */
  --paper:        #FBF6EC;  /* creamy paper — default background */
  --paper-2:      #FFFFFF;  /* raised cards */
  --paper-3:      #F3ECDD;  /* sunk wells */
  --ink:          #1A1816;  /* primary text */
  --ink-soft:     #4A4642;  /* secondary text */
  --ink-mute:     #8A837A;  /* tertiary / hints */
  --line:         #E7DFCE;  /* hairlines, borders */

  /* the bright set — semantic names, use as accents & states */
  --sun:          #FFC53D;  /* sunshine yellow */
  --tomato:       #F0492E;  /* tomato red */
  --electric:     #2D6BF0;  /* electric blue */
  --grass:        #1F9E5A;  /* phthalo/grass green */
  --orange:       #FF8A3D;
  --cobalt:       #2947C4;
  --lilac:        #9B7EDE;
  --turquoise:    #17C4C4;
  --coral:        #FF5C7A;  /* hot coral */

  /* default brand accent (rotates on interaction) */
  --accent:       var(--electric);
}
```

**Usage rules**
- One dominant accent on screen at a time; let it *shift* on interaction
  (hover blooms colour, scroll shifts palette, section change swaps accent).
- Text stays `--ink` on `--paper`; never low-contrast grey body text.
- The bright colours are for accents, fills-on-hover, doodles, and state — not
  full-bleed backgrounds (except deliberate momentary "it rained for 5s" beats).

## 2. Colour — Reader Output
Reader output keeps the existing per-story engine: a story sets **one**
`--accent` (from Auto or Mood) and everything derives from it via `oklch(from
var(--accent) …)` and `color-mix`. A dark **world** overrides the scheme via
`schemeVars()` (see `lib/backdrops.ts`). Do not apply the Product-UI palette to
reader output. Rule stays: **one accent per story** (PRD §9, existing CLAUDE
guardrail).

## 3. Typography
Keep the four installed families (`app/layout.tsx`, `next/font/google`) — they
are good and already loaded:

| Token | Family | Role |
|---|---|---|
| `--f-body` | Newsreader | reading text, UI body |
| `--f-disp` | Instrument Serif | display / hero / story titles |
| `--f-hand` | Caveat | handwritten voice, doodded margins, playful labels |
| `--f-mono` | Space Mono | metadata, stamps, eyebrows, system chrome |

**Scale** (rem, 16px base). Product UI uses `ui-*`; hero/story display uses
`display-*`.

```
--fs-xs:   0.75rem;   /* 12 — eyebrows, stamps, mono chrome */
--fs-sm:   0.875rem;  /* 14 — hints, captions */
--fs-base: 1rem;      /* 16 — body */
--fs-md:   1.25rem;   /* 20 — lead, card labels */
--fs-lg:   1.75rem;   /* 28 — section headline (mobile) */
--fs-xl:   2.5rem;    /* 40 — section headline */
--fs-2xl:  clamp(2.75rem, 7vw, 4.5rem);  /* hero H1 */
--fs-3xl:  clamp(3.5rem, 12vw, 8rem);    /* homepage statement moments */
```
Weights: 300/400/500 (Newsreader), 400 (Instrument). Measure: body `38rem`
max; hero unconstrained. Line-height: body 1.55, display 1.02–1.1.

## 4. Spacing (4px base)
```
--s-1: .25rem;  --s-2: .5rem;  --s-3: .75rem; --s-4: 1rem;
--s-6: 1.5rem;  --s-8: 2rem;   --s-12: 3rem;  --s-16: 4rem;
--s-24: 6rem;   --s-32: 8rem;  --s-48: 12rem; /* section rhythm */
```
Page gutter: `max(1rem, 4vw)` on the outer wrapper; content max-width `66rem`.

## 5. Radius, elevation, texture
```
--r-sm: 4px;  --r-md: 10px;  --r-lg: 18px;  --r-pill: 999px;
--shadow-soft: 0 2px 10px rgba(26,24,22,.06), 0 12px 30px rgba(26,24,22,.05);
--shadow-lift: 0 6px 18px rgba(26,24,22,.10), 0 20px 48px rgba(26,24,22,.10);
--grain: .04; /* subtle paper grain overlay opacity */
```
Rounded but not "SaaS": prefer `--r-md`/`--r-lg`. **No glassmorphism, no dark
gradients, no neon glow** (PRD §29 "avoid").

## 6. Motion vocabulary

### Easing (named curves)
```
--ease-entrance: cubic-bezier(.2,.8,.3,1);   /* arrive & settle (default) */
--ease-soft:     cubic-bezier(.4,0,.2,1);     /* calm UI transitions */
--ease-exit:     cubic-bezier(.4,0,1,1);      /* leave */
--ease-spring:   cubic-bezier(.2,1.25,.3,1);  /* playful overshoot */
--ease-linear:   linear;                      /* rain, drift, continuous */
```
### Durations
```
--dur-quick: 160ms;  --dur-base: 320ms;  --dur-slow: 640ms;
--dur-dwell: 1200ms; /* a held reveal, Press meter */
```
### Global motion scale
Reader honours a `--motion` multiplier (0 = still … 1.5 = wild) set from the
story's Motion control; components multiply durations/travel by it. `0` ⇒ swap
motion for fades/static (also the `prefers-reduced-motion` behaviour).

## 7. Animation "personalities" (mood → art direction)
The locked mapping the Auto engine uses. Each mood sets the accent, how busy
the margins are (`density`, 0–10 → engine `doodleDensity`), how many lines may
leave plain speak (`budget`, 0–1 → engine `voiceBudget`), the motion scale, and
the easing personality. This table *is* the "coherent art direction" guarantee.

| Mood | Accent | Density | Budget | Motion | Easing |
|---|---|---|---|---|---|
| quiet | `--electric` (muted) `#4C6A8A` | 2 | .18 | .5 | soft |
| dreamy | `--lilac` `#7A6CE0` | 5 | .34 | .8 | entrance |
| raw | `--tomato` `#D23B2E` | 3 | .30 | 1.0 | exit |
| playful | `--sun`/`--orange` `#F2A73B` | 7 | .34 | 1.15 | spring |
| cinematic | teal `#2E6E8E` | 5 | .26 | .7 | soft |
| strange | violet `#8A5CD0` | 6 | .38 | 1.0 | spring |
| warm | `--orange` `#C77D3A` | 4 | .26 | .7 | entrance |
| restless | `--cobalt` `#2B5BD0` | 6 | .34 | 1.3 | exit |
| romantic | rose `#D0567F` | 4 | .30 | .7 | soft |
| chaotic | `--tomato` `#E24A3B` | 9 | .46 | 1.5 | spring |

`warm` is the gentle default when Auto can't read a clear mood.

## 8. Behaviour library (curated — Decision D6)
Do NOT implement the PRD's full ~60-item motion list. Ship this curated set,
built on the existing `vocabulary.ts` axes; each is semantically distinct.

**Voice** (how the writing sounds — extends existing 8):
`whisper · speak · declare · shout · think · confess · question · echo · pause`

**Motion** (what scrolling/arrival does — ~20, maps to MOVE/GESTURE):
`appear · rise · fall · drift · float · scatter · gather · stretch · pulse ·
flicker · shake · reveal · erase · type · write · bloom · settle · orbit ·
snap · hold`

**Surface** (texture behaviours — Phase 2+, introduce gradually):
`ink-bleed · underline-draw · highlight-sweep · paper-reveal · grain-shimmer ·
sticker-pop · stamp-press`

**Semantic mapping examples** (engine rules): "I froze" → hold/settle;
"everything exploded" → scatter + scale; "I kept thinking about it" →
float/echo; "and then—" → hold/reveal.

## 9. Worlds (art-direction bundles, ~12 archetypes)
A world = `layers + scheme + accent + cue-words`. Bright-biased. Target set:
`coast · forest · highland · meadow · desert-heat · dawn · city · rainy-window ·
warm-interior · monsoon · neon-city · night-road · dreamscape`. Auto selects;
Advanced can override. **There is no "none".**

## 10. Accessibility tokens
- `prefers-reduced-motion: reduce` ⇒ `--motion: 0`; replace movement with
  fades/state changes; preserve typographic hierarchy (PRD §33).
- Minimum body contrast: `--ink` on `--paper` (≈13:1). Never ship grey-on-cream
  body text below 4.5:1.
- Focus: visible 2px `--accent` ring, offset 3px (existing).
- All motion pausable; off-screen animations paused.
