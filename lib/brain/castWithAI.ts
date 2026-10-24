import "server-only";

/**
 * STAGE 1 (Sonnet) — read the story · compose a LIVING EXPERIENCE.  (D11)
 *
 * The composer reads the whole piece and designs a complete, renderable *living
 * reading experience* per `docs/EXPERIENCE-BRIEF.md`: a composed environment (sky
 * + glow + silhouette), an ambient that breathes, drifting objects, a material
 * medium, and a per-paragraph typographic direction. It returns a STRUCTURED SPEC
 * (never HTML/CSS), which `components/living/LivingExperience.tsx` executes — so
 * every story becomes its own world, not the same coast re-tinted.
 *
 * The author's prose is never returned or rewritten: `scenes[i]` directs the i-th
 * paragraph (how it performs + which of its words to emphasise). Local models /
 * one cheap Sonnet call, server-only, falls back cleanly with no key.
 */

import { WORLDS } from "@/lib/living/worlds";
import { MEDIUMS } from "@/lib/living/cast";
import { callClaude, extractJson } from "@/lib/brain/router";
import {
  sanitizeExperience, safeColor, safeGradient,
  type ExperienceSpec,
} from "@/lib/living/experience";

export type StoryRead = {
  tone: string[]; mood: string; vibe: string; form: string;
  intensity: number; one_line_read: string;
};
/** Back-compat tint derived from the experience, for the heuristic fallback path. */
export type Palette = {
  scheme: "light" | "dark"; ground?: string; accent?: string; warm?: string;
  ambient?: "stars" | "rain" | "fog" | "motes" | "none";
  silhouette?: "palms" | "city" | "pines" | "mountains" | "hills" | "dunes" | "none";
};
export type BrainCast = {
  read: StoryRead; style: string; rationale: string;
  experience?: ExperienceSpec;
  palette?: Palette; artNeeded: boolean; artNote?: string;
};
export type BrainResult =
  | { ok: true; cast: BrainCast }
  | { ok: false; reason: "no-key" | "api-error" | "invalid"; detail?: string };

const SURFACES = [...Object.keys(WORLDS), ...MEDIUMS];

const SYSTEM = `You are the creative director, motion designer and reading-experience designer for Living Page. You turn a piece of prose into an IMMERSIVE, ANIMATED reading experience — a moving environment, objects with presence, expressive typography and a sense of entering a world — returned as a STRUCTURED SPEC the engine renders. You never return HTML, CSS or the prose itself.

THE PRINCIPLE: read the whole story first; discover the world it calls for second; design the experience third. Never start from a theme. Don't pick a beach because water is mentioned or Paris because love is — interpret the ACTUAL story (its events, place, emotional arc, what changes, what the reader should feel) and invent the most fitting world. Two different stories must produce two different worlds. Ask yourself: "could this same design have been generated for almost any other story?" — if yes, it has failed.

Compose from this curated kit (closed vocab — use only these values):
- medium: "world" (an immersive place/atmosphere) · "water" (underwater: depth, caustics, bubbles, drifting text) · "paper" (a handwritten letter/diary on a desk — ink appears as if written) · "film" (letterboxed, projected, grainy). Most stories are "world". Choose the material the story is MADE of.
- scheme: "dark" reads cinematic and is usually right; "light" only for a genuinely bright/airy/hopeful piece (still give it a glow + silhouette so it stays immersive).
- sky: a rich tonal CSS gradient with real range, motivated by the story (indigo→plum→amber dusk; teal→navy depths; storm greys→slate; dawn rose→gold). linear-gradient()/radial-gradient() only. Never flat black, never one muddy tone.
- sky2 (optional): a second gradient the world cross-fades TO as the reader scrolls — use it when the story moves through time or mood (night→dawn, calm→storm). Same gradient rules.
- glow: a GENEROUS CSS radial-gradient bloom — the signature light, the emotional centre. Place it where the light would be (a low horizon bloom, a shaft from above underwater).
- accent: a hex for emphasised words, drawn from the glow.
- ink (optional): hex reading colour; must be comfortably readable on the sky.
- silhouette: ONE of palms | city | pines | mountains | hills | dunes that fits the setting, or "none" for a placeless/interior/underwater piece.
- ambient: ONE of stars | rain | fog | motes | snow | bubbles | petals | embers | none — the thing in the air that breathes with the mood (stars for night/awe, rain for grief/storm, fog for memory, motes for warm quiet, bubbles for water, snow/petals/embers when the story literally calls for them). Avoid "none" unless stillness is the point.
- caustic: true only for underwater light. lightning: true only for a storm with a strike.
- objects: 0–4 small symbolic emoji that have a NARRATIVE reason to be there (a moon 🌙, a drifting fish 🐟, a pressed flower 🌼, a pen ✒️). Each: {emoji, x(0–100 vw), y(0–100 vh), size(12–80 px), drift:"floaty"|"sway"|"rise", depth(0–1 parallax), opacity(0.1–1)}. Emoji ONLY (no letters). Use sparingly; empty is fine.
- scenes: an array of per-paragraph directions, ONE per paragraph of the story IN ORDER (the story's paragraphs are separated by blank lines; a count is given below). Each: {behavior, emphasis:[words]}. behavior ∈ unveil (default: words rise in on arrival) · float (gently bob — dreamy/weightless) · fade (blur in slowly — memory) · drift (italic, slide in — an aside/reflection) · tremor (shaking — fear/shock/a shout) · write (appears word-by-word with an ink caret — ONLY for medium "paper"). emphasis = 0–3 of THAT paragraph's own words to tint with the accent (emotionally loaded words; never function words). Most paragraphs are "unveil" — reserve the expressive behaviours for the moments that earn them (contrast matters). NEVER include the paragraph's text, only its direction.

Preserve the writing: the engine renders the author's prose verbatim; you only direct it. Keep reading comfortable — don't make every paragraph shout.

Respond with ONLY this JSON, no prose, no markdown:
{"read":{"tone":["..."],"mood":"...","vibe":"...","form":"...","intensity":0.0,"one_line_read":"..."},"style":"<world or medium key>","rationale":"one sentence on the world you chose and why","experience":{"concept":"one sentence thesis","medium":"...","scheme":"dark|light","sky":"linear-gradient(...)","sky2":"linear-gradient(...)","glow":"radial-gradient(...)","accent":"#..","ink":"#..","silhouette":"...","ambient":"...","caustic":false,"lightning":false,"objects":[{"emoji":"🌙","x":78,"y":14,"size":40,"drift":"floaty","depth":0.12,"opacity":0.9}],"scenes":[{"behavior":"unveil","emphasis":["word"]}]},"art":{"needed":false,"note":""}}`;

function validate(o: unknown): BrainCast | null {
  if (!o || typeof o !== "object") return null;
  const x = o as Record<string, unknown>;
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
  const experience = sanitizeExperience(x.experience) ?? undefined;
  // derive the back-compat palette (so the heuristic fallback path stays tinted)
  const palette: Palette | undefined = experience
    ? {
        scheme: experience.scheme,
        ground: safeGradient(experience.sky),
        accent: safeColor(experience.accent),
        warm: safeGradient(experience.glow),
        ambient: (["stars", "rain", "fog", "motes"] as const).includes(experience.ambient as never)
          ? (experience.ambient as Palette["ambient"]) : undefined,
        silhouette: experience.silhouette as Palette["silhouette"],
      }
    : undefined;
  const art = (x.art ?? {}) as Record<string, unknown>;
  return {
    read, style, experience, palette,
    rationale: typeof x.rationale === "string" ? x.rationale : "",
    artNeeded: art.needed === true,
    artNote: typeof art.note === "string" ? art.note : undefined,
  };
}

export async function castWithAI(text: string, title?: string): Promise<BrainResult> {
  const body = text.slice(0, 6000);
  const nParas = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).length;
  const user =
    `${title ? `Title: ${title}\n\n` : ""}The story has ${nParas} paragraph(s) (separated by blank lines). ` +
    `Return exactly ${nParas} scene direction(s), in order.\n\nStory:\n${body}`;
  const res = await callClaude("sonnet", SYSTEM, user, 3000);
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
