/**
 * THE WORLDS LIBRARY  (Decision D9)
 *
 * A world is the continuous, motivated environment a story is read inside. The
 * caster picks ONE per story (`lib/living/cast.ts`).
 *
 * LIGHT IS THE DEFAULT. Most worlds are light/warm; a world only goes dark when
 * the story earns it (a night, a storm, a thriller, a dream). Dark is never the
 * baseline — that matches the product's light/warm ethos (DESIGN-TOKENS) while
 * still letting reader output go dark when the world calls for it (D8/D9).
 *
 * Curated and closed (D6). Grow by adding rows, no new code paths. This replaces
 * the `Look` system and the legacy warm-grey reader for new stories.
 */

export type WorldKey =
  | "daylight" | "meadow" | "dawn-coast" | "paper" | "ember-interior"
  | "storm" | "twilight-street" | "noir-room" | "dream" | "nocturne";

export type World = {
  key: WorldKey;
  label: string;
  scheme: "light" | "dark";
  ground: string;
  accent: string;
  warm?: string;
  ambient?: "rain" | "stars" | "motes";
  sceneSvg?: string;
};

/* the London twilight street — a bespoke dark scene (night/evening streets) */
const TWILIGHT_STREET_SCENE = `
<svg viewBox="0 0 420 760" preserveAspectRatio="xMidYMid slice">
  <g opacity=".5" fill="#0e0c1e"><path d="M0 400 h80 v-22 h18 v22 h54 v-34 h16 v34 h74 v-18 h20 v18 h96 v-28 h16 v28 h60 V470 H0 Z"/></g>
  <radialGradient id="lg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#F2C878" stop-opacity=".6"/><stop offset="100%" stop-color="#F2C878" stop-opacity="0"/></radialGradient>
  <circle class="lampglow" cx="58" cy="402" r="96" fill="url(#lg)"/>
  <line x1="58" y1="402" x2="58" y2="600" stroke="#141225" stroke-width="6"/>
  <path d="M44 402 q14 -16 28 0 Z" fill="#171528"/><rect x="50" y="394" width="16" height="16" rx="2" fill="#F2C878" class="lampglow"/>
  <g>
    <rect x="306" y="372" width="86" height="214" rx="4" fill="#8f1a22"/><rect x="310" y="376" width="78" height="206" rx="3" fill="#B5202A"/>
    <rect x="306" y="358" width="86" height="16" rx="3" fill="#9a1c24"/><rect x="316" y="362" width="66" height="10" rx="2" fill="#E9B968"/>
    <text x="349" y="371" text-anchor="middle" font-family="Arial,sans-serif" font-size="6" font-weight="700" fill="#6b1016" letter-spacing=".8">TELEPHONE</text>
    <rect x="322" y="382" width="54" height="128" fill="#6b1016"/>
    <radialGradient id="wg" cx="50%" cy="68%" r="70%"><stop offset="0%" stop-color="#F6CE82" stop-opacity=".75"/><stop offset="100%" stop-color="#F6CE82" stop-opacity="0"/></radialGradient>
    <rect class="boothwarm" x="322" y="382" width="54" height="128" fill="url(#wg)"/>
    <g stroke="#7a1218" stroke-width="2"><line x1="322" y1="414" x2="376" y2="414"/><line x1="322" y1="446" x2="376" y2="446"/><line x1="322" y1="478" x2="376" y2="478"/><line x1="344" y1="382" x2="344" y2="510"/><line x1="360" y1="382" x2="360" y2="510"/></g>
    <rect x="322" y="510" width="54" height="72" fill="#8f1a22"/>
  </g>
  <defs>
    <pattern id="cob" width="28" height="16" patternUnits="userSpaceOnUse"><rect width="28" height="16" fill="#111019"/><ellipse cx="10" cy="8" rx="10" ry="6" fill="#191826"/><ellipse cx="8" cy="6" rx="5" ry="3" fill="#26263a" opacity=".7"/><ellipse cx="24" cy="14" rx="10" ry="6" fill="#191826"/><ellipse cx="22" cy="12" rx="5" ry="3" fill="#26263a" opacity=".7"/></pattern>
    <radialGradient id="sheen" cx="50%" cy="0%" r="90%"><stop offset="0%" stop-color="#8aa0b8" stop-opacity=".2"/><stop offset="100%" stop-color="#8aa0b8" stop-opacity="0"/></radialGradient>
  </defs>
  <path d="M0 578 H420 V760 H0 Z" fill="url(#cob)"/><path d="M0 578 H420 V760 H0 Z" fill="url(#sheen)"/>
  <g stroke="#aebccb" stroke-width="1"><line class="rainl" x1="40" y1="0" x2="34" y2="28"/><line class="rainl" x1="130" y1="-12" x2="124" y2="16"/><line class="rainl" x1="230" y1="-20" x2="224" y2="8"/><line class="rainl" x1="320" y1="-4" x2="314" y2="24"/><line class="rainl" x1="400" y1="-16" x2="394" y2="12"/><line class="rainl" x1="90" y1="-24" x2="84" y2="4"/></g>
  <g><circle class="emberlit" cx="160" cy="660" r="8" fill="#F2762E" opacity=".3"/><circle class="emberlit" cx="160" cy="660" r="3.4" fill="#F2762E"/><path class="smoke" d="M160 656 q-5 -10 0 -20 q5 -10 0 -20" fill="none" stroke="#9aa0ad" stroke-width="1.4" transform-origin="160px 656px"/></g>
</svg>`;

export const WORLDS: Record<WorldKey, World> = {
  /* ── LIGHT — the default family ──────────────────────────────────────── */
  "daylight": {   // the quiet, warm default — reflective / neutral prose
    key: "daylight", label: "daylight", scheme: "light",
    ground: "radial-gradient(130% 90% at 50% 0%, #FDF8EE 0%, #F4EAD6 55%, #EADCC2 100%)",
    accent: "#C2603A", warm: "radial-gradient(60% 40% at 50% 8%, rgba(255,214,150,.5), transparent 60%)",
    ambient: "motes",
  },
  "meadow": {     // calm / nature / hopeful
    key: "meadow", label: "meadow", scheme: "light",
    ground: "radial-gradient(130% 90% at 50% 0%, #F4F7EC 0%, #E4EED6 55%, #D2E0BE 100%)",
    accent: "#3E8E5A", warm: "radial-gradient(60% 40% at 50% 6%, rgba(220,235,180,.6), transparent 60%)",
    ambient: "motes",
  },
  "dawn-coast": { // sea / coast / sunrise / sunset — a LIGHT dawn
    key: "dawn-coast", label: "dawn coast", scheme: "light",
    ground: "linear-gradient(180deg,#dfe8f4 0%,#f3dcc2 58%,#f6c79c 100%)",
    accent: "#DE7A3C", warm: "radial-gradient(70% 45% at 50% 108%, rgba(255,186,120,.5), transparent 62%)",
    ambient: "motes",
  },
  "ember-interior": { // kitchen / home / tea — a warm, sunlit interior (light)
    key: "ember-interior", label: "warm interior", scheme: "light",
    ground: "radial-gradient(120% 90% at 50% 0%, #FBEFD9 0%, #F2DDBA 55%, #E6C79A 100%)",
    accent: "#B5632A", warm: "radial-gradient(60% 40% at 50% 6%, rgba(255,205,140,.55), transparent 60%)",
    ambient: "motes",
  },
  "storm": {      // rain / downpour — a bright overcast, not a black night
    key: "storm", label: "storm", scheme: "light",
    ground: "linear-gradient(180deg,#c6cfd9 0%,#aeb9c6 55%,#97a4b3 100%)",
    accent: "#2E5370", ambient: "rain",
  },
  "paper": {      // plain / essayistic
    key: "paper", label: "paper", scheme: "light",
    ground: "radial-gradient(120% 80% at 50% 0%, #FBF6EC, #F0E7D6)",
    accent: "#2B5BD0", ambient: "motes",
  },

  /* ── DARK — earned by the story, never the default ───────────────────── */
  "twilight-street": { // evening / night streets, a city at dusk
    key: "twilight-street", label: "twilight street", scheme: "dark",
    ground: "linear-gradient(180deg,#13112a 0%,#1a1636 42%,#241c38 72%,#2e2334 100%)",
    accent: "#F0A24A",
    warm: "radial-gradient(52% 40% at 16% 84%, rgba(242,196,122,.55), transparent 62%),radial-gradient(42% 34% at 84% 80%, rgba(200,60,56,.34), transparent 60%)",
    sceneSvg: TWILIGHT_STREET_SCENE,
  },
  "noir-room": {  // thriller / fear / night danger
    key: "noir-room", label: "noir", scheme: "dark",
    ground: "radial-gradient(90% 60% at 70% 18%, rgba(242,90,80,.1), transparent 55%),linear-gradient(180deg,#05070c,#0b1016 70%,#12171d 100%)",
    accent: "#E23A2E", warm: "radial-gradient(60% 40% at 50% 90%, rgba(226,58,46,.14), transparent 60%)",
    ambient: "rain",
  },
  "dream": {      // dream / surreal
    key: "dream", label: "dream", scheme: "dark",
    ground: "linear-gradient(180deg,#0c0a22,#241248 40%,#4a2270 72%,#7b3f9e 100%)",
    accent: "#CBA6FF", warm: "radial-gradient(70% 45% at 50% 110%, rgba(200,120,230,.4), transparent 62%)",
    ambient: "stars",
  },
  "nocturne": {   // night / stars / grief / the explicitly dark reflective
    key: "nocturne", label: "nocturne", scheme: "dark",
    ground: "linear-gradient(180deg,#0a0a1a,#12122e 45%,#1b1838 78%,#241f40 100%)",
    accent: "#B9A6E6", warm: "radial-gradient(60% 40% at 50% 108%, rgba(150,130,220,.25), transparent 60%)",
    ambient: "stars",
  },
};

export function getWorld(key: WorldKey): World {
  return WORLDS[key] ?? WORLDS.daylight;
}
