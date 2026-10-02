/**
 * THE SITE'S OWN ADDRESS.
 *
 * One canonical base URL, so `metadataBase`, canonical links, OG/Twitter
 * `url` fields and JSON-LD `url`/`mainEntityOfPage` all agree — instead of
 * five files each trimming `NEXT_PUBLIC_SITE_URL` slightly differently.
 * (app/[handle]/page.tsx had its own copy of this before this file existed;
 * it now imports from here.)
 */

const RAW = process.env.NEXT_PUBLIC_SITE_URL ?? "https://livingpage.one";

/** No trailing slash, so callers can always do `${SITE_URL}/whatever`. */
export const SITE_URL = RAW.replace(/\/+$/, "");

export const SITE_NAME = "Living Page";

/** The publisher mark stamped on every share artifact. This is BRAND,
 *  not address: it stays `livingpage.one` on a preview deploy and in
 *  local dev, where `SITE_URL` is correctly something else. Canonical
 *  URLs and share links still follow `SITE_URL`. */
export const BRAND_HOST = "livingpage.one";

/** `absoluteUrl("/@handle/slug")` → `https://…/@handle/slug`. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * THE ONE PLACE OWNER IDENTITY IS CONFIGURED (discoverability layer,
 * 2026-10). Every metadata/sitemap/JSON-LD/llms.txt builder in this codebase
 * is author-generic — it takes whatever row it's given and works for any
 * writer. This constant exists only for the two call sites that need to
 * single out a specific handle as a human decision, not platform logic:
 * `public/llms.txt`'s "whose stories to point an AI agent at first" section,
 * and `scripts/seo-audit.mjs`'s "which handle is this POC validating"
 * summary line. Nothing in the metadata/sitemap/JSON-LD pipeline itself
 * reads this — change it (or override via env for a staging deploy) without
 * touching how any author's own page or story is built. */
export const OWNER_HANDLE = process.env.NEXT_PUBLIC_OWNER_HANDLE ?? "reshikaa30";

let cachedBase: URL | null | undefined;

/** `metadataBase` for `app/layout.tsx` — `undefined` only if the env var is
 *  so malformed it isn't a URL at all, in which case Next falls back to
 *  inferring it from the request the way it already did before this file
 *  existed. */
export function metadataBaseUrl(): URL | undefined {
  if (cachedBase === undefined) {
    try { cachedBase = new URL(SITE_URL); } catch { cachedBase = null; }
  }
  return cachedBase ?? undefined;
}
