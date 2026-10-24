/**
 * THE EXPERIENCE SPEC  (docs/EXPERIENCE-BRIEF.md)
 *
 * The structured output the Stage-1 composer (`lib/brain/castWithAI.ts`) returns
 * after reading a story: a complete, renderable *living reading experience* — a
 * composed environment, an ambient that breathes, drifting objects, a material
 * medium, and a per-paragraph typographic direction — NOT raw HTML/CSS. The
 * renderer (`components/living/LivingExperience.tsx`) executes it.
 *
 * The scene directives are POSITIONAL: `scenes[i]` directs the i-th paragraph of
 * the author's own prose (behaviour + which words to emphasise). The spec never
 * carries the prose itself, so the author's text is preserved exactly (brief §8)
 * and the LLM only directs how it performs.
 *
 * Everything here goes into an inline style or textContent, so every field is
 * sanitised to a closed, safe set — a hostile model can't inject CSS or markup.
 */

export type ExpBehavior = "unveil" | "float" | "fade" | "drift" | "tremor" | "write";
export type ExpMedium = "world" | "paper" | "water" | "film";
export type ExpAmbient =
  | "stars" | "rain" | "fog" | "motes" | "snow" | "bubbles" | "petals" | "embers" | "none";
export type ExpSilhouette =
  | "palms" | "city" | "pines" | "mountains" | "hills" | "dunes" | "none";
export type ExpDrift = "floaty" | "sway" | "rise";

export type ExpObject = {
  emoji: string; x: number; y: number; size: number;
  drift: ExpDrift; depth: number; opacity: number;
};
export type SceneDirective = { behavior: ExpBehavior; emphasis: string[] };

export type ExperienceSpec = {
  concept?: string;
  medium: ExpMedium;
  scheme: "light" | "dark";
  sky: string;            // base CSS gradient
  sky2?: string;          // gradient to cross-fade to as the reader scrolls
  glow?: string;          // CSS radial-gradient bloom
  accent: string;         // hex/rgb for emphasised words
  ink?: string;           // hex/rgb reading colour
  silhouette?: ExpSilhouette;
  silInk?: string;        // tint for the silhouette
  ambient?: ExpAmbient;
  caustic?: boolean;      // underwater light shafts
  lightning?: boolean;    // periodic flash
  vignette?: string;      // inner shadow colour
  objects?: ExpObject[];
  scenes?: SceneDirective[];
};

/* ── sanitisers: a spec feeds inline styles, so keep every field to safe CSS ── */
const SAFE_COLOR = /^#[0-9a-fA-F]{3,8}$|^rgba?\([\d.,\s%]+\)$/;
export function safeColor(s: unknown): string | undefined {
  return typeof s === "string" && SAFE_COLOR.test(s.trim()) ? s.trim() : undefined;
}
export function safeGradient(s: unknown): string | undefined {
  if (typeof s !== "string") return undefined;
  // allow one OR MORE comma-separated gradient functions (the glow often layers two)
  const v = s.trim();
  if (!/^(linear-gradient|radial-gradient|conic-gradient)\(/.test(v)) return undefined;
  if (/url\(|;|@|\{|\}|<|>|expression|javascript:/i.test(v)) return undefined;
  if (!/^[a-zA-Z0-9#%.,()\s-]+$/.test(v)) return undefined;
  return v.length <= 600 ? v : undefined;
}
const num = (v: unknown, lo: number, hi: number, dflt: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};
const inSet = <T extends string>(v: unknown, set: readonly T[], dflt: T): T =>
  (typeof v === "string" && (set as readonly string[]).includes(v)) ? (v as T) : dflt;
const inSetOpt = <T extends string>(v: unknown, set: readonly T[]): T | undefined =>
  (typeof v === "string" && (set as readonly string[]).includes(v)) ? (v as T) : undefined;

const MEDIUMS = ["world", "paper", "water", "film"] as const;
const AMBIENTS = ["stars", "rain", "fog", "motes", "snow", "bubbles", "petals", "embers", "none"] as const;
const SILS = ["palms", "city", "pines", "mountains", "hills", "dunes", "none"] as const;
const BEHAVIORS = ["unveil", "float", "fade", "drift", "tremor", "write"] as const;
const DRIFTS = ["floaty", "sway", "rise"] as const;

/** Keep an "emoji" to a short run of symbol/pictograph characters — no markup. */
function safeEmoji(s: unknown): string | undefined {
  if (typeof s !== "string") return undefined;
  const v = Array.from(s.trim()).slice(0, 3).join("");
  if (!v) return undefined;
  if (/[<>&a-zA-Z0-9]/.test(v)) return undefined; // not letters/markup — just symbols
  return v;
}

export function sanitizeExperience(raw: unknown): ExperienceSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const sky = safeGradient(x.sky);
  const accent = safeColor(x.accent);
  if (!sky || !accent) return null; // the two load-bearing fields

  const objects = Array.isArray(x.objects)
    ? x.objects
        .map((o): ExpObject | null => {
          const oo = (o ?? {}) as Record<string, unknown>;
          const emoji = safeEmoji(oo.emoji);
          if (!emoji) return null;
          return {
            emoji,
            x: num(oo.x, 0, 100, 50), y: num(oo.y, 0, 100, 40),
            size: num(oo.size, 12, 80, 36),
            drift: inSet(oo.drift, DRIFTS, "floaty"),
            depth: num(oo.depth, 0, 1, 0.3),
            opacity: num(oo.opacity, 0.1, 1, 0.9),
          };
        })
        .filter((o): o is ExpObject => !!o)
        .slice(0, 6)
    : undefined;

  const scenes = Array.isArray(x.scenes)
    ? x.scenes
        .map((s): SceneDirective => {
          const ss = (s ?? {}) as Record<string, unknown>;
          return {
            behavior: inSet(ss.behavior, BEHAVIORS, "unveil"),
            emphasis: Array.isArray(ss.emphasis)
              ? ss.emphasis.map(String).map((w) => w.slice(0, 40)).slice(0, 4)
              : [],
          };
        })
        .slice(0, 60)
    : undefined;

  return {
    concept: typeof x.concept === "string" ? x.concept.slice(0, 240) : undefined,
    medium: inSet(x.medium, MEDIUMS, "world"),
    scheme: x.scheme === "light" ? "light" : "dark",
    sky,
    sky2: safeGradient(x.sky2),
    glow: safeGradient(x.glow),
    accent,
    ink: safeColor(x.ink),
    silhouette: inSetOpt(x.silhouette, SILS),
    silInk: safeColor(x.silInk),
    ambient: inSetOpt(x.ambient, AMBIENTS),
    caustic: x.caustic === true,
    lightning: x.lightning === true,
    vignette: safeColor(x.vignette),
    objects,
    scenes,
  };
}
