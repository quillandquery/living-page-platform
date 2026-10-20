"""
VISUAL GRAMMAR + SCENE GRAPH.

Visual grammar: translate each classified StoryBeat (its narrative type, energy
and emotion) into a concrete `visualBehavior` the renderer can act on — scale,
motion family, position, surrounding density, opacity and emphasis. The type
sets the base behaviour (a `rush` scatters and enlarges; a `silence` stills and
fades; a `reveal` blooms); energy and emotion then modulate it.

Scene graph: the ordered beats + the whole-story VisualProfile + the energy arc.
This is the object the downstream renderer consumes (today: maps onto the Beat
vocabulary voice/body/gesture/move; see lib/vocabulary.ts).
"""

from __future__ import annotations

from vprofile import StoryBeat, VisualBehavior, SceneGraph
from narrative import build_beats
from pipeline import analyze


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


# base behaviour per narrative type — the "grammar"
GRAMMAR: dict[str, dict] = {
    "arrival":      {"motion": "enter",     "position": "center",    "scale": 1.30, "density": 5, "opacity": 1.00, "emphasis": 0.80},
    "observation":  {"motion": "settle",    "position": "alternate", "scale": 1.00, "density": 4, "opacity": 0.95, "emphasis": 0.30},
    "waiting":      {"motion": "hold",      "position": "center",    "scale": 0.95, "density": 2, "opacity": 0.85, "emphasis": 0.30},
    "movement":     {"motion": "drift",     "position": "left",      "scale": 1.05, "density": 5, "opacity": 1.00, "emphasis": 0.45},
    "repetition":   {"motion": "echo",      "position": "stacked",   "scale": 1.00, "density": 6, "opacity": 0.90, "emphasis": 0.60},
    "anticipation": {"motion": "rise",      "position": "center",    "scale": 1.05, "density": 3, "opacity": 0.90, "emphasis": 0.55},
    "interruption": {"motion": "snap",      "position": "edge",      "scale": 1.25, "density": 7, "opacity": 1.00, "emphasis": 0.85},
    "discovery":    {"motion": "reveal",    "position": "center",    "scale": 1.20, "density": 5, "opacity": 1.00, "emphasis": 0.70},
    "turn":         {"motion": "pivot",     "position": "center",    "scale": 1.25, "density": 6, "opacity": 1.00, "emphasis": 0.85},
    "rush":         {"motion": "scatter",   "position": "scattered", "scale": 1.30, "density": 9, "opacity": 1.00, "emphasis": 0.90},
    "release":      {"motion": "settle",    "position": "center",    "scale": 1.00, "density": 3, "opacity": 0.90, "emphasis": 0.50},
    "reflection":   {"motion": "driftslow", "position": "narrow",    "scale": 1.00, "density": 2, "opacity": 0.80, "emphasis": 0.40},
    "reveal":       {"motion": "bloom",     "position": "full",      "scale": 1.50, "density": 6, "opacity": 1.00, "emphasis": 1.00},
    "silence":      {"motion": "still",     "position": "center",    "scale": 0.90, "density": 1, "opacity": 0.75, "emphasis": 0.30},
}

DEFAULT = GRAMMAR["observation"]


def visual_behavior(beat: StoryBeat, index: int) -> VisualBehavior:
    g = GRAMMAR.get(beat.type, DEFAULT)
    e = beat.energy

    # energy modulates size, density and emphasis around the type's baseline
    scale = g["scale"] + (e - 0.5) * 0.30
    density = _clamp(g["density"] + (e - 0.5) * 4.0, 0, 10)
    emphasis = _clamp(g["emphasis"] + (e - 0.5) * 0.20)
    opacity = g["opacity"]
    # a strongly negative emotion pulls opacity/scale down a touch (heavier, quieter)
    if beat.emotion in ("sadness", "fear"):
        opacity = _clamp(opacity - 0.05)

    # resolve "alternate" into a concrete side so observation beats zig-zag
    position = g["position"]
    if position == "alternate":
        position = "left" if index % 2 == 0 else "right"

    return VisualBehavior(
        scale=round(scale, 3),
        motion=g["motion"],
        position=position,
        density=round(density, 2),
        opacity=round(opacity, 3),
        emphasis=round(emphasis, 3),
    )


def build_scene_graph(text: str) -> SceneGraph:
    text = (text or "").strip()
    beats = build_beats(text)
    for i, b in enumerate(beats):
        b.visualBehavior = visual_behavior(b, i)

    profile = analyze(text).to_dict()
    arc = [b.energy for b in beats]

    return SceneGraph(
        beats=beats,
        arc=arc,
        profile=profile,
        meta={
            "beat_count": len(beats),
            "type_histogram": _histogram(beats),
            "peak_energy": max(arc) if arc else 0.0,
            "mean_energy": round(sum(arc) / len(arc), 3) if arc else 0.0,
        },
    )


def _histogram(beats: list[StoryBeat]) -> dict[str, int]:
    h: dict[str, int] = {}
    for b in beats:
        h[b.type] = h.get(b.type, 0) + 1
    return dict(sorted(h.items(), key=lambda kv: -kv[1]))
