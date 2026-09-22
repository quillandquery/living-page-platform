/**
 * SATORI FONTS — the four brand families, vendored as real TTF bytes.
 *
 * `next/og`'s renderer (Satori) needs raw sfnt (ttf/otf) bytes handed to
 * it directly — it reads neither `next/font`, `@font-face`, nor woff2.
 * These faces are committed under `lib/share-fonts/` (static instances of
 * the Google families: Newsreader 400/500 + italic, Instrument Serif
 * 400 + italic, Caveat 700, Space Mono 400/700) and read straight off
 * disk, so the share frame never depends on a network fetch at render
 * time — the fragility that let earlier frames ship in a system serif.
 *
 * `next.config.mjs` traces `lib/share-fonts/**` into every route bundle
 * so the files exist in the serverless function. A `fetch` fallback
 * remains only as a belt-and-braces for any face that fails to read.
 */
import fs from "node:fs";
import path from "node:path";

export type SatoriFont = {
  name: string;
  data: ArrayBuffer | Buffer;
  weight: 400 | 500 | 600 | 700;
  style: "normal" | "italic";
};

type FontSpec = { name: string; weight: SatoriFont["weight"]; style: SatoriFont["style"]; file: string };

const FONT_DIR = path.join(process.cwd(), "lib", "share-fonts");

/** The four brand families (docs/DESIGN-TOKENS.md §3) — only the
 *  weights/styles the share frame actually sets. */
const SPECS: FontSpec[] = [
  { name: "Newsreader", weight: 400, style: "normal", file: "Newsreader-Regular.ttf" },
  { name: "Newsreader", weight: 400, style: "italic", file: "Newsreader-Italic.ttf" },
  { name: "Newsreader", weight: 500, style: "normal", file: "Newsreader-Medium.ttf" },
  { name: "Instrument Serif", weight: 400, style: "normal", file: "InstrumentSerif-Regular.ttf" },
  { name: "Instrument Serif", weight: 400, style: "italic", file: "InstrumentSerif-Italic.ttf" },
  { name: "Caveat", weight: 700, style: "normal", file: "Caveat-Bold.ttf" },
  { name: "Space Mono", weight: 400, style: "normal", file: "SpaceMono-Regular.ttf" },
  { name: "Space Mono", weight: 700, style: "normal", file: "SpaceMono-Bold.ttf" },
];

const FETCH_TIMEOUT_MS = 6000;
const LEGACY_UA =
  "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.34 (KHTML, like Gecko) BingPreview/1.0b";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("font fetch timeout")), ms)),
  ]);
}

/** Belt-and-braces: only used if the vendored file can't be read. */
async function fetchOne(spec: FontSpec): Promise<SatoriFont | null> {
  try {
    const family = encodeURIComponent(spec.name);
    const ital = spec.style === "italic" ? 1 : 0;
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family}:ital,wght@${ital},${spec.weight}&display=swap`;
    const cssRes = await withTimeout(fetch(cssUrl, { headers: { "User-Agent": LEGACY_UA } }), FETCH_TIMEOUT_MS);
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const fileUrl = /src:\s*url\(([^)]+)\)/.exec(css)?.[1];
    if (!fileUrl) return null;
    const fontRes = await withTimeout(fetch(fileUrl), FETCH_TIMEOUT_MS);
    if (!fontRes.ok) return null;
    return { name: spec.name, data: await fontRes.arrayBuffer(), weight: spec.weight, style: spec.style };
  } catch {
    return null;
  }
}

async function loadOne(spec: FontSpec): Promise<SatoriFont | null> {
  try {
    const data = fs.readFileSync(path.join(FONT_DIR, spec.file));
    return { name: spec.name, data, weight: spec.weight, style: spec.style };
  } catch {
    return fetchOne(spec);
  }
}

let cached: Promise<SatoriFont[]> | null = null;

export function loadShareFonts(): Promise<SatoriFont[]> {
  if (!cached) {
    cached = Promise.all(SPECS.map(loadOne)).then((fonts) => fonts.filter((f): f is SatoriFont => !!f));
  }
  return cached;
}

/** Which families actually loaded, so the frame can fall back per-family
 *  (serif/sans/mono) instead of an all-or-nothing flag. */
export function availableFamilies(fonts: SatoriFont[]): Set<string> {
  return new Set(fonts.map((f) => f.name));
}
