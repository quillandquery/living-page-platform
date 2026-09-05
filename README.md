# The Living Page

A living travel diary. Not an interactive travel blog.

> Don't decorate the writing. Animate the meaning.

The reader should not feel like they are scrolling a website with animations
added to it. They should feel like they are moving through a memory.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

- `/` — the archive. Stories are doorways, not article cards.
- `/stories/gokarna` — the reference story, annotated end to end.
- `/studio` — paste a raw draft, get a first pass, copy out the MDX.

---

## The unit is the line, not the paragraph

Never:

```
paragraph → paragraph → paragraph → image
```

Always:

```
line → voice → body → gesture → pause → line
```

Every beat is one thing said, in one voice, occupying space in one way,
optionally answered by one doodle in the margin.

---

## Writing a story

A story is an `.mdx` file in `content/stories/`. There is no registry —
the directory is the registry, and the filename is the slug. Write the
file and it is on the site.

**A bare paragraph is already a beat** in the SPEAK voice. That is the
single most important thing about this setup: prose reads as prose in the
source file, and only the lines that need a different voice get wrapped.
The 70/20/10 ratio is therefore the default rather than a discipline.

```mdx
---
place: "GOKARNA"
date: "14.03.2026"
fragment: "The night bus, and the ten minutes after I got down."
accent: "#2B3ED0"
---

<Scene id="the-sea">

The sea arrives before I see it.

<Shout>Salt first.</Shout>

<Speak doodle="bus" side="right" gesture="escape">
  I get down. The bus goes on without me, red lights going small.
</Speak>

<Hold beats={2} />

</Scene>
```

Write the piece first, with no design in your head at all. Then annotate
the beats that earn it. Then delete half of those.

---

## The vocabulary

Four independent axes, defined in `lib/vocabulary.ts`. Add to them only
when a story genuinely cannot be told with what is here — the constraint
is what makes the site read as one medium instead of a pile of effects.

### VOICE — how the writing sounds

| | for | looks like |
|---|---|---|
| `Speak` | narration, transitions, most of everything | body serif, grounded, no movement |
| `Whisper` | intimacy, vulnerability, the observation you'd lower your voice for | small, soft, a lot of air |
| `Shout` | the turn, the revelation, the joke | display serif at scale, overshoots on arrival |
| `Thought` | what you didn't say out loud | handwritten, loose baseline |
| `Drift` | dreams, water, disorientation, time behaving strangely | words separated and nudged off the line |
| `Echo` | the phrase that will not leave | repeats, shrinking and fading until gone |
| `Listen` | the last line, or the one before the silence | nearly empty screen, one line |
| `Ledger` | a time, a fare, a distance, a date — the factual aside | mono, tracked, in the accent, ruled down its left side |

`Shout`, `Echo` and `Listen` stop working if you use them twice in a page.

### BODY — how the type occupies space

`tiny` · `normal` · `oversized` · `scattered` · `offset` · `handwritten` ·
`compressed` · `centered` · `edge` · `floating`

Each voice has a body it wants; pass `body=` only to argue with it.

### GESTURE — what the doodle does

`follow` · `underline` · `react` · `become` · `escape` · `collide` ·
`loop` · `scribble` · `reveal` · `trace` · `breathe`

The doodle is a **second narrator**. It can answer the line, contradict
it, or get ahead of it — a `<Margin>` beat with no words is how the
reader sees something before the sentence admits it.

```mdx
<Margin doodle="road" becomes="palm" gesture="become" side="left" />
```

### MOVE — what scrolling does

`enter` · `grow` · `move` · `transform` · `disappear` · `hold`

`hold` is the important one. Some scrolls should produce nothing.

---

## PAUSE

`<Hold beats={3} />` is a deliberate silence — roughly `beats × 22vh` of
nothing. A blank line in the studio becomes one automatically.

Silence is an element, not leftover space. A story with no pauses has no
pacing, and the studio will say so.

---

## The living margin

The writing takes about 60% of the frame; the rest is stage. Doodles live
in `components/doodles/registry.ts` as a handful of points in a 100×100
box. The renderer jitters them per instance and smooths them into a
stroke, so no two are drawn the same way twice — the imperfection is
generated, not faked.

To add one, add points. Resist building a set.

---

## The veil

What is ahead of the reader sits blurred at its real size in its real
place: you see the shape and weight of what's coming but can't read it.
It resolves on arrival and never veils again, so you can always look
back. A story can opt out with `veil: false` in its meta.

The class is applied by script, so a page with JS disabled still reads in
full and nothing is ever parked at `opacity: 0` waiting on an observer.

---

## Animation ratio

Roughly:

- **70%** ordinary sentences
- **20%** a different typographic voice
- **10%** a full interaction

A 500-word story might hold five to eight genuinely animated moments.
They work as emotional punctuation; more than that and they stop being
punctuation and start being wallpaper.

`lib/annotate.ts` enforces this: when a draft pulls more voices than the
budget allows, the least confident of them are demoted back to `Speak`.
The engine loses its favourites first.

---

## The quality bar

Before a story is finished:

- Does it sound like a person telling me something?
- Does the typography change because the **emotional voice** changes?
- Does every animation have a storytelling reason? If you removed it,
  would the story lose something? If not, remove it.
- Does the doodle add a second layer, or is it decorating?
- Are there moments of silence?
- Is there one moment where the page does something unexpected?
- Are there enough static moments for the moving ones to matter?
- Could you recognise this as the same site without the logo?

`/studio` checks the mechanical half of that list. The rest is yours.

---

## Structure

```
app/
  page.tsx                 the archive
  stories/[slug]/page.tsx  frontispiece + the story + colophon
  studio/page.tsx          the first-pass workbench
  globals.css              voices, bodies, choreography, the veil
components/
  living/                  Beat, voices, Scene, Hold, Margin, Marks, StoryFrame
  doodles/                 the registry and the renderer
content/stories/           the writing
lib/
  vocabulary.ts            the four axes, typed
  annotate.ts              the first pass, the ratio guard, the quality bar
mdx-components.tsx         why a bare paragraph is already a beat
```

---

## North star

> Someone handed me their travel journal.
> Except the ink moves.
> The margins have a life of their own.
> And sometimes the page remembers things before I do.
