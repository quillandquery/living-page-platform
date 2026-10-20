# The Brain (Claude API) — per-story art direction

**Status:** design spec (2026-10-19). Supersedes the "local models only" clause
of D1 for Stage 2 — see **D11** in `DECISIONS.md`.

The goal: **every story gets its own world, animation, doodles, and text
behaviour** — cast the way a human art director would, from a real read of the
story's tone, mood and vibe. This is Stage 2 of the two-stage brain (D1): the
fast TS director still runs live while typing; Claude runs **once on publish**
(or an explicit re-roll), returns a validated spec, we store it on the story,
and the reader renders from the stored spec. The API cost is per-publish, not
per-view; a bad API moment falls back to the deterministic director.

**One principle:** the LLM is the art *director*, not the *coder*. It emits a
validated **spec** (JSON, incl. sanitised SVG for bespoke art). We never inject
raw HTML/CSS/JS. Uniqueness comes from an open, expressive grammar, not from
arbitrary code.

The pipeline: `source text → StoryRead → cast a Style → ArtDirection → render`.

---

## 1. The Story Read — tone, mood, vibe

The diagnosis before the prescription. Controlled vocabularies (so it's
mappable) plus a little free text (for nuance). One read drives *every*
downstream decision, which is what keeps a page coherent while making every page
different.

```ts
StoryRead {
  tone:      Tone[1..3]        // ranked — the emotional read
  mood:      Mood              // the atmosphere
  vibe:      Vibe              // the voice / register
  form:      Form              // the shape of the piece
  domain:    Domain            // what it's about
  intensity: 0..1              // how loud it wants to be (quiet credo ↔ manifesto)
  concreteness: 0..1           // abstract introspection ↔ object-rich
  placeBound:  0..1            // placeless ↔ anchored to a real place
  timeStance: "retrospective" | "present" | "timeless"
  energyArc:  { shape: "rising"|"spike"|"flat-then-break"|"oscillating", climaxBeat: int }
  motifs:     string[]         // recurring words / objects / names
  objects:    string[]         // concrete things that could be drawn
  palette_feeling: string      // "cold blue dusk going gold", "bleached overexposed summer"
  one_line_read:   string      // the art director's gut take, one sentence
}

Tone   = tender | wistful | grieving | anxious | dread | euphoric | triumphant |
         wry | deadpan | angry | defiant | serene | awestruck | melancholic | playful | numb
Mood   = nostalgic | cozy | eerie | surreal | tense | serene | chaotic | intimate | epic | dreamy | stark | cold
Vibe   = confessional | lyrical | deadpan | journalistic | mythic | ironic | raw | ornate | minimal | breathless
Form   = memory | confession | investigation | list | rant | letter | collage | timeline | argument | scene | ode | field-notes
Domain = travel | grief | love | work | family | identity | place | creative | body | money | internet | youth
```

---

## 2. The Style Catalog

Every style declares **Expresses** (the reads it's *for*), **Not for** (reads it
must refuse), and **Distinct from** (how it differs from its nearest sibling).
Casting is motivated by these — never a default (D9 §6).

### Worlds (atmospheric — the story is *set inside* an environment)
The story's words flow through a continuous, evolving world. One family, many
moods; the specific world is chosen by `mood` + `palette_feeling`.

| World | Expresses |
|---|---|
| daylight | warm, neutral, reflective; the quiet default |
| meadow | calm, hopeful, pastoral; spring, growth |
| dawn-coast | sea / coast / dawn; hope, openness, arrival |
| ember-interior | cozy, domestic, tender; kitchens, homes, warmth |
| paper | essayistic, plain, cerebral; ideas over scenery |
| storm | turmoil, release, a reckoning with weather |
| twilight-street / city-overlook | a city at night; solitude, romance, being lost-then-found |
| noir-room | dread, fear, a thriller beat |
| dream | surreal, weightless, unreal |
| nocturne | night, stars, grief, awe, the cosmic |

**World — Expresses:** immersive emotional narrative, `placeBound↑`, a felt
atmosphere. **Not for:** listy, ironic, investigative, collage. **Distinct:** the
story is *inside* a place; mediums below make the text an *object*.

### Mediums (the text *becomes* an artifact)

**Lost Postcard** — one remembered place or person; wistful, nostalgic, longing.
*Expresses:* `memory`, wistful/melancholic, nostalgic, short, single-focus,
`placeBound↑`, retrospective. *Not for:* loud, present-tense, abstract.
*Distinct from Scrapbook:* **one** card, **one** longing — compact.

**Scrapbook** *(new)* — a *span* of many small moments: a whole trip, a summer, a
relationship, a year. Angled photos, ticket stubs, tape, washi, pressed flowers,
a map, captions. *Expresses:* `collage`/`list`, celebratory/tender/nostalgic,
`cozy`/`intimate`, `intensity:med`, many `objects`. *Not for:* a single tight
arc, dread, minimal. *Distinct from Postcard:* **many** fragments, accumulative —
"look at *all* of it."

**Evidence Board** — investigation, obsession, unease, suspicion; "something is
wrong and I can't place it." *Expresses:* `investigation`, anxious/dread/`wry`,
`tense`/`eerie`, `work`/`identity`. *Not for:* tender, celebratory, serene.
*Distinct from Brain Dump:* external *case* (clues, a culprit) vs internal churn.

**Maximalist Explosion** — a loud reckoning / declaration / manifesto: quitting,
a breakup, a defiant truth. *Expresses:* `intensity↑`, high arousal,
defiant/euphoric/angry, `confession`/`rant`, a single screaming word. *Not for:*
quiet, wistful, ceremonial. *Distinct from Movie Poster:* raw typographic chaos
vs one cinematic composed frame.

**Illuminated Manuscript** — the mundane made epic / sacred; dry ritual wit.
*Expresses:* `mythic`/`ironic`, the ordinary elevated, ceremony, lists of doom.
*Not for:* raw confession, breathless, present-tense panic. *Distinct from
Personal Mythology:* medieval *styling* of real text vs a symbolic dream-world.

**Underwater Dream** — submerged, meditative, surreal; text floats at depth,
light rays, slow drift. *Expresses:* `dreamy`/`melancholic`, `lyrical`,
grief/memory/poetry, `concreteness↓`, `timeless`. *Not for:* urgent, investigative,
loud. *Distinct from dream world:* depth-based hierarchy and submersion vs a
violet dreamscape backdrop.

**Movie Poster / Film Frame** — one cinematic, emotionally charged scene;
letterbox, grain, a dramatic title, a line as a subtitle, a timestamp.
*Expresses:* `scene`, tense/romantic, a single decisive beat ("she opened the
chat anyway"), `present`. *Not for:* sprawling, listy, serene. *Distinct from
Maximalist:* composed and cinematic vs chaotic and loud.

**Field Journal** — a naturalist's specimen study of a subject (a person, a
habit, a place): labels, diagrams, measurements, dry observational wit.
*Expresses:* `field-notes`/`list`, `wry`/`deadpan`, cataloguing a subject,
`concreteness↑`. *Not for:* grief, euphoria, high drama. *Distinct from Evidence
Board:* fond observation vs suspicious investigation.

**Brain Dump / Mind-map** — the *structure of thought* rendered: a central
thought, branches, repeated ideas as echoes, contradictions facing off, questions
as bubbles, anxiety as visual noise. *Expresses:* `argument`/`rant` with real
contradictions, anxious/`chaotic`, indecision, overwhelm, `present`. *Not for:*
linear narrative, serene, place-driven. *Distinct from Evidence Board:* internal
cognition vs external case.

**Personal Mythology** — people→characters, places→landscapes, emotions→creatures,
goals→destinations: a symbolic dream-epic built from the story's meaning.
*Expresses:* `identity`/transformation, `mythic`/`surreal`, a reckoning with self
("becoming someone I don't recognise"). *Not for:* light, concrete, mundane.
*The most AI-native and the most ambitious — later phase.*

**2000s Internet Fever Dream** — early-web nostalgia: glitter, chrome gradients,
marquee, web-rings, low-res. *Expresses:* `nostalgic`+`playful`, `youth`/`internet`,
longing for a past self, cringe-fond. *Not for:* solemn, grief, premium-serene.
*A novelty style — use sparingly, only when the read genuinely calls for it.*

---

## 3. Casting — motivated variance

**Different because stories differ, never different for its own sake** (D9 §6).

1. The LLM scores the **top 2–3 candidate styles** against the Read and picks the
   one that best *expresses this specific piece*, with a one-line **casting
   rationale** — not a hard argmax. A grief piece is usually a nocturne world; a
   grief piece that is a *list of objects left behind* → scrapbook; a *wry,
   ceremonial* grief piece → manuscript.
2. **Monotony guard:** when two candidates tie within a small margin, prefer the
   one *less recently used for this writer*. Variety comes from genuine ties,
   never from choosing a low-affinity style.
3. **Within-style execution is derived from the full Read**, so even two
   scrapbooks diverge: `palette_feeling` → colours, `motifs`/`objects` →
   doodles/stickers, `energyArc` → animation, `domain` → illustrations. Two
   postcards of two trips are visibly different postcards.

---

## 4. Read → the four knobs

| Knob | Driven by |
|---|---|
| **World / style** | `form` + `mood` + `placeBound` (casting, §2–3) |
| **Animation (arc)** | `energyArc` → what builds / brightens / breaks on scroll; `climaxBeat` → the one scene event |
| **Doodles** | `motifs` + `objects` + `domain` → bespoke SVG co-located with its sentence; `intensity` → how many |
| **Text behaviour** | per-beat `tone`/arousal → unveil vs tremor vs dissolve vs swell; the maximalist scream is the Read's peak |

---

## 5. The ArtDirection output (the render contract)

```ts
ArtDirection {
  read: StoryRead
  style: StyleKey                 // the cast style (world:<key> or a medium)
  casting_rationale: string
  palette: { scheme, groundStops[], accent, warm? }
  ambient?: { kind, params }
  sceneLayers?: [ { role, svg?, anchor, parallax, evolveWith } ]   // SVG sanitised
  arc?: { climaxBeat, events: [ { atProgress, layer, change } ] }
  beats: [ {
    behavior, emphasis: Span[], motif?,
    element?: { svg, anchor },    // bespoke doodle, SVG sanitised
    sceneTrigger?
  } ]
  signature?: { svg }
}
```

**Safety:** zod-validate the whole object; sanitise every SVG (strip
`script`/`foreignObject`/event handlers, clamp `viewBox`, no external refs);
clamp colours/numbers. Invalid → fall back to the TS director. Reader never calls
the API.

**Storage:** persist `ArtDirection` on the story (jsonb, additive — D4) with a
hash of the source text + model version. Regenerate only when the text materially
changes or the writer re-rolls.

---

## 6. System prompt (sketch)

> You are the art director for Living Page. Read the story for its **tone, mood
> and vibe**, then cast it to the **one** style that best expresses *this* piece,
> and art-direct within it. Hold the design language: **restraint** (mostly
> quiet, 2–3 earned surprises, one grammar per page), **motivated not default**
> (every choice traceable to the read — no black-by-default, no neon-by-default),
> **readable always**, **premium not clip-art**. Return only the JSON schema.
> [ + StoryRead vocab + Style Catalog + few-shot examples + the four-knobs map ]

A second pass may critique and trim anything that breaks restraint.

---

## 7. Rollout

1. **Phase 1 — LLM art-directs within the grammar we already render.** It
   produces the `StoryRead`, casts a style, and fills `ArtDirection` using worlds
   + the four existing mediums + our behaviours/emphasis. Zero new render risk;
   immediately smarter and more varied per story.
2. **Phase 2 — bespoke generated SVG** for doodles + scene fragments (sanitised)
   → genuine per-story art; add **Scrapbook** + **Movie Poster** + **Underwater**.
3. **Phase 3 — Brain Dump, Field Journal, Personal Mythology**, richer arcs and
   signature motifs.
