"""
THE BRAIN'S CASTER  (VisualProfile + SceneGraph → a LivingScene)

This is the answer to "why any default at all?" — the keyword caster in
`lib/living/cast.ts` defaults because it's the shallow, live, in-browser pass.
THIS caster uses what the brain actually understands — the matched visual
concepts (sentence-transformer similarity), the emotion, the eight visual
dimensions, and the per-beat narrative types — to CHOOSE the world and the
behaviours. There is no blanket default: the world emerges from the concepts
the story actually evoked.

Output JSON matches the TS `LivingScene` the renderer eats:
  { "worldKey", "eyebrow", "title",
    "beats": [ { "text", "behavior", "element", "loud" } ] }

Run:  python cast.py --file samples/*.txt --out living/
"""

from __future__ import annotations
import argparse, json, sys
from pathlib import Path

from grammar import build_scene_graph
from concepts import CONCEPTS

# ── concept → world ──────────────────────────────────────────────────────────
# every one of the 99 concepts resolves to a world, by category then by name.
# LIGHT worlds dominate; dark worlds are only reached by genuinely dark concepts.
_CATEGORY_WORLD = {
    "ephemera": "daylight", "domestic": "ember-interior", "nature": "meadow",
    "body": "daylight", "transit": "twilight-street", "urban": "twilight-street",
    "surreal": "dream", "weather": "daylight",
}
_NAME_WORLD = {
    # weather splits by what it evokes
    "ocean horizon": "dawn-coast", "crashing wave": "dawn-coast", "ripples spreading": "dawn-coast",
    "water reflection": "dawn-coast", "ferry wake": "dawn-coast", "seashell": "dawn-coast",
    "footprints in sand": "dawn-coast",
    "storm clouds": "storm", "lightning": "storm", "rain on a window": "storm",
    "morning mist": "meadow", "fog over a field": "meadow", "dew on grass": "meadow",
    "sunlight through leaves": "meadow", "field of wildflowers": "meadow",
    "dust in a sunbeam": "daylight", "snowfall": "nocturne",
    # urban/night that are genuinely dark
    "neon sign": "twilight-street", "streetlight glow": "twilight-street",
    "subway tunnel": "noir-room", "long exposure traffic": "twilight-street",
    "flickering fluorescent": "noir-room", "shadow on a wall": "noir-room",
    "crowded market": "daylight", "empty street at dawn": "daylight",
    # ephemera that reads reflective-warm
    "faded photograph": "ember-interior", "handwritten note": "ember-interior",
    "pressed flower": "ember-interior", "childhood drawing": "ember-interior",
    "diary page": "ember-interior",
}
def _concept_world(name: str) -> str:
    if name in _NAME_WORLD:
        return _NAME_WORLD[name]
    cat = next((c["category"] for c in CONCEPTS if c["name"] == name), None)
    return _CATEGORY_WORLD.get(cat or "", "daylight")

# ── narrative type → behaviour ───────────────────────────────────────────────
_TYPE_BEHAVIOR = {
    "arrival": "unveil", "observation": "unveil", "waiting": "hold",
    "movement": "rush", "repetition": "drift", "anticipation": "hold",
    "interruption": "tremor", "discovery": "swell", "turn": "swell",
    "rush": "rush", "release": "drift", "reflection": "drift",
    "reveal": "swell", "silence": "hold",
}

def pick_world(profile: dict) -> str:
    """Score worlds by the concepts the story evoked (weighted by similarity),
    then let emotion + dimensions nudge the scheme. No blanket default."""
    concepts = profile["semantic"]["concepts"]
    tally: dict[str, float] = {}
    for c in concepts:
        w = _concept_world(c["name"])
        tally[w] = tally.get(w, 0.0) + max(c["score"], 0.05)

    v = profile["visual"]
    emos = {e["name"]: e["score"] for e in profile["semantic"]["emotions"]}
    # dimension/emotion nudges — the brain's read, not a keyword
    tally["dream"] = tally.get("dream", 0) + v.get("surrealism", 0) * 1.4
    if emos.get("fear", 0) + emos.get("anger", 0) > 0.4:
        tally["noir-room"] = tally.get("noir-room", 0) + 0.9
    if emos.get("sadness", 0) > 0.5:
        tally["nocturne"] = tally.get("nocturne", 0) + 0.6
    tally["dawn-coast"] = tally.get("dawn-coast", 0) + v.get("spatiality", 0) * 0.8

    if not tally:
        # even the "nothing matched" case is informed by the dimensions, not a
        # hardcoded colour: calm+spatial → coast, else a warm daylight.
        return "dawn-coast" if v.get("spatiality", 0) > 0.3 else "daylight"
    return max(tally.items(), key=lambda kv: kv[1])[0]

def _element(text: str) -> str:
    t = text.lower()
    if any(k in t for k in ("phone", "missed call", "ringing", "the number")):
        return "phone"
    if any(k in t for k in ("lighter", "flame", "cigarette", "candle", "a light")):
        return "flame"
    return "none"

def cast(text: str, eyebrow: str | None = None, title: str | None = None) -> dict:
    sg = build_scene_graph(text)
    world = pick_world(sg.profile)
    energies = [b.energy for b in sg.beats]
    mean = sum(energies) / len(energies) if energies else 0
    # loud budget: the top ≤2 genuine spikes (restraint, D9)
    order = sorted(range(len(sg.beats)), key=lambda i: energies[i], reverse=True)
    loud = {i for i in order[:2] if energies[i] >= 0.22 and energies[i] >= mean + 0.1}

    beats = []
    for i, b in enumerate(sg.beats):
        behavior = _TYPE_BEHAVIOR.get(b.type, "unveil")
        # emotion sharpens a few
        if b.emotion in ("fear", "anger") and behavior in ("unveil", "rush"):
            behavior = "tremor"
        if i in loud and behavior == "unveil":
            behavior = "swell"
        beats.append({"text": b.text, "behavior": behavior,
                      "element": _element(b.text), "loud": i in loud})

    return {"worldKey": world, "eyebrow": eyebrow, "title": title, "beats": beats}


def main() -> int:
    ap = argparse.ArgumentParser(description="text → LivingScene (brain-cast)")
    ap.add_argument("--file", nargs="+")
    ap.add_argument("--text")
    ap.add_argument("--title"); ap.add_argument("--eyebrow")
    ap.add_argument("--out", help="write <stem>.json per input here")
    args = ap.parse_args()

    inputs: list[tuple[str, str]] = []
    if args.text: inputs.append(("text", args.text))
    for f in (args.file or []): inputs.append((Path(f).stem, Path(f).read_text(encoding="utf-8")))
    if not inputs: ap.print_help(); return 1

    outdir = Path(args.out) if args.out else None
    if outdir: outdir.mkdir(parents=True, exist_ok=True)
    for name, text in inputs:
        scene = cast(text, eyebrow=args.eyebrow, title=args.title or name.replace("-", " ").title())
        js = json.dumps(scene, indent=2)
        if outdir:
            (outdir / f"{name}.json").write_text(js, encoding="utf-8")
            print(f"  {name}.json  world={scene['worldKey']}  beats={len(scene['beats'])}  "
                  f"loud={sum(b['loud'] for b in scene['beats'])}")
        else:
            print(js)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
