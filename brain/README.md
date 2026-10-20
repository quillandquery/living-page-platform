# The Brain (prototype)

Replacing the engine, not the renderer.

```
USER TEXT
  → spaCy                     entities · nouns/objects · verbs/actions · tense ·
  |                           sentence structure · people · places · repetition
  → sentence-transformers     semantic concepts & visual associations
  |                           (similarity to the Visual Concept Library)
  → Hugging Face classifier   emotion
  → VISUAL PROFILE
  → [ next: Visual Grammar Engine → Scene Graph → existing renderer ]
```

This is a **standalone prototype** (per the build decision). It does not touch
the Next.js app yet — it validates the pipeline and the concept library against
sample stories so the runtime wiring can be decided once it proves out.

> **Note on `docs/DECISIONS.md` D1.** The live app engine is locked as
> "heuristic, no LLM, no network in the transform loop, instant per-keystroke."
> spaCy / transformers are Python ML models and can't run on keystroke in the
> browser, so this brain is a server-side / offline pass, not a per-keystroke
> one. That's a real departure from D1 — tracked here deliberately. The models
> are local (no per-story API cost, no LLM), which keeps the *spirit* of D1, but
> the "watch it transform while typing" promise would need the existing
> heuristic engine to stay for live feedback, with this richer brain running on
> save / publish. Decide that wiring before shipping.

## Files

| file           | what it is |
|----------------|------------|
| `concepts.py`  | the **Visual Concept Library** — 99 evocative concepts, each with an embed-ready description, visual-dimension affinities, and fallback tags. The target taxonomy the writing is matched against. |
| `vprofile.py`   | the `VisualProfile` data shape (mirrors the TypeScript target, camelCase on the JSON boundary). |
| `pipeline.py`  | the three model stages + the eight-dimension combiner. `analyze(text) → VisualProfile`. |
| `run.py`       | CLI. |
| `samples/`     | four hand-written stories that should each profile very differently. |

## Enabling spaCy and Hugging Face

In a fresh virtualenv:

```bash
cd brain
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm        # the one model not on PyPI
```

That's it. The two Hugging Face models (`all-MiniLM-L6-v2` for embeddings,
`emotion-english-distilroberta-base` for emotion) **download themselves on the
first run** and cache under `~/.cache/huggingface`. No API key, no account — the
weights are public and run fully local.

First run is slow (it's downloading ~400 MB of weights); every run after is fast.

Behind a firewall/proxy that blocks `huggingface.co` or `raw.githubusercontent.com`,
pre-download on an unrestricted machine and copy the caches over, or set
`HF_HUB_OFFLINE=1` once cached. (This sandbox blocks both, which is why the
commands above are run on *your* machine.)

## Running

```bash
python run.py --file samples/grandmother-kitchen.txt     # one story → JSON
python run.py --file samples/*.txt --out out/            # batch → out/*.json
python run.py --text "The rain hadn't stopped for days."  # literal string
echo "some prose" | python run.py                        # stdin
```

## Graceful fallbacks (why it runs even here)

Each stage loads its real model lazily; if the model isn't available it drops to
a transparent lexical shim so the pipeline always produces a valid
`VisualProfile`. `meta.backends` records which path each stage took, and
`meta.fully_offline` is `true` when all three fell back:

```json
"backends": {
  "linguistic": { "backend": "spacy", "model": "en_core_web_sm" },
  "concepts":   { "backend": "sentence-transformers", "model": ".../all-MiniLM-L6-v2" },
  "emotion":    { "backend": "hf-transformers", "model": ".../emotion-...-distilroberta-base" }
}
```

The fallbacks are a safety net for development, **not** the product — install the
three dependencies to get the real linguistic parse, semantic matching and
emotion classification. The output *shape* is identical either way, so the
downstream Visual Grammar Engine can be built against it now.

## The VisualProfile

```ts
type VisualProfile = {
  semantic:   { concepts: {name,score}[]; emotions: {name,score}[] }
  linguistic: { objects, actions, places, people,
                temporalReferences, sentenceLengths, repetition }
  visual:     { intimacy, chaos, nostalgia, surrealism,
                physicality, urgency, fragmentation, spatiality }  // each 0..1
  meta:       { backends, tense, chars, fully_offline }            // non-contract
}
```

The eight `visual` dimensions are a weighted blend of three signals: the matched
concepts' own affinities (0.45), the emotion scores (0.20), and linguistic /
structural cues such as pronoun density, past-tense ratio, sentence-length
variance and sensory-word density (0.35). Tunable at the bottom of `pipeline.py`.

## Next steps (not in this pass)

1. **Visual Grammar Engine** — map `VisualProfile` → art-direction choices
   (palette, motion family, composition, hero subject), the way
   `lib/art-direction/generate.ts` maps the current `SemanticStoryProfile`.
2. **Scene Graph** — emit the shape the existing renderer already consumes
   (`StoryArtDirection` in `lib/art-direction/types.ts`).
3. **Runtime decision** — service called on save/publish vs. keeping the
   heuristic engine for live typing (the D1 question above).
4. **Map concepts → renderables** — each of the 99 concepts to a curated
   cutout / doodle / backdrop layer (D2/D6).

## Scene graph — narrative structure → visual grammar

Beyond the whole-story `VisualProfile`, the brain can read a story as an ordered
**timeline of beats**. Each sentence is classified by what it *does* (one of 14
narrative functions), and given its own emotion, energy (0–1) and a concrete
`visualBehavior`.

```bash
python run.py --file samples/the-dream.txt --scene          # print the scene graph
python run.py --file samples/*.txt --scene --out scenes/    # batch → scenes/*.json
```

- `narrative.py` — segments the story and classifies each beat into
  `arrival · observation · waiting · movement · repetition · anticipation ·
  interruption · discovery · turn · rush · release · reflection · reveal ·
  silence`. Lexical cues first, with a sentence-transformer second opinion
  (cosine similarity to a prototype line per type) when the embedder is loaded.
- `grammar.py` — the visual grammar: maps each beat (type + energy + emotion) to
  `{ scale, motion, position, density, opacity, emphasis }`, and assembles the
  `SceneGraph` (`beats[]`, the energy `arc`, and the whole-story `profile`).

```ts
type StoryBeat = {
  text: string
  type: "arrival" | "observation" | "waiting" | "movement" | "repetition"
      | "anticipation" | "interruption" | "discovery" | "turn" | "rush"
      | "release" | "reflection" | "reveal" | "silence"
  emotion: string
  energy: number
  visualBehavior: { scale?, motion?, position?, density?, opacity?, emphasis? }
}
```

Beat-type classification leans hardest on the embedder, so it is noticeably
sharper with the real models than in the offline lexical fallback (where short
declaratives tend to collapse to `interruption`). Next wiring step: map
`visualBehavior` onto the renderer's Beat vocabulary (voice / body / gesture /
move in `lib/vocabulary.ts`) so the per-beat timeline drives the actual page.
