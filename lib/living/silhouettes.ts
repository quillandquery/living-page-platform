/**
 * CURATED HORIZON SILHOUETTES — the elegant dark shapes that anchor a world's
 * horizon (coast → palms, city night → skyline, forest → pines, …). Hand-drawn,
 * minimal, premium — never cartoon. The LLM composer (castWithAI) picks ONE key
 * per story; the crafted renderer (CoastStorm) drops it in. Add a shape here to
 * grow the kit — no renderer change (D6).
 *
 * Each is a full-bleed layer SVG that anchors to the bottom (xMidYMax slice).
 * `fill:currentColor` so the renderer tints them to the world's deep tone.
 */

export type SilhouetteKey = "palms" | "city" | "pines" | "mountains" | "hills" | "dunes" | "none";

const open = `<svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" style="color:#0e0a20">`;

const PALMS = `${open}<g fill="currentColor">
<path d="M150 600 C140 470 134 360 150 266 C154 250 166 250 172 268 C158 360 156 470 166 600 Z"/>
<path d="M162 268 C118 252 70 252 24 274 C70 262 116 266 162 282 Z M162 268 C120 230 72 214 26 214 C72 230 118 248 164 272 Z M162 268 C148 226 136 182 128 138 C142 184 156 228 168 268 Z M162 268 C206 252 254 252 300 274 C254 262 208 266 162 282 Z M162 268 C204 230 250 214 294 214 C250 230 208 248 162 272 Z M162 268 C176 226 190 184 206 142 C190 188 174 230 162 272 Z"/>
<path d="M1040 600 C1032 480 1026 380 1040 300 C1044 286 1054 286 1060 302 C1048 380 1046 480 1054 600 Z"/>
<path d="M1050 302 C1012 288 972 288 934 306 C972 296 1010 300 1050 314 M1050 302 C1016 270 978 256 940 256 C978 270 1014 286 1052 306 M1050 302 C1038 266 1028 230 1022 194 C1034 232 1046 268 1056 302 M1050 302 C1088 288 1128 288 1166 306 C1128 296 1092 300 1050 314 M1050 302 C1084 270 1122 256 1160 256 C1122 270 1086 286 1050 306"/>
</g></svg>`;

const CITY = `${open}<g fill="currentColor">
<path d="M0 600 V420 H70 V360 H96 V420 H150 V300 H176 V420 H250 V380 H300 V250 L324 232 L348 250 V420 H430 V340 H470 V420 H540 V280 H590 V420 H660 V360 H700 V420 H770 V230 H812 V210 H826 V230 H900 V320 H960 V420 H1040 V300 H1080 V420 H1140 V360 H1200 V600 Z"/>
</g>
<g fill="#ffcf7a" opacity=".5">
<rect x="20" y="450" width="10" height="14"/><rect x="48" y="450" width="10" height="14"/><rect x="110" y="330" width="9" height="12"/><rect x="210" y="330" width="11" height="13"/><rect x="470" y="310" width="11" height="15"/><rect x="620" y="300" width="11" height="15"/><rect x="930" y="350" width="10" height="13"/><rect x="1095" y="390" width="10" height="13"/><rect x="330" y="280" width="9" height="13"/>
</g></svg>`;

const PINES = `${open}<g fill="currentColor">
<path d="M90 600 L90 300 L50 360 L78 356 L40 420 L82 414 L50 470 L130 470 L98 414 L140 420 L102 356 L130 360 Z"/>
<path d="M320 600 L320 260 L286 320 L310 316 L276 380 L312 374 L286 430 L354 430 L328 374 L364 380 L330 316 L354 320 Z"/>
<path d="M980 600 L980 290 L944 350 L970 346 L934 412 L972 406 L944 462 L1016 462 L988 406 L1026 412 L990 346 L1016 350 Z"/>
<path d="M1120 600 L1120 330 L1092 380 L1112 377 L1084 430 L1116 425 L1092 470 L1148 470 L1124 425 L1156 430 L1128 377 L1148 380 Z"/>
<rect x="0" y="470" width="1200" height="130"/>
</g></svg>`;

const MOUNTAINS = `${open}
<path fill="currentColor" opacity=".55" d="M0 600 V430 L180 300 L360 420 L560 250 L760 410 L960 290 L1200 440 V600 Z"/>
<path fill="currentColor" d="M0 600 V500 L220 380 L430 500 L640 360 L880 500 L1080 400 L1200 490 V600 Z"/>
</svg>`;

const HILLS = `${open}
<path fill="currentColor" opacity=".55" d="M0 600 V500 Q300 440 600 490 T1200 480 V600 Z"/>
<path fill="currentColor" d="M0 600 V540 Q320 480 640 530 T1200 525 V600 Z"/>
</svg>`;

const DUNES = `${open}
<path fill="currentColor" opacity=".5" d="M0 600 V520 Q260 430 520 500 Q820 580 1200 470 V600 Z"/>
<path fill="currentColor" d="M0 600 V560 Q320 500 600 550 Q900 600 1200 540 V600 Z"/>
</svg>`;

export const SILHOUETTES: Record<Exclude<SilhouetteKey, "none">, string> = {
  palms: PALMS, city: CITY, pines: PINES, mountains: MOUNTAINS, hills: HILLS, dunes: DUNES,
};

/** Resolve a silhouette key to markup, "none", or undefined (renderer's default). */
export function resolveSilhouette(key: string | undefined): string | undefined {
  if (!key) return undefined;
  if (key === "none") return "none";
  return SILHOUETTES[key as Exclude<SilhouetteKey, "none">] ?? undefined;
}
