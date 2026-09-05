# The Living Page

A living travel diary. Not an interactive travel blog.

> **Don't decorate the writing. Animate the meaning.**

The reader should not feel like they are scrolling a website with animations
added to it. They should feel like they are moving through a memory.

Full design grammar: `.claude/skills/living-page/SKILL.md`. Read it before
composing or annotating a story.

## Commands

```bash
npm run dev        # localhost:3000
npm run build
npm run typecheck
npm run check      # the quality bar over content/stories/*.mdx
```

`next/font` fetches from Google at build time. A build that fails with a font
error in a network-restricted environment is a network problem, not a code
problem.

## The rule everything else hangs off

The unit is the **line**, not the paragraph:

```
line → voice → body → gesture → pause → line
```

Never `paragraph → paragraph → paragraph → image`. A story is made of
**scenes**, not paragraphs.

## A bare MDX paragraph is already a `<Speak>` beat

`mdx-components.tsx` maps `p` to the SPEAK voice and injects every vocabulary
component into MDX scope, so a story file opens with writing rather than
imports and only the lines that need a different voice get wrapped.

This is load-bearing: it makes the 70/20/10 animation ratio the **default**
rather than a discipline. Doing nothing to a line costs nothing; making it
perform costs a wrapper. Don't undo it.

## The vocabulary is a closed set

Four independent axes in `lib/vocabulary.ts`:

- **VOICE** (8) — how the writing sounds: speak, whisper, shout, thought, drift, echo, listen, ledger
- **BODY** (10) — how the type occupies space
- **GESTURE** (11) — what the doodle does
- **MOVE** (6) — what scrolling does; `hold` means nothing happens

Add an entry only when a story genuinely cannot be told with what exists. The
constraint is what makes the site read as one medium instead of a pile of
effects.

## Animation ratio

Roughly 70% plain sentences, 20% another voice, 10% a full interaction.
`enforceRatio()` in `lib/annotate.ts` demotes the least-confident non-speak
beats back to `speak` when a draft exceeds the budget — the engine loses its
favourites first. `npm run check` reports the same for hand-written stories.

## Gotchas

- **`remark-frontmatter` is load-bearing, not cosmetic.** Without it the
  `---` fence parses as an `<hr>`, and `mdx-components.tsx` maps `hr` to
  `<Hold beats={2} />` — every story would open on a pause it never asked
  for.
- **`lib/story-blocks.mjs` must stay free of node imports.** The studio is a
  client component and imports it in the browser. Frontmatter *reading*
  (gray-matter) lives in `story-file.mjs` and stays on the server; writing
  lives in `story-blocks.mjs` because it only ever emits four known scalars.
- **The set of stories is fixed at build time.** `app/stories/[slug]/page.tsx`
  resolves the component through a template-literal `import()`, which the
  bundler turns into a context module over `content/stories/`. Dropping an
  `.mdx` onto a running production server does nothing until the next build.
  That path is relative on purpose — `@/` is not reliably understood as a
  context-module prefix.

- **Voice and body classes belong on `.words`, never on `.beat`.** `.v-speak`
  carries `max-width: 34ch`; on the beat that collapses the three-track grid
  and the writing column shrinks to about 90px. Move and gesture go on
  `.beat` — they choreograph the whole cell.
- **Nothing is ever parked at `opacity: 0` waiting on an observer.** The veil
  and every arrival animation are applied by script, so a page with JS
  disabled still reads in full.
- **Doodles are point sets, not path data.** `components/doodles/registry.ts`
  holds a handful of coordinates in a 100×100 box; the renderer jitters and
  smooths them, so the imperfection is generated rather than faked. To add
  one, add points.
- Scatter offsets ride on a `--tf` custom property so arrival animations land
  *on* the scatter instead of wiping it.

## Adding a story

1. Write the raw piece with no design in your head at all.
2. `content/stories/<slug>.mdx` — YAML frontmatter, then `<Scene>` blocks.
3. `npm run check`, then read it out loud.

There is no step where you edit TypeScript. **The directory is the registry
and the filename is the slug** — `lib/stories.ts` reads the content
directory, so a file that exists is a story that exists.

`/studio` gives a machine first pass and writes the file for you. It also
opens a story back up: `lib/story-blocks.mjs` parses a file into blocks, and
anything it cannot model — a `<Scene>`, a heading, a `<Press>`, a `<Mark>`
inside a line — comes back as an opaque block and is written out untouched.
That passthrough is what makes save safe on a hand-written piece; don't
weaken it. The studio is wrong often enough that you have to argue with it.
The final call is the writer's.

## Layout

```
app/              archive · stories/[slug] · studio · globals.css
components/
  living/         Beat, voices, Scene, Hold, Margin, Marks, StoryFrame
  doodles/        the registry and the renderer
  studio/         page.tsx (the workbench) · actions.ts (the only code that writes)
content/stories/  the writing, and the registry
lib/              vocabulary.ts (the four axes) · annotate.ts (first pass, ratio)
                  story-blocks.mjs (the block grammar + quality bar; client-safe)
                  story-file.mjs (frontmatter; server-only, pulls gray-matter)
                  stories.ts (discovery; server-only, pulls node:fs)
mdx-components.tsx
```

## Don't

- Don't add Tailwind or any CSS framework. The CSS is hand-written and the
  voices *are* the design system.
- Don't import an icon library or use stock SVGs for doodles.
- Don't add an animation without a storytelling reason. If removing it costs
  the story nothing, remove it.
- Don't use more than one accent colour in a story. Colour is narrative
  punctuation, set per story by `meta.accent`.
