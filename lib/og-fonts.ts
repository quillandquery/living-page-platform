/**
 * SATORI FONTS — the four brand families, fetched as real TTF bytes.
 *
 * `next/og`'s renderer (Satori) doesn't read `next/font`, `@font-face`, or
 * woff2 — it needs raw sfnt (ttf/otf) bytes hantded to it directly. The
 * reliable way to get those for an arbitrary Google Font weight/style,
 * without guessing at file paths, is Google's own CSS endpoint: ask with
 * an old-WebKit user agent (the only one Google Fonts still serves bare
 * `.ttf` to — everyone else gets woff2) and follow the `src: url(...)` it
 * returns. This is the same technique used throughout the Satori/@vercel/og
 * ecosystem, and it always matches what's actually live on Google Fonts —
 * no vendored font files, no pinned GitHub paths to go stale.
 *
 * Every family/weight/style is fetched independently and time-boxed: one
 * the network can't reach just falls out of the array, and the frame
 * renders with the platform's own serif/sans/mono rather than failing
 * the whole route. `loadShareFonts()` is memoised per server instance.
 */
export type SatoriFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700;
  style: "normal" | "italic";
};

type FontSpec = { name: string; weight: SatoriFont["weight"]; style: SatoriFont["style"] };

/** The four brand families (docs/DESIGN-TOKENS.md §3) — only the
 *  weights/styles the share frame actually sets. */
const SPECS: FontSpec[] = [
  { name: "Newsreader", weight: 400, style: "normal" },
  { name: "Newsreader", weight: 400, style: "italic" },
  { name: "Newsreader", weight: 500, style: "normal" },
  { name: "Instrument Serif", weight: 400, style: "normal" },
  { name: "Instrument Serif", weight: 400, style: "italic" },
  { name: "Caveat", weight: 700, style: "normal" },
  { name: "Space Mono", weight: 400, style: "normal" },
  { name: "Space Mono", weight: 700, style: "normal" },
];

const FETCH_TIMEOUT_MS = 6000;
// Old enough that Google's CSS endpoint still serves plain .ttf instead
// of woff2 — the one behaviour this whole approach leans on.
const LEGACY_UA =
  "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.34 (KHTML, like Gecko) BingPreview/1.0b";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("font fetch timeout")), ms)),
  ]);
}

async function fetchOne(spec: FontSpec): Promise<SatoriFont | null> {
  try {
    const family = encodeURIComponent(spec.name);
    const ital = spec.style === "italic" ? 1 : 0;
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:ital,wght@${ital},${spec.weight}&display=swap`;
    const cssRes = await withTimeout(fetch(cssUrl, { headers: { "User-Agent": LEGACY_UA } }), FETCH_TIMEOUT_MS);
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = /src:\s*url\(([^)]+)\)/.exec(css);
    const fileUrl = match?.[1];
    if (!fileUrl) return null;
    const fontRes = await withTimeout(fetch(fileUrl), FETCH_TIMEOUT_MS);
    if (!fontRes.ok) return null;
    const data = await fontRes.arrayBuffer();
    return { name: spec.name, data, weight: spec.weight, style: spec.style };
  } catch {
    return null;
  }
}

let cached: Promise<SatoriFont[]> | null = null;

export function loadShareFonts(): Promise<SatoriFont[]> {
  if (!cached) {
    cached = Promise.all(SPECS.map(fetchOne)).then((fonts) => fonts.filter((f): f is SatoriFont => !!f));
  }
  return cached;
}

/** Which families actually loaded, so the frame can fall back per-family
 *  (serif/sans/mono) instead of an all-or-nothing `hasSerif` flag. */
export function availableFamilies(fonts: SatoriFont[]): Set<string> {
  return new Set(fonts.map((f) => f.name));
}
