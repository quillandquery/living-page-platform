"""
THE BRAIN — text -> VisualProfile.

    USER TEXT
      -> spaCy                (linguistic layer: objects, actions, places,
      |                        people, temporal refs, tense, structure, repetition)
      -> sentence-transformers(semantic layer: which visual concepts the prose
      |                        is *near*, by embedding similarity to concepts.py)
      -> HF emotion model     (emotion layer)
      -> derive the 8 visual dimensions from all of the above
      -> VisualProfile

Every stage loads its real model lazily and, if that model is unavailable
(not installed, or weights can't be fetched), falls back to a transparent,
clearly-labelled lexical shim so the pipeline always runs end-to-end. The
`meta.backends` block records which path each stage actually took.

Swap the fallbacks out by installing the three dependencies (see README) — the
public shape of the output does not change.
"""

from __future__ import annotations

import re
import math
from collections import Counter

from concepts import CONCEPTS, VISUAL_DIMENSIONS
from vprofile import VisualProfile, Semantic, Linguistic, Visual, Scored

# ── model identifiers (overridable) ─────────────────────────────────────────
SPACY_MODEL = "en_core_web_sm"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"

TOP_CONCEPTS = 12
REPETITION_MIN = 3

# ── tiny shared lexicons (used by fallbacks and by the dimension combiner) ───
STOP = set(
    "the a an and or but of to in on at for with from into over under by as is are was were "
    "be been being it its this that these those i you he she we they me him her us them my your "
    "his their our mine yours not no so if then than too very just about out up down off then "
    "there here what which who whom whose when where why how all any both each few more most "
    "other some such only own same again further once do does did doing have has had having "
    "would could should will shall can may might must am s t re ve ll d m "
    # common adverbs / fillers the POS-less fallback would otherwise mistake for objects
    "never always slightly something someone anything nothing much while through still almost "
    "even really quite rather also perhaps maybe somewhere anywhere everywhere together".split()
)
PRONOUN_1_2 = set("i me my mine myself we us our ours you your yours".split())
TEMPORAL_LEX = [
    "yesterday", "today", "tomorrow", "now", "then", "later", "soon", "always", "never",
    "morning", "noon", "afternoon", "evening", "night", "midnight", "dawn", "dusk",
    "years ago", "long ago", "used to", "once", "back then", "that summer", "last year",
    "for years", "all day", "all night", "every day", "every morning", "a moment", "suddenly",
    "finally", "eventually", "already", "still", "yet", "someday", "the past", "those days",
]
SURREAL_LEX = ["dream", "dreamt", "dreaming", "unreal", "floating", "melted", "impossible",
               "shimmer", "blur", "blurred", "ghost", "weightless", "endless", "dissolve",
               "strange", "vision", "hallucination", "wasn't real", "not real"]
URGENCY_LEX = ["run", "ran", "running", "rushed", "hurry", "quick", "quickly", "fast", "sudden",
               "suddenly", "now", "immediately", "panic", "racing", "slammed", "screamed",
               "shouted", "froze", "gasp", "burst", "deadline", "late", "chase"]
BODY_SENSE_LEX = ["skin", "hand", "hands", "touch", "touched", "breath", "breathe", "heartbeat",
                  "heart", "blood", "warm", "cold", "wet", "smell", "taste", "sweat", "ache",
                  "fingers", "chest", "pulse", "shiver", "grip", "weight", "flesh", "bone"]
DOMESTIC_LEX = ["home", "kitchen", "bed", "bedroom", "table", "tea", "coffee", "mother", "father",
                "grandmother", "grandfather", "mum", "dad", "sister", "brother", "chair", "lamp",
                "window", "room", "house", "door", "pillow", "blanket"]
SPATIAL_LEX = ["horizon", "distance", "far", "vast", "sky", "across", "miles", "endless",
               "open", "wide", "landscape", "mountains", "sea", "ocean", "field", "road",
               "beyond", "stretched", "empty", "space", "above", "below", "towards"]
PERSON_NOUNS = set("mother father mum dad mom grandmother grandfather sister brother friend "
                   "husband wife son daughter boy girl man woman child baby stranger teacher "
                   "neighbour neighbor lover partner".split())
PLACE_NOUNS = set("beach sea ocean coast shore mountain hill valley forest city street town "
                  "village station airport platform market cafe field road river lake desert "
                  "island harbour harbor bridge garden park temple church".split())
VERB_LEX = set("go went come came see saw look looked walk walked run ran sit sat stand stood "
               "wait waited leave left stay stayed hold held take took give gave find found "
               "lose lost feel felt think thought know knew say said tell told ask asked turn "
               "turned open opened close closed fall fell rise rose watch watched remember "
               "forget forgot breathe laugh cried cry smiled smile touch touched drive drove "
               "write wrote read speak spoke listen heard hear".split())
# simple emotion lexicon for the offline fallback (maps to the HF label set)
EMOTION_LEX = {
    "joy": ["happy", "joy", "laughed", "laughing", "smile", "smiled", "delight", "bright",
            "warm", "love", "loved", "wonderful", "beautiful", "glad", "sunshine", "hope"],
    "sadness": ["sad", "cried", "crying", "tears", "lonely", "grief", "missed", "lost", "empty",
                "ache", "sorrow", "wept", "mourning", "goodbye", "alone", "longing"],
    "fear": ["afraid", "fear", "scared", "terrified", "panic", "dread", "trembling", "nervous",
             "anxious", "shaking", "frightened", "dark", "danger"],
    "anger": ["angry", "furious", "rage", "shouted", "screamed", "slammed", "hate", "bitter",
              "fists", "snapped", "argue", "argued"],
    "surprise": ["suddenly", "sudden", "shocked", "surprise", "surprised", "unexpected", "gasp",
                 "astonished", "amazed", "startled"],
    "disgust": ["disgust", "sick", "revolting", "rotten", "stench", "nausea", "filthy"],
    "neutral": [],
}


def _norm(x: float) -> float:
    return max(0.0, min(1.0, x))


def _round(x: float, n: int = 3) -> float:
    return round(float(x), n)


# ════════════════════════════════════════════════════════════════════════════
# STAGE 1 — LINGUISTIC (spaCy)
# ════════════════════════════════════════════════════════════════════════════
_nlp = None
_nlp_loaded = False


def _load_spacy():
    global _nlp, _nlp_loaded
    if _nlp_loaded:
        return _nlp
    _nlp_loaded = True
    try:
        import spacy
        _nlp = spacy.load(SPACY_MODEL)
    except Exception:
        _nlp = None
    return _nlp


def linguistic_layer(text: str) -> tuple[Linguistic, dict]:
    nlp = _load_spacy()
    if nlp is not None:
        return _linguistic_spacy(nlp, text), {"backend": "spacy", "model": SPACY_MODEL}
    return _linguistic_fallback(text), {"backend": "regex-fallback", "model": None}


def _dedupe(seq, cap):
    seen, out = set(), []
    for x in seq:
        k = x.lower()
        if k and k not in seen:
            seen.add(k)
            out.append(x)
        if len(out) >= cap:
            break
    return out


def _linguistic_spacy(nlp, text: str) -> Linguistic:
    doc = nlp(text)
    objects, actions, places, people, temporal = [], [], [], [], []
    tense = Counter()

    ent_place = {e.text for e in doc.ents if e.label_ in {"GPE", "LOC", "FAC"}}
    ent_person = {e.text for e in doc.ents if e.label_ == "PERSON"}
    for e in doc.ents:
        if e.label_ in {"DATE", "TIME"}:
            temporal.append(e.text)

    for tok in doc:
        if tok.pos_ in {"NOUN"} and not tok.is_stop and tok.is_alpha:
            lemma = tok.lemma_.lower()
            if lemma in PERSON_NOUNS:
                people.append(lemma)
            elif lemma in PLACE_NOUNS:
                places.append(lemma)
            else:
                objects.append(lemma)
        if tok.pos_ == "VERB" and tok.is_alpha:
            actions.append(tok.lemma_.lower())
            t = tok.morph.get("Tense")
            if t:
                tense[t[0]] += 1

    places = list(ent_place) + places
    people = list(ent_person) + people

    # temporal cue-words beyond DATE/TIME ents
    low = text.lower()
    for cue in TEMPORAL_LEX:
        if cue in low:
            temporal.append(cue)

    sent_lengths = [sum(1 for t in s if not t.is_punct and not t.is_space) for s in doc.sents]
    content = [t.lemma_.lower() for t in doc if t.pos_ in {"NOUN", "VERB", "ADJ"}
               and not t.is_stop and t.is_alpha]
    repetition = [w for w, n in Counter(content).items() if n >= REPETITION_MIN]

    ling = Linguistic(
        objects=_dedupe(objects, 30),
        actions=_dedupe(actions, 30),
        places=_dedupe(places, 20),
        people=_dedupe(people, 20),
        temporalReferences=_dedupe(temporal, 20),
        sentenceLengths=sent_lengths,
        repetition=_dedupe(repetition, 20),
    )
    ling._tense = dict(tense)  # type: ignore[attr-defined]
    return ling


def _tokens(text: str):
    return re.findall(r"[a-zA-Z']+", text.lower())


def _linguistic_fallback(text: str) -> Linguistic:
    sents = [s for s in re.split(r"(?<=[.!?])\s+|\n+", text.strip()) if s.strip()]
    sent_lengths = [len(_tokens(s)) for s in sents]
    toks = _tokens(text)
    content = [w for w in toks if w not in STOP and len(w) > 2]

    actions = [w for w in content if w in VERB_LEX]
    places = [w for w in content if w in PLACE_NOUNS]
    people = [w for w in content if w in PERSON_NOUNS]
    # crude objects: frequent content nouns that aren't verbs/places/people
    object_pool = [w for w in content if w not in VERB_LEX
                   and w not in PLACE_NOUNS and w not in PERSON_NOUNS]
    objects = [w for w, _ in Counter(object_pool).most_common(30)]

    # capitalised words (not sentence-initial) -> proper nouns (people/places)
    for m in re.finditer(r"(?<!^)(?<![.!?]\s)\b([A-Z][a-z]+)\b", text):
        w = m.group(1)
        if w.lower() not in STOP:
            people.append(w)

    low = text.lower()
    temporal = [c for c in TEMPORAL_LEX if c in low]
    repetition = [w for w, n in Counter(content).items() if n >= REPETITION_MIN]

    return Linguistic(
        objects=_dedupe(objects, 30),
        actions=_dedupe(actions, 30),
        places=_dedupe(places, 20),
        people=_dedupe(people, 20),
        temporalReferences=_dedupe(temporal, 20),
        sentenceLengths=sent_lengths,
        repetition=_dedupe(repetition, 20),
    )


# ════════════════════════════════════════════════════════════════════════════
# STAGE 2 — SEMANTIC CONCEPTS (sentence-transformers)
# ════════════════════════════════════════════════════════════════════════════
_embedder = None
_embedder_loaded = False
_concept_vecs = None


def _load_embedder():
    global _embedder, _embedder_loaded
    if _embedder_loaded:
        return _embedder
    _embedder_loaded = True
    try:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer(EMBED_MODEL)
    except Exception:
        _embedder = None
    return _embedder


def concept_layer(text: str) -> tuple[list[Scored], dict]:
    embedder = _load_embedder()
    if embedder is not None:
        return _concepts_embed(embedder, text), {"backend": "sentence-transformers",
                                                 "model": EMBED_MODEL}
    return _concepts_fallback(text), {"backend": "lexical-overlap-fallback", "model": None}


def _concepts_embed(embedder, text: str) -> list[Scored]:
    global _concept_vecs
    from sentence_transformers import util
    if _concept_vecs is None:
        descs = [c["description"] for c in CONCEPTS]
        _concept_vecs = embedder.encode(descs, convert_to_tensor=True, normalize_embeddings=True)
    # embed the whole text; for long stories, average over sentences
    sents = [s for s in re.split(r"(?<=[.!?])\s+|\n+", text.strip()) if s.strip()] or [text]
    sent_vecs = embedder.encode(sents, convert_to_tensor=True, normalize_embeddings=True)
    sims = util.cos_sim(sent_vecs, _concept_vecs)       # [n_sents, n_concepts]
    # a concept's score = its best match across sentences (a single vivid line counts)
    best = sims.max(dim=0).values
    pairs = sorted(((float(best[i]), CONCEPTS[i]["name"]) for i in range(len(CONCEPTS))),
                   reverse=True)
    return [Scored(name=n, score=_round(s)) for s, n in pairs[:TOP_CONCEPTS]]


def _concepts_fallback(text: str) -> list[Scored]:
    toks = set(_tokens(text))
    scored = []
    for c in CONCEPTS:
        kw = set(_tokens(c["name"])) | {t.lower() for t in c["tags"]}
        hits = sum(1 for k in kw if k in toks or (" " in k and k in text.lower()))
        if hits:
            scored.append((hits / math.sqrt(len(kw) + 1), c["name"]))
    scored.sort(reverse=True)
    if not scored:
        return []
    top = scored[0][0] or 1.0
    return [Scored(name=n, score=_round(s / top)) for s, n in scored[:TOP_CONCEPTS]]


# ════════════════════════════════════════════════════════════════════════════
# STAGE 3 — EMOTION (Hugging Face classifier)
# ════════════════════════════════════════════════════════════════════════════
_emotion = None
_emotion_loaded = False


def _load_emotion():
    global _emotion, _emotion_loaded
    if _emotion_loaded:
        return _emotion
    _emotion_loaded = True
    try:
        from transformers import pipeline as hf_pipeline
        _emotion = hf_pipeline("text-classification", model=EMOTION_MODEL,
                               top_k=None, truncation=True)
    except Exception:
        _emotion = None
    return _emotion


def emotion_layer(text: str) -> tuple[list[Scored], dict]:
    clf = _load_emotion()
    if clf is not None:
        try:
            out = clf(text[:2000])
            rows = out[0] if isinstance(out, list) and out and isinstance(out[0], list) else out
            scored = sorted(((r["label"].lower(), float(r["score"])) for r in rows),
                            key=lambda x: x[1], reverse=True)
            return ([Scored(name=n, score=_round(s)) for n, s in scored],
                    {"backend": "hf-transformers", "model": EMOTION_MODEL})
        except Exception:
            pass
    return _emotion_fallback(text), {"backend": "lexicon-fallback", "model": None}


def _emotion_fallback(text: str) -> list[Scored]:
    toks = _tokens(text)
    counts = {e: sum(toks.count(w) for w in words) for e, words in EMOTION_LEX.items()}
    total = sum(counts.values())
    if total == 0:
        return [Scored(name="neutral", score=1.0)]
    scored = sorted(((e, n / total) for e, n in counts.items() if n > 0),
                    key=lambda x: x[1], reverse=True)
    return [Scored(name=e, score=_round(s)) for e, s in scored]


# ════════════════════════════════════════════════════════════════════════════
# STAGE 4 — THE EIGHT VISUAL DIMENSIONS
# ════════════════════════════════════════════════════════════════════════════
# How each emotion label pushes on the dimensions.
EMOTION_TO_DIM = {
    "joy":      {"intimacy": 0.3, "physicality": 0.2},
    "sadness":  {"nostalgia": 0.6, "intimacy": 0.4},
    "fear":     {"urgency": 0.6, "chaos": 0.4, "surrealism": 0.2},
    "anger":    {"chaos": 0.6, "urgency": 0.5, "physicality": 0.3},
    "surprise": {"urgency": 0.5, "surrealism": 0.4, "chaos": 0.3},
    "disgust":  {"physicality": 0.4, "chaos": 0.3},
    "neutral":  {},
}


def visual_layer(text: str, ling: Linguistic, concepts: list[Scored],
                 emotions: list[Scored]) -> Visual:
    low = text.lower()
    toks = _tokens(text)
    n = max(len(toks), 1)

    def density(lex):
        return sum(toks.count(w) if " " not in w else low.count(w) for w in lex) / n

    # ── concept contribution (weighted average of matched concepts' dims) ──
    by_name = {c["name"]: c for c in CONCEPTS}
    concept_dim = {d: 0.0 for d in VISUAL_DIMENSIONS}
    wsum = 0.0
    for s in concepts:
        c = by_name.get(s.name)
        if not c:
            continue
        w = max(s.score, 0.0)
        wsum += w
        for d, v in c["dims"].items():
            concept_dim[d] += w * v
    if wsum > 0:
        concept_dim = {d: v / wsum for d, v in concept_dim.items()}

    # ── emotion contribution ──
    emo_dim = {d: 0.0 for d in VISUAL_DIMENSIONS}
    for e in emotions:
        for d, v in EMOTION_TO_DIM.get(e.name, {}).items():
            emo_dim[d] += e.score * v

    # ── linguistic / structural contribution ──
    lengths = ling.sentenceLengths or [n]
    mean_len = sum(lengths) / len(lengths)
    var = sum((l - mean_len) ** 2 for l in lengths) / len(lengths)
    sd = math.sqrt(var)
    short_frac = sum(1 for l in lengths if l <= 4) / len(lengths)
    pron_density = sum(toks.count(p) for p in PRONOUN_1_2) / n
    past = getattr(ling, "_tense", {}).get("Past", 0)
    pres = getattr(ling, "_tense", {}).get("Pres", 0)
    past_ratio = past / (past + pres) if (past + pres) else (
        1.0 if any(w in low for w in ["was", "were", "had", "used to", "ago"]) else 0.4)
    dash = (low.count("—") + low.count(" - ") + low.count("...") + low.count("…")) / max(len(lengths), 1)
    excl = low.count("!") / max(len(lengths), 1)

    ling_dim = {
        "intimacy":      0.6 * pron_density * 6 + 0.4 * density(DOMESTIC_LEX) * 8,
        "chaos":         0.5 * min(sd / 8, 1) + 0.3 * excl + 0.3 * density(URGENCY_LEX) * 6,
        "nostalgia":     0.7 * past_ratio + 0.5 * (len(ling.temporalReferences) / 8),
        "surrealism":    density(SURREAL_LEX) * 10,
        "physicality":   density(BODY_SENSE_LEX) * 7,
        "urgency":       0.5 * density(URGENCY_LEX) * 6 + 0.3 * short_frac + 0.3 * excl,
        "fragmentation": 0.5 * short_frac + 0.4 * min(sd / 8, 1) + 0.4 * dash,
        "spatiality":    0.7 * density(SPATIAL_LEX) * 6 + 0.3 * (len(ling.places) / 5),
    }

    # ── blend: concept 0.45 · emotion 0.2 · linguistic 0.35 ──
    out = {}
    for d in VISUAL_DIMENSIONS:
        out[d] = _round(_norm(0.45 * concept_dim[d] + 0.20 * emo_dim[d] + 0.35 * _norm(ling_dim[d])))
    return Visual(**out)


# ════════════════════════════════════════════════════════════════════════════
# ORCHESTRATION
# ════════════════════════════════════════════════════════════════════════════
def analyze(text: str) -> VisualProfile:
    text = (text or "").strip()
    ling, ling_meta = linguistic_layer(text)
    concepts, concept_meta = concept_layer(text)
    emotions, emotion_meta = emotion_layer(text)
    visual = visual_layer(text, ling, concepts, emotions)

    # drop the private tense attr from the serialised linguistic block, keep in meta
    tense = getattr(ling, "_tense", {})
    if hasattr(ling, "_tense"):
        delattr(ling, "_tense")

    prof = VisualProfile(
        semantic=Semantic(concepts=concepts, emotions=emotions),
        linguistic=ling,
        visual=visual,
        meta={
            "backends": {
                "linguistic": ling_meta,
                "concepts": concept_meta,
                "emotion": emotion_meta,
            },
            "tense": tense,
            "chars": len(text),
            "fully_offline": all(
                m["backend"].endswith("fallback")
                for m in (ling_meta, concept_meta, emotion_meta)
            ),
        },
    )
    return prof
