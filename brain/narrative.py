"""
NARRATIVE STRUCTURE — the story as an ordered sequence of beats.

Splits prose into beats (sentences), and classifies each beat into one of the
fourteen narrative functions in `BEAT_TYPES` — what the sentence *does* in the
story, not what it's about. Each beat also gets an energy (0–1) and an emotion.

Classification is lexical-first (curated cue words + structural signals like a
short sentence after a long one = interruption), with an optional second
opinion from sentence-transformers (cosine similarity to a prototype line per
type) when the embedder is available. Same spirit as the rest of the brain:
real models when present, transparent fallback otherwise.
"""

from __future__ import annotations

import re
from collections import Counter

from vprofile import StoryBeat, BEAT_TYPES
from pipeline import _load_spacy, _load_embedder, _tokens, emotion_layer, URGENCY_LEX

# ── lexical cues per narrative type ──────────────────────────────────────────
CUES: dict[str, list[str]] = {
    "arrival": [r"\barriv", r"\breach(ed|es)?\b", r"\bgot to\b", r"\bcame to\b",
                r"\bstepped (in|into|out|onto)\b", r"\bwe drove to\b", r"\blanded\b",
                r"\bentered\b", r"\bwalked into\b", r"\bpulled (in|up)\b", r"\bat last we\b"],
    "observation": [r"\bsaw\b", r"\bsmelled\b", r"\bsmelt\b", r"\bheard\b", r"\bwatched\b",
                    r"\bthe \w+ was\b", r"\bthere were\b", r"\blooked like\b", r"\bin the \w+ light\b",
                    r"\bcolou?r", r"\bshone\b", r"\bglowed\b"],
    "waiting": [r"\bwait", r"\bstill (hadn't|had not|not)\b", r"\bnot yet\b", r"\bkept \w+ing\b",
                r"\bnothing happened\b", r"\bstood there\b", r"\blingered\b", r"\bminutes passed\b",
                r"\bhours passed\b", r"\bfor a long time\b"],
    "movement": [r"\bwalk(ed|ing)?\b", r"\bran\b", r"\brunning\b", r"\bdrove\b", r"\bdriving\b",
                 r"\bmoved\b", r"\bclimbed\b", r"\bcrossed\b", r"\bwandered\b", r"\bhurried\b",
                 r"\bdragged\b", r"\bmade (my|our) way\b"],
    "anticipation": [r"\bwould\b", r"\babout to\b", r"\bany (moment|minute|second)\b", r"\bsoon\b",
                     r"\bwaiting for\b", r"\bbefore long\b", r"\bwas going to\b", r"\bcouldn't wait\b"],
    "interruption": [r"\bsuddenly\b", r"\ball at once\b", r"\bwithout warning\b", r"\bbut then\b",
                     r"\bout of nowhere\b", r"\bthen,?\b"],
    "discovery": [r"\bfound\b", r"\bdiscover", r"\brealiz", r"\brealis", r"\bnoticed\b",
                  r"\bthere was\b", r"\bsaw that\b", r"\bit turned out\b", r"\bcaught sight\b"],
    "turn": [r"^but\b", r"^yet\b", r"\buntil\b", r"\beverything changed\b", r"\binstead\b",
             r"\bhowever\b", r"\band then\b", r"\bthat was when\b"],
    "rush": [r"\bran\b", r"\brushed\b", r"\braced\b", r"\bslammed\b", r"\bscreamed\b", r"\bshouted\b",
             r"\bburst\b", r"\bpanic", r"\bfaster\b", r"\bquick", r"\bgrabbed\b", r"\bchase"],
    "release": [r"\bfinally\b", r"\bat last\b", r"\blet go\b", r"\bslowed\b", r"\bbreathed\b",
                r"\bcalm\b", r"\brelief\b", r"\bsettled\b", r"\bexhaled\b", r"\brest(ed)?\b"],
    "reflection": [r"\bi (still )?think\b", r"\byears later\b", r"\blooking back\b",
                   r"\bi have never\b", r"\bi'd never\b", r"\bnow i (know|understand)\b",
                   r"\bi remember\b", r"\bin the end\b", r"\ball these years\b", r"\bi wonder\b"],
    "reveal": [r"\ball along\b", r"\bthere (it|she|he) was\b", r"\bturned out to be\b",
               r"\bthe truth\b", r"\bi saw (that|it)\b", r"\brevealed\b"],
    "silence": [r"\bsaid nothing\b", r"\bneither of us (said|spoke)\b", r"\bsilence\b",
                r"\bquiet\b", r"\bhush\b", r"\bwordless\b", r"\bdidn't speak\b",
                r"\bno one spoke\b", r"\bstillness\b"],
    # "repetition" is detected structurally, below
}

# one prototype line per type — the embedder's reference point (second opinion)
PROTOTYPES: dict[str, str] = {
    "arrival": "We finally arrived and stepped into the new place.",
    "observation": "The light fell across everything and I watched it quietly.",
    "waiting": "I waited, and nothing happened, and still I waited.",
    "movement": "We walked and walked, moving through the streets.",
    "repetition": "Again. And again. And again it came back.",
    "anticipation": "Any moment now it would happen; I could feel it coming.",
    "interruption": "Suddenly, without warning, everything stopped.",
    "discovery": "And then I found it, and realised what it was.",
    "turn": "But then everything changed and nothing was the same.",
    "rush": "I ran, my heart slamming, racing as fast as I could.",
    "release": "Finally I let go, breathed out, and everything settled.",
    "reflection": "Years later I still think about it and wonder what it meant.",
    "reveal": "And there it was — it had been true all along.",
    "silence": "Neither of us said anything. The silence held.",
}

MOTION_WORDS = ["ran", "rushed", "raced", "slammed", "burst", "grabbed", "chase",
                "walked", "drove", "climbed", "hurried", "flung", "threw"]

_proto_vecs = None
_proto_keys: list[str] = []


def _segment(text: str) -> list[str]:
    nlp = _load_spacy()
    if nlp is not None:
        return [s.text.strip() for s in nlp(text).sents if s.text.strip()]
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", text.strip()) if s.strip()]


def beat_energy(text: str) -> float:
    toks = _tokens(text)
    n = max(len(toks), 1)
    urg = sum(toks.count(w) for w in URGENCY_LEX) / n
    motion = sum(toks.count(w) for w in MOTION_WORDS) / n
    excl = min(text.count("!"), 2) / 2
    short = 1.0 if n <= 5 else 0.0
    caps = 1.0 if re.search(r"\b[A-Z]{3,}\b", text) else 0.0
    long_flow = 1.0 if n >= 24 else 0.0
    e = (0.34 * min(urg * 6, 1) + 0.22 * min(motion * 6, 1)
         + 0.18 * excl + 0.14 * short + 0.08 * caps - 0.12 * long_flow)
    return round(min(max(e, 0.05), 1.0), 3)


def _lexical_scores(beat: str, prev_len: int | None) -> dict[str, float]:
    low = beat.lower()
    scores: dict[str, float] = {}
    for t, pats in CUES.items():
        s = 0.0
        for p in pats:
            if re.search(p, low):
                s += 1.0
        if s:
            scores[t] = s
    # structural: a short sentence right after a long one reads as interruption
    n = len(_tokens(beat))
    if prev_len is not None and n <= 5 and prev_len >= 12:
        scores["interruption"] = scores.get("interruption", 0) + 1.5
    if n <= 3 and beat.endswith((".", "!")):  # terse fragment
        scores["interruption"] = scores.get("interruption", 0) + 0.5
    if "!" in beat:
        scores["rush"] = scores.get("rush", 0) + 0.8
    return scores


def _repetition_boost(beat: str, prev: str | None) -> float:
    toks = _tokens(beat)
    if not toks:
        return 0.0
    # internal repeated content word
    counts = Counter(w for w in toks if len(w) > 2)
    internal = 1.0 if counts and counts.most_common(1)[0][1] >= 2 else 0.0
    # anaphora: same opening word as the previous beat
    anaphora = 0.0
    if prev:
        pt = _tokens(prev)
        if pt and toks and pt[0] == toks[0] and len(toks) <= 10:
            anaphora = 1.0
    # one-word echo ("Gone. ... Gone.")
    echo = 1.0 if len(toks) <= 2 and prev and set(_tokens(prev)) & set(toks) else 0.0
    return internal + anaphora + echo


def _embedding_scores(beats: list[str]) -> list[dict[str, float]] | None:
    embedder = _load_embedder()
    if embedder is None:
        return None
    global _proto_vecs, _proto_keys
    from sentence_transformers import util
    if _proto_vecs is None:
        _proto_keys = list(PROTOTYPES.keys())
        _proto_vecs = embedder.encode([PROTOTYPES[k] for k in _proto_keys],
                                      convert_to_tensor=True, normalize_embeddings=True)
    bvecs = embedder.encode(beats, convert_to_tensor=True, normalize_embeddings=True)
    sims = util.cos_sim(bvecs, _proto_vecs)  # [n_beats, n_types]
    out = []
    for i in range(len(beats)):
        out.append({_proto_keys[j]: float(sims[i][j]) for j in range(len(_proto_keys))})
    return out


def classify_beats(text: str) -> list[tuple[str, str, float]]:
    """Return (beat_text, type, energy) per beat."""
    beats = _segment(text)
    emb = _embedding_scores(beats)
    results: list[tuple[str, str, float]] = []
    for i, b in enumerate(beats):
        prev = beats[i - 1] if i > 0 else None
        prev_len = len(_tokens(prev)) if prev else None
        lex = _lexical_scores(b, prev_len)
        rep = _repetition_boost(b, prev)
        if rep >= 1.0:
            lex["repetition"] = lex.get("repetition", 0) + rep

        # blend: lexical (strong, hand-tuned) + embedding (soft, fills the gaps)
        combined: dict[str, float] = {t: lex.get(t, 0.0) for t in BEAT_TYPES}
        if emb is not None:
            for t in BEAT_TYPES:
                combined[t] += 1.6 * max(emb[i].get(t, 0.0), 0.0)

        energy = beat_energy(b)
        # energy nudges the agitated types up and the still types down
        combined["rush"] += energy * 0.8
        combined["interruption"] += energy * 0.3
        combined["silence"] += (1 - energy) * 0.3
        combined["reflection"] += (1 - energy) * 0.2

        best = max(combined.items(), key=lambda kv: kv[1])
        btype = best[0] if best[1] > 0 else "observation"
        results.append((b, btype, energy))
    return results


def build_beats(text: str) -> list[StoryBeat]:
    out: list[StoryBeat] = []
    for b, btype, energy in classify_beats(text):
        emotions, _ = emotion_layer(b)
        emo = emotions[0].name if emotions else "neutral"
        out.append(StoryBeat(text=b, type=btype, emotion=emo, energy=energy))
    return out
