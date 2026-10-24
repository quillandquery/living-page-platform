import "server-only";

/**
 * STAGE 1 (Sonnet) — read · cast · palette · art-gate.  (docs/BRAIN-API.md, D11)
 *
 * One cheap Sonnet call reads the story's tone/mood/vibe, casts it to the style
 * that best expresses it, proposes a bespoke PALETTE (so even a preset world is
 * re-tinted to this story — custom for pennies, no Opus), and gates whether the
 * piece actually warrants Opus-generated artwork (Stage 4). Server-only; falls
 * back cleanly with no key.
 */

import { WORLDS } from "@/lib/living/worlds";
import { MEDIUMS } from "@/lib/living/cast";
import { callClaude, extractJson } from "@/lib/brain/router";

export type StoryRead = {
  tone: string[]; mood: string; vibe: string; form: string;
  intensity: number; one_line_read: string;
};
export type Palette = {
  scheme: "light" | "dark"; ground?: string; accent?: string; warm?: string;
  // the LLM also composes these from a CURATED kit, so the crafted engine renders
  // a bespoke world per story (not a fixed skin): which atmosphere layer breathes,
  // and which elegant silhouette anchors the horizon.
  ambient?: "stars" | "rain" | "fog" | "motes" | "none";
  silhouette?: "palms" | "city" | "pines" | "mountains" | "hills" | "dunes" | "none";
};
export type BrainCast = {
  read: StoryRead; style: string; rationale: string;
  palette?: Palette; artNeeded: boolean; artNote?: string;
};
export type BrainResult =
  | { ok: true; cast: BrainCast }
  | { ok: false; reason: "no-key" | "api-error" | "invalid"; detail?: string };

const SURFACES = [...Object.keys(WORLDS), ...MEDIUMS];

const SYSTEM = `You are the art director for Living Page. Read a short piece of personal writing for its TONE, MOOD and VIBE, cast it to the one visual style that best expresses THIS piece, propose a palette drawn from the story's own imagery, and judge whether it deserves bespoke generated artwork.

Hold the design language: restraint (mostly quiet, a few earned surprises, one grammar per page); MOTIVATED, never default (every choice traceable to the read — no black-by-default, no neon-by-default); readable always; premium, never clip-art.

STYLES (pick exactly one "style" key):
WORLDS (story set inside an evolving atmosphere; immersive, place/mood-driven):
 daylight(warm neutral reflective) · meadow(calm hopeful pastoral) · dawn-coast(sea/coast/dawn; hope, arrival) · ember-interior(cozy domestic tender) · paper(essayistic plain cerebral) · storm(turmoil, release) · twilight-street(city at night; solitude, lost-then-found) · noir-room(dread, fear, thriller) · dream(surreal weightless) · nocturne(night, stars, grief, awe)
MEDIUMS (the text BECOMES an artifact):
 postcard(one remembered place/person; wistful nostalgic longing) · evidence(investigation, obsession, unease) · maximalist(a loud reckoning/declaration; one word screams) · manuscript(the mundane made epic/sacred; dry wit)

COMPOSE THE WORLD — this is the heart of it. Read the story and design its OWN world from this curated kit; the crafted engine renders exactly what you specify, so each story looks bespoke yet always premium:
- palette.scheme: "dark" for night/storm/grief/dread/dream; "light" for warm/hopeful/reflective/day.
- palette.ground: the full-bleed background, a CSS gradient motivated by the story (deep indigo→amber dusk, cold grey storm, warm dawn, etc.). Rich, tonal, never flat black, never garish.
- palette.warm: a CSS radial-gradient for the horizon GLOW-BLOOM (the signature light), colour from the story's light source.
- palette.accent: a hex for the tinted key words.
- palette.ambient: ONE of stars | rain | fog | motes | none — the atmosphere that breathes (stars for night/awe, rain for storm/grief, fog for mystery/memory, motes for warm/quiet).
- palette.silhouette: ONE of palms | city | pines | mountains | hills | dunes | none — the elegant shape on the horizon that fits the setting (a coast → palms, a city night → city, a forest → pines, open country → hills, desert → dunes, nowhere specific → none).
Every choice traceable to the read. Only linear-gradient()/radial-gradient() and hex/rgb/rgba — no url(), no external anything.

Keep every read value SHORT — a word or short phrase, never a sentence (except one_line_read and rationale, each one sentence). Respond with ONLY this JSON, no prose, no markdown:
{"read":{"tone":["..."],"mood":"...","vibe":"...","form":"...","intensity":0.0,"one_line_read":"..."},"style":"<one key above>","rationale":"one sentence","palette":{"scheme":"light|dark","ground":"linear-gradient(180deg,#..,#..)","accent":"#..","warm":"radial-gradient(...)","ambient":"stars|rain|fog|motes|none","silhouette":"palms|city|pines|mountains|hills|dunes|none"},"art":{"needed":true|false,"note":"..."}}`;

/* ── sanitisers — a palette goes into an inline style, so keep it to safe CSS ── */
const SAFE_COLOR = /^#[0-9a-fA-F]{3,8}$|^rgba?\([\d.,\s%]+\)$/;
function safeColor(s: unknown): string | undefined {
  return typeof s === "string" && SAFE_COLOR.test(s.trim()) ? s.trim() : undefined;
}
function safeGradient(s: unknown): string | undefined {
  if (typeof s !== "string") return undefined;
  const v = s.trim();
  if (!/^(linear-gradient|radial-gradient)\(/.test(v)) return undefined;
  if (/url\(|;|@|\{|\}|<|>|expression|javascript:/i.test(v)) return undefined;   // no network / no break-out
  if (!/^[a-zA-Z0-9#%.,()\s-]+$/.test(v)) return undefined;
  return v.length <= 400 ? v : undefined;
}

function validate(o: unknown): BrainCast | null {
  if (!o || typeof o !== "object") return null;
  const x = o as Record<string, unknown>;
  // style degrades gracefully: an exact catalog key, else a fuzzy match, else
  // "auto" (the heuristic picks). Never reject the whole cast over the style.
  const raw = (typeof x.style === "string" ? x.style : "").trim();
  const low = raw.toLowerCase().replace(/^(world|medium):/, "");
  const style = SURFACES.includes(raw) ? raw
    : SURFACES.find((s) => s === low || s.startsWith(low) || low.startsWith(s)) ?? "auto";
  const r = (x.read ?? {}) as Record<string, unknown>;
  const read: StoryRead = {
    tone: Array.isArray(r.tone) ? (r.tone as unknown[]).map(String).slice(0, 3) : [],
    mood: typeof r.mood === "string" ? r.mood : "",
    vibe: typeof r.vibe === "string" ? r.vibe : "",
    form: typeof r.form === "string" ? r.form : "",
    intensity: typeof r.intensity === "number" ? Math.max(0, Math.min(1, r.intensity)) : 0.5,
    one_line_read: typeof r.one_line_read === "string" ? r.one_line_read : "",
  };
  const p = (x.palette ?? {}) as Record<string, unknown>;
  const AMB = ["stars", "rain", "fog", "motes", "none"];
  const SIL = ["palms", "city", "pines", "mountains", "hills", "dunes", "none"];
  const palette: Palette | undefined = p
    ? {
        scheme: p.scheme === "dark" ? "dark" : "light",
        ground: safeGradient(p.ground), accent: safeColor(p.accent), warm: safeGradient(p.warm),
        ambient: AMB.includes(p.ambient as string) ? (p.ambient as Palette["ambient"]) : undefined,
        silhouette: SIL.includes(p.silhouette as string) ? (p.silhouette as Palette["silhouette"]) : undefined,
      }
    : undefined;
  const art = (x.art ?? {}) as Record<string, unknown>;
  return {
    read, style,
    rationale: typeof x.rationale === "string" ? x.rationale : "",
    palette: palette && (palette.ground || palette.accent) ? palette : undefined,
    artNeeded: art.needed === true,
    artNote: typeof art.note === "string" ? art.note : undefined,
  };
}

export async function castWithAI(text: string, title?: string): Promise<BrainResult> {
  const user = `${title ? `Title: ${title}\n\n` : ""}Story:\n${text.slice(0, 6000)}`;
  const res = await callClaude("sonnet", SYSTEM, user, 2048);
  if (!res.ok) return res;
  if (!res.text.trim()) return { ok: false, reason: "invalid", detail: "empty response" };
  try {
    const cast = validate(extractJson(res.text));
    if (cast) return { ok: true, cast };
    return { ok: false, reason: "invalid", detail: "no object in reply" };
  } catch (e) {
    return { ok: false, reason: "invalid", detail: `parse failed (${res.text.length} chars): ${e instanceof Error ? e.message : ""}` };
  }
}
