/**
 * HERO SUBJECT — the illustration that carries the story.
 *
 * Not a margin doodle answering one line: the ONE big drawing behind the
 * whole page, tied to what the story is about. Like atlasofskills.com/diving,
 * where choosing "whale shark" sends a translucent whale shark swimming
 * behind everything. Two behaviours:
 *   • drift — a creature/vehicle swims or moves across the page (a whale shark)
 *   • draw  — a landmark/structure sketches itself in as the reader scrolls,
 *             stroke by stroke, bound to --depth (the Eiffel Tower building up)
 *   • rise  — a quiet subject floats gently up
 *
 * Deterministic, no LLM (D1): the subject is read from the story's own words
 * (a wider hero lexicon than the small margin-OBJECT set) and its mode from
 * what kind of thing it is.
 */
import type { SemanticStoryProfile } from "../semantic-profile";
import type { SubjectDirection, SubjectMode } from "./types";
import { DOODLES } from "@/components/doodles/registry";

/** hero words → a big drawable. Broader than OBJECT_CUES: landmarks, creatures. */
const SUBJECT_CUES: [string, RegExp][] = [
  ["whaleshark", /\b(whale shark|whaleshark|whale|leviathan|something enormous)\b/i],
  ["orca", /\b(orca|killer whale)\b/i],
  ["manta", /\b(manta|ray|stingray|devil ray)\b/i],
  ["turtle", /\b(turtle|tortoise)\b/i],
  ["dolphin", /\b(dolphin|porpoise)\b/i],
  ["jellyfish", /\b(jellyfish|jelly)\b/i],
  ["fish", /\b(fish|reef|shoal|school of|coral)\b/i],
  ["boat", /\b(boat|ship|sail|ferry|yacht)\b/i],
  ["eiffel", /\b(eiffel|tour eiffel)\b/i],
  ["skyline", /\b(skyline|manhattan|rooftops|downtown|the city at)\b/i],
  ["tower", /\b(tower|minaret|spire|lighthouse|clock tower|cathedral)\b/i],
  ["mountain", /\b(mountain|peak|summit|ridge|himalaya|everest|alps)\b/i],
  ["palm", /\b(palm|coconut|palm tree)\b/i],
  ["dragon", /\b(dragon)\b/i],
  ["train", /\b(train|railway|locomotive|the express)\b/i],
  ["bird", /\b(bird|gull|kite|flock|migrat)\b/i],
  ["balloon", /\b(hot air balloon|balloon)\b/i],
  ["moon", /\b(moon|lunar|crescent)\b/i],
  ["star", /\b(galaxy|constellation|the stars|milky way)\b/i],
  ["tree", /\b(oak|banyan|the tree|old tree|forest)\b/i],
];

/** landmarks/structures build themselves up as the reader descends */
const DRAW = new Set(["eiffel", "skyline", "tower", "mountain", "palm", "tree", "door", "window", "chandelier"]);
/** creatures and vehicles move across the page */
const DRIFT = new Set([
  "whaleshark", "orca", "manta", "turtle", "dolphin", "fish", "jellyfish", "boat",
  "bird", "flock", "train", "bus", "car", "scooter", "dragon", "dancer", "balloon",
]);

function modeFor(doodle: string, bias: SubjectMode): SubjectMode {
  if (DRAW.has(doodle)) return "draw";
  if (DRIFT.has(doodle)) return "drift";
  return bias;
}

const safe = (name: string) => (DOODLES[name] ? name : null);

/**
 * Pick the hero. First a strong hero-word, else the story's strongest named
 * object, else the environment's fallback — so a page nearly always has a
 * subject carrying it, but a truly bare, still piece can come back null
 * (stillness is a valid choice, §13).
 */
export function pickSubject(
  raw: string,
  profile: SemanticStoryProfile,
  bias: SubjectMode,
  seed: number,
  scheme: "light" | "dark",
  fallbackDoodle?: string,
): SubjectDirection | null {
  const text = (raw || "").toLowerCase();

  let doodle: string | null = null;
  let reason = "";
  for (const [key, re] of SUBJECT_CUES) {
    if (re.test(text)) { doodle = safe(key); reason = `the story's ${key} carries it behind the words`; break; }
  }
  if (!doodle && profile.objects[0]) {
    doodle = safe(profile.objects[0].key);
    if (doodle) reason = `${doodle} is the story's strongest image, drawn large behind the page`;
  }
  if (!doodle && fallbackDoodle) {
    doodle = safe(fallbackDoodle);
    if (doodle) reason = `${doodle} anchors the page as its quiet hero`;
  }
  if (!doodle) return null;

  const mode = modeFor(doodle, bias);
  // dark worlds carry a brighter translucent hero than light ones
  const dark = scheme === "dark";
  const baseOpacity: Record<SubjectMode, number> = {
    drift: dark ? 0.20 : 0.12,
    draw: dark ? 0.30 : 0.20,
    rise: dark ? 0.16 : 0.10,
  };
  const baseScale: Record<SubjectMode, number> = { drift: 1.15, draw: 1.0, rise: 0.9 };
  return { doodle, mode, opacity: baseOpacity[mode], scale: baseScale[mode], reason };
}
