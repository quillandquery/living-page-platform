---
name: living-page
description: Design, write, or extend The Living Page — the travel-writing site where the sentence decides how it looks, sounds and moves. Use when adding a story, annotating a draft, or adding to the vocabulary.
---

# The Living Page

A living travel diary. Not an interactive travel blog.

> **Don't decorate the writing. Animate the meaning.**

The reader should not feel like they are scrolling a website with animations added to it. They should feel like they are moving through a memory.

`CLAUDE.md` carries the repo conventions; this carries the judgement.

---

## The thesis

**The sentence determines how it should look, sound, and move.**

Typography, motion and illustration are not separate layers. For every line that matters, ask in this order:

1. What is being said?
2. How would this sound out loud?
3. What emotional weight does it carry?
4. How should the type physically occupy the page?
5. Should anything move, appear, vanish, transform — or stay perfectly still?
6. Could a doodle extend, answer, or contradict the sentence?

Closer to spoken poetry, a visual diary, a handwritten notebook. Never Medium, Substack, a travel magazine, or a portfolio.

---

## The unit is the line

Never `paragraph → paragraph → paragraph → image`.

Always `line → voice → body → gesture → pause → line`.

A story is made of **scenes**, not paragraphs. A scene is a unit of attention and usually ends in a silence.

---

## The vocabulary

Four independent axes. Add to them only when a story genuinely cannot be told with what exists — the constraint is what makes the site read as one medium instead of a pile of effects.

### VOICE — how the writing sounds

| | for | reads as |
|---|---|---|
| `Speak` | narration, transitions, most of everything | grounded body serif, no movement |
| `Whisper` | intimacy, vulnerability, the observation you'd lower your voice for | small, soft, a lot of air |
| `Shout` | the turn, the revelation, the joke | display serif at scale, overshoots on arrival |
| `Thought` | what the narrator didn't say out loud | handwritten, loose baseline |
| `Drift` | dreams, water, disorientation, time behaving strangely | words separated and nudged off the line |
| `Echo` | the phrase that will not leave | repeats, shrinking and fading until gone |
| `Listen` | the last line, or the one before the silence | nearly empty screen, one line |

`Shout`, `Echo` and `Listen` stop working if used twice in a page. `Echo` is once a story at most.

### BODY — how the type occupies space

`tiny` · `normal` · `oversized` · `scattered` · `offset` · `handwritten` · `compressed` · `centered` · `edge` · `floating`

Each voice already has a body it wants. Pass `body=` only to argue with it.

### GESTURE — what the doodle does

`follow` · `underline` · `react` · `become` · `escape` · `collide` · `loop` · `scribble` · `reveal` · `trace` · `breathe`

### MOVE — what scrolling does

`enter` · `grow` · `move` · `transform` · `disappear` · `hold`

`hold` is the important one. Some scrolls should produce nothing at all.

---

## The doodle is a second narrator

Not illustration. Not icons. Never stock travel graphics, polished SVGs, or emoji as decoration. Hand-drawn, imperfect, slightly silly, personal — like something in the margin of a notebook.

It can watch, follow, react, interrupt, anticipate, contradict, or get ahead of the narrator. A `<Margin>` beat with no words is how the reader sees something *before the sentence admits it*:

```mdx
I didn't know what was waiting for me.

<Margin doodle="road" becomes="palm" gesture="become" side="left" />
```

Doodles live in `components/doodles/registry.ts` as a handful of points in a 100×100 box; the renderer jitters them per instance, so the imperfection is generated rather than faked. To add one, add points. Resist building a set.

---

## The living margin

The writing takes about 60% of the frame. The rest is stage, and the doodle lives there. The text tells one version; the margin tells another. This is the site's signature — protect it.

---

## PAUSE

`<Hold beats={3} />` is a deliberate silence. Negative space is an active element, not leftover room. A blank line in a draft becomes one automatically.

A story with no pauses has no pacing.

---

## Animation ratio

Roughly **70%** ordinary sentences · **20%** a different voice · **10%** a full interaction.

A 500-word story holds five to eight genuinely animated moments. They work as emotional punctuation; more than that and they become wallpaper. If everything moves, nothing feels alive.

The cadence to aim for:

```
normal · normal · normal → SHOUT → normal · normal → WHISPER
→ doodle reacts → silence → final line
```

Cinematic pacing, not UI animation.

---

## How to make a story

1. **Write the raw piece with no design in your head at all.**
2. Annotate the beats that earn it — voice, then body, then gesture.
3. Delete half of those.
4. Identify the three to eight moments that deserve full interaction.

`/studio` gives a machine first pass and reports the mechanical half of the quality bar. It is wrong often enough that you have to argue with it — which is faster than a blank page. The final call is always the writer's.

A bare MDX paragraph is already a `Speak` beat, so prose reads as prose in the source file and only the lines that need a different voice get wrapped.

---

## Restraint

Before keeping any animation, ask: **if I removed this, would the story lose something?** If no, remove it.

The writing is the hero. The visual system exists to make the writing more emotionally precise.

---

## Visual style

Prefer: imperfect lines, generous whitespace, mostly monochrome, one accent colour per story used as narrative punctuation, editorial typography, handwritten details, asymmetric layouts, slight rotation, uneven baselines, elements that feel placed rather than calculated.

Avoid: minimal-SaaS defaults, glassmorphism, gradients, rounded cards, dashboards, photo grids, icon libraries, UI chrome.

The imperfection is intentional; the interaction system underneath stays technically precise.

Colour is narrative, not decoration — one memory, one accent (Jeju → ocean blue, Komodo → dusty red). Never several colours in one story.

---

## Audio

No background music. Optional, subtle environmental sound at meaningful moments only — pen scratch, footsteps, waves, a train passing. The strongest audio feature is the writer reading the piece aloud while the text stays visible.

---

## The quality bar

Before a story is finished:

- Does it sound like a person telling me something?
- Does the typography change because the **emotional voice** changes?
- Does every animation have a storytelling reason?
- Does the doodle add a second layer, or is it decorating?
- Are there moments of silence?
- Is there one moment where the page does something unexpected?
- Are there enough static moments for the moving ones to matter?
- Could you recognise this as the same site without the logo?

`npm run check` covers the mechanical half. The rest is yours.

---

## North star

> Someone handed me their travel journal.
> Except the ink moves.
> The margins have a life of their own.
> And sometimes the page remembers things before I do.
