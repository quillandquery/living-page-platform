"""
THE VISUAL CONCEPT LIBRARY
==========================

~100 evocative visual concepts — the *target taxonomy* the new brain matches
writing against. This is NOT the existing doodle / backdrop registry (those are
~38 line-drawings and ~16 worlds). It is a richer, image-grade vocabulary of
the kind of pictures a story *evokes*: "faded photograph", "wet pavement",
"airport board".

How it's used
-------------
`sentence-transformers` embeds the user's prose and each concept's `description`
into the same vector space; cosine similarity ranks which concepts the writing
is "visually near". Those become `VisualProfile.semantic.concepts`, and each
matched concept also pushes on the eight `visual` dimensions via its `dims`,
so the picture-vocabulary and the abstract mood axes stay coherent.

Fields per concept
------------------
- name        : the concept label (what surfaces in the profile).
- description : an evocative one-line *essence*, written to embed well against
                narrative prose (this is the string the transformer sees).
- category    : grouping, for inspection / later curation.
- dims        : affinities 0..1 over the eight visual dimensions. A concept
                only lists the dimensions it genuinely leans into.
- tags        : plain keywords, used ONLY by the offline lexical fallback when
                sentence-transformers isn't available. The real matcher is
                semantic and does not need these.

This is deliberately a *new target taxonomy* (per the build decision): mapping
each concept onto a renderable (a curated cutout, a doodle, a backdrop layer)
is a later pass. Growing the library = adding rows here, no code changes.
"""

from __future__ import annotations

# The eight visual dimensions every concept can push on.
VISUAL_DIMENSIONS = (
    "intimacy",
    "chaos",
    "nostalgia",
    "surrealism",
    "physicality",
    "urgency",
    "fragmentation",
    "spatiality",
)

# name, description, category, dims, tags
CONCEPTS: list[dict] = [
    # ── MEMORY · EPHEMERA · PAPER ──────────────────────────────────────────
    {"name": "faded photograph",
     "description": "An old photograph gone soft and yellow with age, colours bleached by years, a remembered face half-dissolved into the paper.",
     "category": "ephemera",
     "dims": {"nostalgia": 0.95, "intimacy": 0.7, "fragmentation": 0.3},
     "tags": ["photo", "photograph", "picture", "album", "snapshot", "faded"]},

    {"name": "handwritten note",
     "description": "A short note scrawled by hand, ink pressed into paper, private and unguarded, meant for one person only.",
     "category": "ephemera",
     "dims": {"intimacy": 0.9, "nostalgia": 0.6},
     "tags": ["note", "wrote", "handwriting", "scribbled", "ink", "pen"]},

    {"name": "newspaper clipping",
     "description": "A brittle rectangle torn from a newspaper, headline fading, kept for a reason no one quite remembers.",
     "category": "ephemera",
     "dims": {"nostalgia": 0.8, "fragmentation": 0.6},
     "tags": ["newspaper", "clipping", "headline", "article", "print"]},

    {"name": "passport stamp",
     "description": "Inked borders stamped into a passport page, a smeared date and a foreign city, proof of having crossed somewhere.",
     "category": "ephemera",
     "dims": {"nostalgia": 0.6, "spatiality": 0.6, "fragmentation": 0.3},
     "tags": ["passport", "stamp", "visa", "border", "customs", "immigration"]},

    {"name": "receipt",
     "description": "A thin curling receipt, faint thermal ink, the small accidental record of an ordinary afternoon.",
     "category": "ephemera",
     "dims": {"physicality": 0.5, "fragmentation": 0.6, "nostalgia": 0.4},
     "tags": ["receipt", "bill", "change", "paid", "counter"]},

    {"name": "pressed flower",
     "description": "A flower flattened and dried between the pages of a book, petals paper-thin, colour drained to a ghost of itself.",
     "category": "ephemera",
     "dims": {"nostalgia": 0.9, "intimacy": 0.8, "fragmentation": 0.3},
     "tags": ["pressed", "flower", "petal", "dried", "book pages"]},

    {"name": "film negative",
     "description": "A strip of photographic negative held to the light, the world rendered in reversed colour and shadow, latent and unreal.",
     "category": "ephemera",
     "dims": {"nostalgia": 0.7, "surrealism": 0.6, "fragmentation": 0.5},
     "tags": ["negative", "film", "strip", "darkroom", "exposure"]},

    {"name": "postcard",
     "description": "A glossy postcard from somewhere sunny, a short message on the back, a place turned into a small bright rectangle.",
     "category": "ephemera",
     "dims": {"nostalgia": 0.7, "spatiality": 0.6, "intimacy": 0.4},
     "tags": ["postcard", "greetings", "wish you were here", "souvenir"]},

    {"name": "ticket stub",
     "description": "A torn ticket stub kept in a pocket, the stamp of an evening that mattered more than the show.",
     "category": "ephemera",
     "dims": {"nostalgia": 0.8, "fragmentation": 0.5},
     "tags": ["ticket", "stub", "admit", "boarding pass", "fare"]},

    {"name": "museum label",
     "description": "A small printed label beside an exhibit, measured and quiet, naming a thing kept behind glass.",
     "category": "ephemera",
     "dims": {"spatiality": 0.5, "physicality": 0.4},
     "tags": ["museum", "label", "exhibit", "gallery", "placard", "glass case"]},

    {"name": "map fragment",
     "description": "A torn corner of a map, roads running off the edge of the paper, a place half-known and half-missing.",
     "category": "ephemera",
     "dims": {"fragmentation": 0.8, "spatiality": 0.7},
     "tags": ["map", "route", "atlas", "folded", "directions"]},

    {"name": "childhood drawing",
     "description": "A child's crayon drawing, lines wobbling with effort, a whole world rendered flat and fearless and bright.",
     "category": "ephemera",
     "dims": {"nostalgia": 0.9, "intimacy": 0.8, "chaos": 0.3},
     "tags": ["crayon", "child", "drawing", "scribble", "kid", "school"]},

    {"name": "diary page",
     "description": "An open page of a private diary, the day's small truths set down in a hand that trusts no one will read them.",
     "category": "ephemera",
     "dims": {"intimacy": 0.95, "nostalgia": 0.6},
     "tags": ["diary", "journal", "entry", "wrote", "confession"]},

    {"name": "polaroid",
     "description": "A Polaroid still developing in your hand, the image swimming up out of grey, a moment caught before it was ready.",
     "category": "ephemera",
     "dims": {"nostalgia": 0.85, "intimacy": 0.7},
     "tags": ["polaroid", "instant", "snapshot", "developing"]},

    {"name": "letter in an envelope",
     "description": "A folded letter inside a sealed envelope, weightier than its paper, carrying something that wanted saying slowly.",
     "category": "ephemera",
     "dims": {"intimacy": 0.9, "nostalgia": 0.6},
     "tags": ["letter", "envelope", "posted", "mail", "sealed", "stamp"]},

    {"name": "red thread",
     "description": "A single red thread stretched taut between two points, a fragile line drawn between people who were meant to meet.",
     "category": "ephemera",
     "dims": {"surrealism": 0.6, "intimacy": 0.7, "fragmentation": 0.3},
     "tags": ["thread", "string", "red", "connection", "tied", "bound"]},

    {"name": "pin board with strings",
     "description": "A cork board covered in photos and notes, red string crossing between them, an obsession trying to become a pattern.",
     "category": "ephemera",
     "dims": {"chaos": 0.7, "fragmentation": 0.7, "urgency": 0.3},
     "tags": ["board", "pinned", "strings", "notes", "investigation", "wall"]},

    {"name": "medical diagram",
     "description": "A clinical anatomical diagram, a body opened into labelled parts, intimacy rendered cold and exact.",
     "category": "ephemera",
     "dims": {"physicality": 0.8, "surrealism": 0.4, "fragmentation": 0.4},
     "tags": ["diagram", "anatomy", "medical", "x-ray", "chart", "clinical"]},

    {"name": "blueprint",
     "description": "A blue architectural blueprint, white lines laying out a building that only exists as intention.",
     "category": "ephemera",
     "dims": {"spatiality": 0.7, "physicality": 0.5},
     "tags": ["blueprint", "plan", "architecture", "drawing", "grid"]},

    {"name": "wax seal",
     "description": "A blot of wax pressed with a crest, sealing something closed, formal and old and private.",
     "category": "ephemera",
     "dims": {"nostalgia": 0.7, "intimacy": 0.5},
     "tags": ["wax", "seal", "crest", "letter", "sealed"]},

    {"name": "chalkboard",
     "description": "A green chalkboard dusted with the ghosts of erased words, a surface that holds and forgets in the same breath.",
     "category": "ephemera",
     "dims": {"nostalgia": 0.7, "physicality": 0.4, "fragmentation": 0.3},
     "tags": ["chalkboard", "blackboard", "chalk", "classroom", "erased"]},

    {"name": "x-ray",
     "description": "An x-ray on a lightbox, the body reduced to pale architecture of bone, private interior made suddenly visible.",
     "category": "ephemera",
     "dims": {"physicality": 0.8, "surrealism": 0.5, "fragmentation": 0.4},
     "tags": ["x-ray", "scan", "bones", "lightbox", "radiograph"]},

    # ── WATER · WEATHER · SKY ──────────────────────────────────────────────
    {"name": "wet pavement",
     "description": "A city pavement slick with rain, streetlight smeared across it, the ground turned briefly into a mirror.",
     "category": "weather",
     "dims": {"nostalgia": 0.6, "intimacy": 0.5, "spatiality": 0.4},
     "tags": ["pavement", "wet", "rain", "sidewalk", "puddle", "street"]},

    {"name": "water reflection",
     "description": "A reflection trembling on the surface of still water, the world doubled and softly wrong.",
     "category": "weather",
     "dims": {"surrealism": 0.6, "spatiality": 0.6, "nostalgia": 0.3},
     "tags": ["reflection", "water", "surface", "mirror", "still", "lake"]},

    {"name": "rain on a window",
     "description": "Rain running in tracks down a window, the view beyond blurred to colour and motion, a held, watching quiet.",
     "category": "weather",
     "dims": {"nostalgia": 0.7, "intimacy": 0.7},
     "tags": ["rain", "window", "drizzle", "glass", "watching", "storm"]},

    {"name": "fog over a field",
     "description": "Fog lying thick over an open field, the far edge erased, distance turned into soft nothing.",
     "category": "weather",
     "dims": {"surrealism": 0.6, "spatiality": 0.8, "nostalgia": 0.3},
     "tags": ["fog", "mist", "field", "haze", "morning", "grey"]},

    {"name": "morning mist",
     "description": "Thin mist hanging low at first light, the day not yet decided, everything soft and provisional.",
     "category": "weather",
     "dims": {"nostalgia": 0.6, "spatiality": 0.6, "intimacy": 0.4},
     "tags": ["mist", "morning", "dawn", "haze", "first light"]},

    {"name": "puddle",
     "description": "A small puddle holding a scrap of sky, a whole bright world caught in a few centimetres of water.",
     "category": "weather",
     "dims": {"intimacy": 0.5, "fragmentation": 0.4, "surrealism": 0.3},
     "tags": ["puddle", "rain", "reflection", "street", "water"]},

    {"name": "ocean horizon",
     "description": "The flat line where the sea meets the sky, vast and unbroken, a distance too wide to hold.",
     "category": "weather",
     "dims": {"spatiality": 0.9, "nostalgia": 0.3},
     "tags": ["ocean", "sea", "horizon", "shore", "coast", "waves", "tide"]},

    {"name": "crashing wave",
     "description": "A wave collapsing in white violence against the shore, enormous and indifferent and alive.",
     "category": "weather",
     "dims": {"chaos": 0.8, "physicality": 0.8, "urgency": 0.6},
     "tags": ["wave", "crash", "surf", "break", "sea", "spray"]},

    {"name": "ripples spreading",
     "description": "Rings of ripple widening across still water from a single dropped point, consequence made visible.",
     "category": "weather",
     "dims": {"spatiality": 0.6, "surrealism": 0.4},
     "tags": ["ripple", "water", "rings", "spreading", "pond"]},

    {"name": "frost on glass",
     "description": "Feathered frost crystallised across a cold windowpane, delicate and fractal, the breath of winter drawn in ice.",
     "category": "weather",
     "dims": {"intimacy": 0.6, "fragmentation": 0.6, "surrealism": 0.3},
     "tags": ["frost", "ice", "window", "cold", "winter", "crystals"]},

    {"name": "snowfall",
     "description": "Snow falling thick and soundless, muffling the world, each flake a small suspended hesitation.",
     "category": "weather",
     "dims": {"spatiality": 0.6, "surrealism": 0.4, "nostalgia": 0.6},
     "tags": ["snow", "snowfall", "winter", "flakes", "white", "cold"]},

    {"name": "storm clouds",
     "description": "Dark storm clouds stacking on the horizon, pressure building, the air gone heavy and electric.",
     "category": "weather",
     "dims": {"chaos": 0.6, "urgency": 0.6, "spatiality": 0.5},
     "tags": ["storm", "clouds", "dark", "thunder", "sky", "pressure"]},

    {"name": "lightning",
     "description": "A fork of lightning splitting the sky white for an instant, the whole world photographed by its own violence.",
     "category": "weather",
     "dims": {"urgency": 0.8, "chaos": 0.7, "physicality": 0.6},
     "tags": ["lightning", "thunder", "flash", "strike", "storm"]},

    {"name": "dew on grass",
     "description": "Beads of dew strung along blades of grass at dawn, the whole lawn glittering with small cold jewels.",
     "category": "weather",
     "dims": {"intimacy": 0.6, "physicality": 0.5, "nostalgia": 0.4},
     "tags": ["dew", "grass", "morning", "wet", "drops"]},

    {"name": "steam rising",
     "description": "Steam curling up from a hot surface into cold air, shape without substance, warmth made briefly visible.",
     "category": "weather",
     "dims": {"surrealism": 0.5, "intimacy": 0.5},
     "tags": ["steam", "vapour", "rising", "hot", "kettle", "breath"]},

    {"name": "sunlight through leaves",
     "description": "Sunlight broken into shifting coins by a canopy of leaves, dappled light moving over the ground.",
     "category": "weather",
     "dims": {"nostalgia": 0.6, "spatiality": 0.5, "intimacy": 0.5},
     "tags": ["sunlight", "leaves", "dappled", "canopy", "trees", "light"]},

    {"name": "dust in a sunbeam",
     "description": "Motes of dust drifting and turning in a shaft of afternoon light, time made slow and visible in still air.",
     "category": "weather",
     "dims": {"nostalgia": 0.7, "intimacy": 0.6, "surrealism": 0.4, "spatiality": 0.3},
     "tags": ["dust", "sunbeam", "motes", "light", "window", "afternoon"]},

    # ── TRAVEL · TRANSIT ───────────────────────────────────────────────────
    {"name": "airport board",
     "description": "A departures board clattering through cities and times, every line a leaving, the whole world made of elsewhere.",
     "category": "transit",
     "dims": {"urgency": 0.6, "spatiality": 0.6, "fragmentation": 0.5},
     "tags": ["airport", "departures", "board", "gate", "flight", "terminal"]},

    {"name": "train window",
     "description": "Landscape streaming past a train window, the world pulled sideways and away, thought running with it.",
     "category": "transit",
     "dims": {"nostalgia": 0.6, "spatiality": 0.7},
     "tags": ["train", "window", "carriage", "rails", "platform", "journey"]},

    {"name": "empty platform",
     "description": "A railway platform after the train has gone, the long quiet of a place built only for leaving.",
     "category": "transit",
     "dims": {"nostalgia": 0.7, "spatiality": 0.6, "intimacy": 0.4},
     "tags": ["platform", "station", "empty", "train", "waiting"]},

    {"name": "suitcase packed",
     "description": "A suitcase lying open and overfull on the bed, a life folded hurriedly into a box with a handle.",
     "category": "transit",
     "dims": {"urgency": 0.6, "physicality": 0.6, "nostalgia": 0.3},
     "tags": ["suitcase", "luggage", "packed", "backpack", "leaving"]},

    {"name": "departure lounge",
     "description": "A departure lounge full of strangers all waiting to be elsewhere, suspended in the grey time between places.",
     "category": "transit",
     "dims": {"spatiality": 0.6, "urgency": 0.4, "fragmentation": 0.4},
     "tags": ["lounge", "waiting", "departure", "airport", "gate"]},

    {"name": "road at night",
     "description": "A dark road unspooling in the headlights, the world shrunk to the two cones of light and the hum of the engine.",
     "category": "transit",
     "dims": {"spatiality": 0.7, "surrealism": 0.5, "nostalgia": 0.4},
     "tags": ["road", "night", "driving", "headlights", "highway", "dark"]},

    {"name": "highway vanishing point",
     "description": "A straight highway narrowing to a single point on the horizon, distance you could drive into forever.",
     "category": "transit",
     "dims": {"spatiality": 0.8, "urgency": 0.4},
     "tags": ["highway", "road", "horizon", "vanishing", "straight", "drive"]},

    {"name": "ferry wake",
     "description": "The churned white wake trailing behind a ferry, the water remembering the boat for a moment and then forgetting.",
     "category": "transit",
     "dims": {"spatiality": 0.6, "physicality": 0.5, "nostalgia": 0.3},
     "tags": ["ferry", "boat", "wake", "water", "sail", "crossing"]},

    {"name": "roadside motel sign",
     "description": "A buzzing neon motel sign glowing against the dark, promising rest to anyone still moving at this hour.",
     "category": "transit",
     "dims": {"nostalgia": 0.6, "surrealism": 0.4, "urgency": 0.3},
     "tags": ["motel", "sign", "neon", "roadside", "vacancy", "night"]},

    {"name": "car headlights",
     "description": "Oncoming headlights swelling and sweeping past, a brief blinding intimacy with a stranger in the dark.",
     "category": "transit",
     "dims": {"urgency": 0.6, "physicality": 0.5, "chaos": 0.3},
     "tags": ["headlights", "car", "lights", "driving", "night", "road"]},

    {"name": "bicycle leaning on a wall",
     "description": "A bicycle propped against a sunlit wall, waiting, patient, the whole afternoon in its stillness.",
     "category": "transit",
     "dims": {"nostalgia": 0.6, "intimacy": 0.5},
     "tags": ["bicycle", "bike", "wall", "leaning", "street"]},

    # ── DOMESTIC · OBJECTS ─────────────────────────────────────────────────
    {"name": "kitchen table",
     "description": "A worn kitchen table where everything important was said sideways, over tea, in a house that smelled of home.",
     "category": "domestic",
     "dims": {"intimacy": 0.8, "nostalgia": 0.7},
     "tags": ["kitchen", "table", "home", "tea", "chairs", "meal"]},

    {"name": "unmade bed",
     "description": "An unmade bed in morning light, sheets still holding the shape of sleep, a room that hasn't woken up yet.",
     "category": "domestic",
     "dims": {"intimacy": 0.8, "physicality": 0.5, "nostalgia": 0.3},
     "tags": ["bed", "unmade", "sheets", "morning", "bedroom", "sleep"]},

    {"name": "cup of tea cooling",
     "description": "A cup of tea going cold and skinned-over on the table, forgotten while something more important happened.",
     "category": "domestic",
     "dims": {"intimacy": 0.7, "nostalgia": 0.6},
     "tags": ["tea", "cup", "coffee", "mug", "cooling", "chai"]},

    {"name": "open window curtain",
     "description": "A thin curtain breathing at an open window, the outside leaning gently into the room on a warm current of air.",
     "category": "domestic",
     "dims": {"intimacy": 0.6, "spatiality": 0.5, "nostalgia": 0.4},
     "tags": ["curtain", "window", "breeze", "open", "drapes", "air"]},

    {"name": "single lightbulb",
     "description": "A bare bulb hanging on a cord, a small hard circle of light surrounded by a whole room of dark.",
     "category": "domestic",
     "dims": {"intimacy": 0.6, "spatiality": 0.4, "surrealism": 0.3},
     "tags": ["lightbulb", "bulb", "lamp", "cord", "bare", "light"]},

    {"name": "cracked mirror",
     "description": "A mirror split by a crack, the reflection broken into slightly disagreeing pieces of the same face.",
     "category": "domestic",
     "dims": {"fragmentation": 0.8, "surrealism": 0.5, "physicality": 0.3},
     "tags": ["mirror", "cracked", "broken", "reflection", "shattered"]},

    {"name": "clock face",
     "description": "A clock face with its hands caught mid-afternoon, time insisting on itself in a quiet room.",
     "category": "domestic",
     "dims": {"urgency": 0.5, "physicality": 0.4, "nostalgia": 0.3},
     "tags": ["clock", "time", "hands", "ticking", "watch", "hour"]},

    {"name": "keys on a hook",
     "description": "A bunch of keys hanging on a hook by the door, every one of them a place you're allowed to come back to.",
     "category": "domestic",
     "dims": {"intimacy": 0.6, "nostalgia": 0.5},
     "tags": ["keys", "hook", "door", "lock", "home"]},

    {"name": "worn armchair",
     "description": "An old armchair shaped by years of one person sitting in it, the fabric soft and faded exactly where it was loved.",
     "category": "domestic",
     "dims": {"nostalgia": 0.8, "intimacy": 0.7, "physicality": 0.4},
     "tags": ["armchair", "chair", "worn", "faded", "sitting", "old"]},

    {"name": "record player",
     "description": "A record turning under a needle, a little surface hiss and then a voice from another decade filling the room.",
     "category": "domestic",
     "dims": {"nostalgia": 0.85, "intimacy": 0.6},
     "tags": ["record", "vinyl", "player", "needle", "turntable", "music"]},

    {"name": "telephone cord",
     "description": "A coiled telephone cord stretched across a hallway, a conversation someone didn't want anyone else to hear.",
     "category": "domestic",
     "dims": {"nostalgia": 0.7, "intimacy": 0.6},
     "tags": ["telephone", "phone", "cord", "call", "ring", "receiver"]},

    {"name": "stack of books",
     "description": "A leaning stack of books by the bed, spines cracked, the slow private company of other people's minds.",
     "category": "domestic",
     "dims": {"intimacy": 0.6, "physicality": 0.4, "nostalgia": 0.4},
     "tags": ["books", "stack", "reading", "pile", "spines", "shelf"]},

    {"name": "half-eaten meal",
     "description": "A meal abandoned half-finished, cutlery dropped at an angle, the sudden interruption still hanging in the air.",
     "category": "domestic",
     "dims": {"physicality": 0.5, "intimacy": 0.4, "urgency": 0.3},
     "tags": ["meal", "food", "plate", "half-eaten", "dinner", "table"]},

    {"name": "spilled coffee",
     "description": "Coffee spreading in a dark stain across a table, a small accident blooming into something unignorable.",
     "category": "domestic",
     "dims": {"chaos": 0.6, "physicality": 0.6, "urgency": 0.4},
     "tags": ["coffee", "spilled", "stain", "spill", "mess", "table"]},

    {"name": "candle flame",
     "description": "A single candle flame leaning and recovering in the draft, holding a small warm sphere of light against the dark.",
     "category": "domestic",
     "dims": {"intimacy": 0.7, "surrealism": 0.3, "nostalgia": 0.4},
     "tags": ["candle", "flame", "wick", "light", "flicker", "wax"]},

    # ── NATURE · BODY ──────────────────────────────────────────────────────
    {"name": "pressed leaf",
     "description": "A single autumn leaf pressed flat and translucent, its veins a dried map of the summer it outlived.",
     "category": "nature",
     "dims": {"nostalgia": 0.7, "fragmentation": 0.5, "physicality": 0.3},
     "tags": ["leaf", "pressed", "autumn", "dried", "veins"]},

    {"name": "bare tree branches",
     "description": "The black branching of a winter tree against a pale sky, a nervous system drawn against the cold.",
     "category": "nature",
     "dims": {"spatiality": 0.6, "fragmentation": 0.6, "nostalgia": 0.3},
     "tags": ["tree", "branches", "bare", "winter", "silhouette"]},

    {"name": "field of wildflowers",
     "description": "A whole field loud with wildflowers in the sun, colour running riot all the way to the far hedge.",
     "category": "nature",
     "dims": {"spatiality": 0.7, "intimacy": 0.4, "chaos": 0.3},
     "tags": ["field", "wildflowers", "meadow", "flowers", "grass", "bloom"]},

    {"name": "moth at a window",
     "description": "A moth beating softly against a lit window at night, drawn to a warmth on the wrong side of the glass.",
     "category": "nature",
     "dims": {"surrealism": 0.5, "intimacy": 0.6, "urgency": 0.3},
     "tags": ["moth", "window", "wings", "light", "night", "insect"]},

    {"name": "bird in flight",
     "description": "A single bird lifting off and climbing hard into open sky, the body of a decision becoming distance.",
     "category": "nature",
     "dims": {"spatiality": 0.7, "urgency": 0.5},
     "tags": ["bird", "flight", "wings", "sky", "flying", "gull", "pigeon"]},

    {"name": "spider web",
     "description": "A spider web strung with dew between two branches, an impossibly fine geometry that a breath could ruin.",
     "category": "nature",
     "dims": {"fragmentation": 0.6, "intimacy": 0.5, "surrealism": 0.4},
     "tags": ["web", "spider", "cobweb", "threads", "silk", "dew"]},

    {"name": "seashell",
     "description": "A seashell held to the ear, a spiral of lime holding a hush that sounds exactly like the sea you remember.",
     "category": "nature",
     "dims": {"nostalgia": 0.7, "physicality": 0.4, "intimacy": 0.4},
     "tags": ["shell", "seashell", "spiral", "beach", "ocean", "sand"]},

    {"name": "footprints in sand",
     "description": "A line of footprints crossing wet sand, already softening at the edges, a path the tide will take back soon.",
     "category": "nature",
     "dims": {"nostalgia": 0.6, "spatiality": 0.6, "physicality": 0.4},
     "tags": ["footprints", "sand", "beach", "tracks", "shore", "tide"]},

    {"name": "hands held",
     "description": "Two hands clasped together, fingers laced, a small private architecture of staying close.",
     "category": "body",
     "dims": {"intimacy": 0.95, "physicality": 0.6},
     "tags": ["hands", "held", "holding", "fingers", "clasped", "touch"]},

    {"name": "a heartbeat",
     "description": "The felt thud of a heartbeat, blood insisting on itself, the body's loud private clock in a quiet moment.",
     "category": "body",
     "dims": {"physicality": 0.8, "urgency": 0.5, "intimacy": 0.6},
     "tags": ["heartbeat", "heart", "pulse", "chest", "beating", "blood"]},

    {"name": "breath in cold air",
     "description": "A breath made visible in cold air, proof of being alive drifting and dispersing in front of your face.",
     "category": "body",
     "dims": {"intimacy": 0.6, "physicality": 0.6, "surrealism": 0.4},
     "tags": ["breath", "cold", "winter", "exhale", "fog", "air"]},

    {"name": "scar on skin",
     "description": "An old scar tracing a pale line across skin, a story the body decided to keep without being asked.",
     "category": "body",
     "dims": {"physicality": 0.7, "nostalgia": 0.5, "intimacy": 0.6},
     "tags": ["scar", "skin", "wound", "healed", "mark", "body"]},

    {"name": "veins of a leaf",
     "description": "The branching veins of a leaf held to the light, a delicate circulatory map almost too fine to see.",
     "category": "nature",
     "dims": {"fragmentation": 0.6, "physicality": 0.4, "surrealism": 0.4},
     "tags": ["veins", "leaf", "branching", "light", "delicate"]},

    {"name": "murmuration of birds",
     "description": "A murmuration of starlings folding and pouring across the dusk sky, a thousand birds thinking as one restless shape.",
     "category": "nature",
     "dims": {"chaos": 0.7, "spatiality": 0.7, "surrealism": 0.5},
     "tags": ["murmuration", "starlings", "flock", "birds", "sky", "swarm"]},

    # ── URBAN · LIGHT · TIME ───────────────────────────────────────────────
    {"name": "neon sign",
     "description": "A neon sign buzzing pink and blue against wet dark, electric colour bleeding into the night street.",
     "category": "urban",
     "dims": {"urgency": 0.5, "surrealism": 0.5, "chaos": 0.3, "spatiality": 0.3},
     "tags": ["neon", "sign", "lights", "night", "city", "glow"]},

    {"name": "streetlight glow",
     "description": "The amber cone of a streetlight pooling on an empty pavement, warm and lonely at the same time.",
     "category": "urban",
     "dims": {"nostalgia": 0.6, "intimacy": 0.5, "spatiality": 0.4},
     "tags": ["streetlight", "lamppost", "glow", "night", "street", "amber"]},

    {"name": "crowded market",
     "description": "A market packed with noise and colour and bodies, a hundred transactions and smells happening all at once.",
     "category": "urban",
     "dims": {"chaos": 0.8, "physicality": 0.6, "urgency": 0.5},
     "tags": ["market", "crowd", "bazaar", "stalls", "busy", "noise"]},

    {"name": "empty street at dawn",
     "description": "A city street completely empty in the grey of dawn, the usual crowd not yet arrived, the place holding its breath.",
     "category": "urban",
     "dims": {"spatiality": 0.6, "nostalgia": 0.5, "intimacy": 0.4},
     "tags": ["empty", "street", "dawn", "quiet", "city", "morning"]},

    {"name": "shop window reflection",
     "description": "A shop window layering reflection over display, your own face hanging ghostly among the things for sale.",
     "category": "urban",
     "dims": {"surrealism": 0.6, "fragmentation": 0.4, "intimacy": 0.3},
     "tags": ["shop", "window", "reflection", "glass", "display", "street"]},

    {"name": "subway tunnel",
     "description": "The dark throat of a subway tunnel, tiled and echoing, the rush of air that arrives before the train does.",
     "category": "urban",
     "dims": {"spatiality": 0.6, "urgency": 0.5, "chaos": 0.3},
     "tags": ["subway", "tunnel", "metro", "underground", "train", "platform"]},

    {"name": "flickering fluorescent",
     "description": "A fluorescent tube stuttering on and off, lighting a corridor in nervous, unreliable, migraine-coloured pulses.",
     "category": "urban",
     "dims": {"urgency": 0.5, "chaos": 0.5, "surrealism": 0.5},
     "tags": ["fluorescent", "flicker", "light", "corridor", "buzzing", "tube"]},

    {"name": "shadow on a wall",
     "description": "A long shadow thrown across a wall by late light, a shape larger and stranger than the thing that cast it.",
     "category": "urban",
     "dims": {"surrealism": 0.6, "spatiality": 0.4, "intimacy": 0.3},
     "tags": ["shadow", "wall", "light", "silhouette", "cast"]},

    {"name": "long exposure traffic",
     "description": "Headlights and tail-lights smeared into long ribbons of red and white, a night of motion compressed into light.",
     "category": "urban",
     "dims": {"chaos": 0.6, "urgency": 0.6, "spatiality": 0.5},
     "tags": ["traffic", "exposure", "lights", "trails", "night", "city", "cars"]},

    {"name": "clocktower",
     "description": "A clocktower standing over a square, its hands ruling the whole town's day from above the rooftops.",
     "category": "urban",
     "dims": {"physicality": 0.5, "urgency": 0.4, "spatiality": 0.4},
     "tags": ["clocktower", "tower", "clock", "square", "time", "town"]},

    # ── SURREAL · ABSTRACT · FRAGMENT ──────────────────────────────────────
    {"name": "shattered glass",
     "description": "A pane of glass caught in the instant of shattering, the whole surface flying apart into bright sharp pieces.",
     "category": "surreal",
     "dims": {"fragmentation": 0.9, "chaos": 0.7, "physicality": 0.6, "urgency": 0.5},
     "tags": ["glass", "shattered", "broken", "shards", "smash", "pieces"]},

    {"name": "double exposure",
     "description": "Two photographs overlaid into one, a face dissolving into a cityscape, two moments refusing to stay separate.",
     "category": "surreal",
     "dims": {"surrealism": 0.8, "fragmentation": 0.5, "nostalgia": 0.5},
     "tags": ["double exposure", "overlay", "layered", "ghost", "photograph"]},

    {"name": "melting clock",
     "description": "A clock sagging and dripping off the edge of a table, time itself gone soft and lawless.",
     "category": "surreal",
     "dims": {"surrealism": 0.9, "nostalgia": 0.3},
     "tags": ["melting", "clock", "dripping", "dream", "time", "soft"]},

    {"name": "staircase to nowhere",
     "description": "A staircase climbing confidently up into blank air, arriving at nothing, a logic that only works in dreams.",
     "category": "surreal",
     "dims": {"surrealism": 0.9, "spatiality": 0.6},
     "tags": ["staircase", "stairs", "nowhere", "dream", "climbing", "impossible"]},

    {"name": "floating figure",
     "description": "A human figure suspended weightless in mid-air, calm and impossible, gravity quietly suspended around them.",
     "category": "surreal",
     "dims": {"surrealism": 0.8, "spatiality": 0.6, "intimacy": 0.3},
     "tags": ["floating", "figure", "suspended", "weightless", "dream", "air"]},

    {"name": "torn paper edge",
     "description": "The ragged white edge where paper has been torn, a clean story interrupted by a rough honest break.",
     "category": "surreal",
     "dims": {"fragmentation": 0.8, "physicality": 0.3},
     "tags": ["torn", "paper", "edge", "ripped", "ragged", "collage"]},

    {"name": "kaleidoscope",
     "description": "A kaleidoscope of shifting coloured fragments, symmetry assembling and collapsing with every small turn.",
     "category": "surreal",
     "dims": {"chaos": 0.7, "surrealism": 0.7, "fragmentation": 0.7},
     "tags": ["kaleidoscope", "fragments", "symmetry", "colour", "pattern"]},

    {"name": "mirror maze",
     "description": "A maze of mirrors multiplying you into endless corridors, every direction a reflection of being lost.",
     "category": "surreal",
     "dims": {"surrealism": 0.7, "fragmentation": 0.6, "spatiality": 0.6},
     "tags": ["mirror", "maze", "reflections", "endless", "lost", "corridors"]},

    {"name": "unspooled cassette tape",
     "description": "A cassette gutted into glossy brown ribbon spilling across the floor, a voice unravelled into tangle.",
     "category": "surreal",
     "dims": {"nostalgia": 0.6, "chaos": 0.6, "fragmentation": 0.6},
     "tags": ["cassette", "tape", "unspooled", "ribbon", "tangled", "mixtape"]},

    {"name": "open suitcase spilling",
     "description": "A dropped suitcase burst open on the floor, a life's contents thrown out in a sudden undignified fan.",
     "category": "surreal",
     "dims": {"chaos": 0.7, "urgency": 0.6, "physicality": 0.6, "fragmentation": 0.4},
     "tags": ["suitcase", "spilling", "dropped", "contents", "scattered", "luggage"]},
]


def validate() -> None:
    """Fail loud if the library drifts out of spec."""
    names = [c["name"] for c in CONCEPTS]
    assert len(names) == len(set(names)), "duplicate concept names"
    for c in CONCEPTS:
        assert c["description"].strip(), f"{c['name']}: empty description"
        for d in c["dims"]:
            assert d in VISUAL_DIMENSIONS, f"{c['name']}: unknown dim {d!r}"
            assert 0.0 <= c["dims"][d] <= 1.0, f"{c['name']}: dim out of range"


if __name__ == "__main__":
    validate()
    print(f"{len(CONCEPTS)} concepts, all valid.")
    from collections import Counter
    cats = Counter(c["category"] for c in CONCEPTS)
    for cat, n in cats.most_common():
        print(f"  {cat:12} {n}")
