/**
 * THE SEMANTIC STORY PROFILE
 *
 * Answers "what exists in this story?" — nothing more. It does NOT decide
 * how the story should look; that is `lib/art-direction/generate.ts`'s job.
 * Keeping this split is the whole point: two stories that share a place can
 * still diverge completely once the art-direction generator gets hold of
 * their different emotions, objects and endings.
 *
 * Six axes, each a *weighted* scorer (not first-match): PLACE, OBJECTS,
 * ACTION, EMOTION, TEMPORAL, NARRATIVE. Curated lexicons, in the spirit of
 * `lib/annotate.ts`'s LEX and `docs/DECISIONS.md` D6 — a closed, extensible
 * set, not an attempt at the PRD's literal hundred-item lists.
 */

export type Signal<K extends string> = { key: K; score: number };

function scoreAll<K extends string>(text: string, table: [K, RegExp][]): Signal<K>[] {
  const out: Signal<K>[] = [];
  for (const [key, re] of table) {
    const n = (text.match(new RegExp(re.source, "gi")) ?? []).length;
    if (n > 0) out.push({ key, score: n });
  }
  return out.sort((a, b) => b.score - a.score);
}

/* ── PLACE ─────────────────────────────────────────────────────────────
   Generic archetypes (D3: names stay generic; a story about Paris still
   scores "old_town" — the specific word just weighs in). Shared vocabulary
   with `lib/art-direction/environments.ts`, which is the authority on what
   each key renders as. */
export const PLACE_CUES: [string, RegExp][] = [
  ["coast", /\b(beach|sea|ocean|coast|shore|sand|wave|waves|surf|salt|tide|swim|shoreline)\b/i],
  ["underwater", /\b(underwater|dive|dived|diving|reef|scuba|snorkel|current|deep water|beneath the surface|submerged)\b/i],
  ["forest", /\b(forest|jungle|woods|trail|moss|pine|treeline|undergrowth)\b/i],
  ["highland", /\b(mountain|hill|ghat|ridge|valley|cliff|peak|altitude|summit)\b/i],
  ["meadow", /\b(field|meadow|flowers?|grass|picnic|wildflower|garden|bloom)\b/i],
  ["desertroad", /\b(desert|dune|highway|road trip|drove across|driving across|open road|rajasthan)\b/i],
  ["heat", /\b(desert|heat|noon|dust|dry|scorching|shimmer)\b/i],
  ["oldtown", /\b(paris|old town|cobbled|cobblestone|piazza|plaza|europe|european street|tram)\b/i],
  ["city", /\b(city|street|downtown|traffic|crowd|sidewalk|avenue|market|bangalore|mumbai|intersection)\b/i],
  ["nightcity", /\b(neon|nightlife|club|streetlight|midnight city|2\s?a\.?m|late night city)\b/i],
  ["train", /\b(train|station|platform|carriage|rails?|compartment)\b/i],
  ["road", /\b(bus|highway|drove|driving|car window|windshield)\b/i],
  ["airport", /\b(airport|boarding|gate|terminal|runway|departure lounge)\b/i],
  ["cafe", /\b(caf[eé]|coffee shop|bakery|bistro)\b/i],
  ["window", /\b(window|glass|watching from|train window|rainy window)\b/i],
  ["home", /\b(kitchen|bedroom|home|lamp|bed|apartment|sofa|couch|flat\b)\b/i],
  ["office", /\b(office|desk|corporate|meeting room|cubicle|colleagues)\b/i],
  ["palace", /\b(palace|chandelier|ballroom|royal|overdressed|grand hall|throne)\b/i],
  ["nightclub", /\b(nightclub|dance floor|dj|strobe|bass drop)\b/i],
  ["monsoon", /\b(rain|monsoon|storm|downpour|thunder|drizzle|flood)\b/i],
  ["dreamscape", /\b(dream|dreamt|surreal|floating|unreal|blur|imagine)\b/i],
  ["dawn", /\b(dawn|sunrise|first light|rooster)\b/i],
  ["nightroad", /\b(midnight|night bus|moonlit|4am|red-eye|drove through the night|asleep on the bus)\b/i],
  ["nightsky", /\b(stars|constellation|rooftop at night|quiet night)\b/i],
];

/* ── OBJECTS ───────────────────────────────────────────────────────────
   Concrete nouns the story can hand the artist. Kept in step with
   `components/doodles/registry.ts` — every key here should resolve to a
   drawable. */
export const OBJECT_CUES: [string, RegExp][] = [
  ["suitcase", /\b(suitcase|luggage|backpack|packed my|overflowing)\b/i],
  ["ticket", /\b(ticket|boarding pass|fare|rupees?|paid)\b/i],
  ["passport", /\b(passport|visa|customs|immigration desk)\b/i],
  ["umbrella", /\b(umbrella)\b/i],
  ["cup", /\b(coffee|chai|tea|cup|mug|glass of)\b/i],
  ["window", /\b(window|glass pane)\b/i],
  ["door", /\b(door|doorway|threshold)\b/i],
  ["clock", /\b(clock|watch|ticking|checked the time)\b/i],
  ["key", /\b(key|keys|lock|unlocked)\b/i],
  ["eye", /\b(eyes|stared|staring|watched|watching|mirror)\b/i],
  ["hand", /\b(hand|hands|held|holding|fingers|touch)\b/i],
  ["map", /\b(map|route|wrong turn|no idea where)\b/i],
  ["phone", /\b(phone|call|texted|message|screen)\b/i],
  ["car", /\b(car|windshield|dashboard|back seat|drove)\b/i],
  ["camel", /\b(camel)\b/i],
  ["curtain", /\b(curtain|drape|drapes)\b/i],
  ["chandelier", /\b(chandelier)\b/i],
  ["bird", /\b(bird|pigeon|gull|sparrow|kite\b)\b/i],
  ["fish", /\b(fish|market|net|prawn|crab)\b/i],
  ["boat", /\b(boat|ferry|ship|sail)\b/i],
  ["train", /\b(train|carriage|platform)\b/i],
  ["bus", /\b(bus|coach|conductor)\b/i],
  ["scooter", /\b(scooter|bike|motorbike|helmet)\b/i],
  ["flower", /\b(flower|garland|jasmine|petals?)\b/i],
  ["tree", /\b(tree|trees|oak|banyan|branches|treeline)\b/i],
  ["dove", /\b(dove|doves)\b/i],
  ["heart", /\b(heart|heartbeat|heart-shaped)\b/i],
  ["camera", /\b(camera|photograph|photo|snapshot|polaroid)\b/i],
  ["balloon", /\b(balloon|balloons)\b/i],
  ["dancer", /\b(danced|dancing|dance floor|twirled|twirling)\b/i],
  ["person", /\b(she left|he left|they left|walked away|without me|said goodbye)\b/i],
  ["moon", /\b(moon|moonlight)\b/i],
  ["sun", /\b(sun\b|sunlight|sunshine)\b/i],
];

/* ── ACTION ────────────────────────────────────────────────────────── */
export const ACTION_CUES: [string, RegExp][] = [
  ["travelling", /\b(travel|travelling|journey|trip)\b/i],
  ["walking", /\b(walk|walked|walking|wandered)\b/i],
  ["running", /\b(ran|running|sprint)\b/i],
  ["leaving", /\b(left|leaving|walked away|said goodbye)\b/i],
  ["arriving", /\b(arrived|arriving|landed|checked in)\b/i],
  ["falling", /\b(fell|falling|fall)\b/i],
  ["waiting", /\b(waited|waiting|still waiting)\b/i],
  ["driving", /\b(drove|driving|drive)\b/i],
  ["swimming", /\b(swam|swim|swimming)\b/i],
  ["dancing", /\b(danced|dancing|dance floor)\b/i],
  ["packing", /\b(packed|packing)\b/i],
  ["unpacking", /\b(unpacked|unpacking)\b/i],
  ["looking", /\b(looked|looking|watched|watching|stared)\b/i],
  ["remembering", /\b(remember|remembered|memory|recall)\b/i],
  ["escaping", /\b(escaped|escaping|ran from|got away)\b/i],
  ["hiding", /\b(hid|hiding|hidden)\b/i],
];

/* ── EMOTION ───────────────────────────────────────────────────────── */
export const EMOTION_CUES: [string, RegExp][] = [
  ["lonely", /\b(lonely|alone|isolated|no one|nobody)\b/i],
  ["ecstatic", /\b(ecstatic|thrilled|euphoric|electric|alive|exhilarat)\b/i],
  ["nostalgic", /\b(nostalgi|missed|used to|back then|childhood)\b/i],
  ["anxious", /\b(anxious|nervous|panic|racing thoughts|couldn't breathe)\b/i],
  ["peaceful", /\b(peaceful|calm|quiet|serene|stillness)\b/i],
  ["absurd", /\b(absurd|ridiculous|bizarre|strange thing happened|accidentally)\b/i],
  ["romantic", /\b(kiss|kissed|tender|in love|fell in love|fall in love|falling for|lover|romance|holding hands)\b/i],
  ["melancholic", /\b(sad|melanchol|hollow|ache|heartache|hated it|disappointed|disappointing)\b/i],
  ["chaotic", /\b(chaos|frantic|everywhere|too much|spinning|noise)\b/i],
  ["hopeful", /\b(hope|hopeful|maybe this time|looking forward)\b/i],
  ["generous", /\b(connect|connector|introduc\w*|kindness|\bkind\b|generos\w*|mentor\w*|advice|encourag\w*|vulnerab\w*|smile|smiled|give\b|giving|spread\w*|help(?:ed|ing)? (?:each other|others|people)|for everyone|change(?:s|d)? someone)\b/i],
  ["regretful", /\b(regret|wish I had|shouldn't have|if only)\b/i],
  ["funny", /\b(laugh|funny|hilarious|joke|ridiculous)\b/i],
];

/* ── TEMPORAL ──────────────────────────────────────────────────────── */
export const TEMPORAL_CUES: [string, RegExp][] = [
  ["dawn", /\b(dawn|sunrise|first light)\b/i],
  ["morning", /\b(morning)\b/i],
  ["afternoon", /\b(afternoon|noon)\b/i],
  ["dusk", /\b(dusk|sunset|golden hour)\b/i],
  ["night", /\b(night|midnight|2\s?a\.?m|4\s?a\.?m|2:13)\b/i],
  ["rainy_day", /\b(rain|monsoon|storm|drizzle)\b/i],
  ["summer", /\b(summer)\b/i],
  ["winter", /\b(winter|snow|cold)\b/i],
  ["nineties", /\b(90s|nineteen[- ]nineties)\b/i],
  ["childhood", /\b(childhood|as a kid|grandmother|grandmother's|grew up)\b/i],
  ["memory", /\b(memory|remember|remembered|recall)\b/i],
];

/* ── NARRATIVE ─────────────────────────────────────────────────────── */
export const NARRATIVE_CUES: [string, RegExp][] = [
  // a life-transition beat distinct from a plain "departure" (leaving a
  // person or a place): quitting work, dropping out, selling everything —
  // the kind of turn Module 4's own "quit my job and drove across
  // Rajasthan" example hinges on, which no existing cue here caught.
  ["transition", /\b(quit(?:ting)? my job|quit(?:ting)? (her|his|their) job|left my job|resigned|handed in my notice|gave notice|dropped out|sold everything|moved (away|abroad|across the country))\b/i],
  ["departure", /\b(left (him|her|them|home|without)|leaving (for good|forever)|departure|said goodbye|drove away)\b/i],
  ["arrival", /\b(arrived|arrival|landed|first time (in|at))\b/i],
  ["breakup", /\b(broke up|breakup|stopped fighting|ex-|no longer together)\b/i],
  ["transformation", /\b(changed|never the same|became|transformed)\b/i],
  ["failure", /\b(failed|failure|didn't work|fell apart|ruined)\b/i],
  ["discovery", /\b(discovered|found|realised|realized|noticed for the first time)\b/i],
  ["escape", /\b(escaped|got away|ran from|needed out)\b/i],
  ["reunion", /\b(reunion|saw (her|him|them) again|back together|found each other)\b/i],
  ["boredom", /\b(nothing to do|bored|absolutely nothing|uneventful)\b/i],
  ["absurdity", /\b(accidentally|somehow ended up|strangest thing|out of nowhere)\b/i],
  ["grief", /\b(grief|mourning|lost (him|her|them)|funeral)\b/i],
  ["celebration", /\b(celebrat|birthday|party|toast|cheered)\b/i],
];

export type SemanticStoryProfile = {
  place: Signal<string>[];
  objects: Signal<string>[];
  action: Signal<string>[];
  emotion: Signal<string>[];
  temporal: Signal<string>[];
  narrative: Signal<string>[];
  /** cheap length/shape signals used by the visual-narrative progression. */
  wordCount: number;
  sentenceCount: number;
};

export function extractStoryProfile(raw: string): SemanticStoryProfile {
  const text = raw || "";
  return {
    place: scoreAll(text, PLACE_CUES),
    objects: scoreAll(text, OBJECT_CUES),
    action: scoreAll(text, ACTION_CUES),
    emotion: scoreAll(text, EMOTION_CUES),
    temporal: scoreAll(text, TEMPORAL_CUES),
    narrative: scoreAll(text, NARRATIVE_CUES),
    wordCount: (text.match(/\S+/g) ?? []).length,
    sentenceCount: (text.match(/[.!?]+/g) ?? []).length || 1,
  };
}

/** top key, or a fallback when the story left no signal on this axis. */
export function top<K extends string>(signals: Signal<K>[], fallback: K): K {
  return signals[0]?.key ?? fallback;
}

/** every key that scored, in order — for callers that want more than one. */
export function ranked<K extends string>(signals: Signal<K>[]): K[] {
  return signals.map((s) => s.key);
}
