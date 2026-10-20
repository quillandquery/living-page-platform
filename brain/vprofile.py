"""
THE VISUAL PROFILE — the data shape the new brain emits.

Mirrors the TypeScript target exactly (camelCase on the JSON boundary), so the
downstream Visual Grammar Engine / scene graph can consume it unchanged:

    type VisualProfile = {
      semantic:   { concepts: {name,score}[]; emotions: {name,score}[] }
      linguistic: { objects, actions, places, people, temporalReferences,
                    sentenceLengths, repetition }
      visual:     { intimacy, chaos, nostalgia, surrealism, physicality,
                    urgency, fragmentation, spatiality }
    }

`meta` is an extra, non-contract block recording which backend produced each
layer (real model vs offline fallback) — useful while the prototype is being
validated. The Visual Grammar Engine can ignore it.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class Scored:
    name: str
    score: float


@dataclass
class Semantic:
    concepts: list[Scored] = field(default_factory=list)
    emotions: list[Scored] = field(default_factory=list)


@dataclass
class Linguistic:
    objects: list[str] = field(default_factory=list)
    actions: list[str] = field(default_factory=list)
    places: list[str] = field(default_factory=list)
    people: list[str] = field(default_factory=list)
    temporalReferences: list[str] = field(default_factory=list)
    sentenceLengths: list[int] = field(default_factory=list)
    repetition: list[str] = field(default_factory=list)


@dataclass
class Visual:
    intimacy: float = 0.0
    chaos: float = 0.0
    nostalgia: float = 0.0
    surrealism: float = 0.0
    physicality: float = 0.0
    urgency: float = 0.0
    fragmentation: float = 0.0
    spatiality: float = 0.0


@dataclass
class VisualProfile:
    semantic: Semantic = field(default_factory=Semantic)
    linguistic: Linguistic = field(default_factory=Linguistic)
    visual: Visual = field(default_factory=Visual)
    meta: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


# ─────────────────────────────────────────────────────────────────────────────
# NARRATIVE STRUCTURE → VISUAL GRAMMAR → SCENE GRAPH
#
# The VisualProfile above is one answer for the WHOLE story. The scene graph is
# the per-beat timeline: the story read as an ordered sequence of narrative
# moments, each classified by what it *does* (an arrival, a wait, a rush, a
# reveal, a silence), each carrying its own emotion + energy, and each mapped to
# a concrete visual behaviour the renderer can act on.
# ─────────────────────────────────────────────────────────────────────────────

# the fourteen narrative functions a beat can perform
BEAT_TYPES = (
    "arrival", "observation", "waiting", "movement", "repetition",
    "anticipation", "interruption", "discovery", "turn", "rush",
    "release", "reflection", "reveal", "silence",
)


@dataclass
class VisualBehavior:
    """How a beat should behave on the page. Continuous where the renderer
    reads a number, a named family where it reads a keyword."""
    scale: float = 1.0          # relative type size (1.0 = body)
    motion: str = "settle"      # motion family (enter, drift, scatter, still…)
    position: str = "center"    # center, left, right, edge, scattered, full, narrow
    density: float = 4.0        # surrounding artwork density, 0–10
    opacity: float = 1.0        # 0–1
    emphasis: float = 0.3       # 0–1, how much weight this beat gets


@dataclass
class StoryBeat:
    text: str
    type: str                                    # one of BEAT_TYPES
    emotion: str                                 # top emotion for this beat
    energy: float                                # 0–1
    visualBehavior: VisualBehavior = field(default_factory=VisualBehavior)


@dataclass
class SceneGraph:
    beats: list[StoryBeat] = field(default_factory=list)
    arc: list[float] = field(default_factory=list)      # energy per beat, in order
    profile: dict[str, Any] = field(default_factory=dict)  # the whole-story VisualProfile
    meta: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)
