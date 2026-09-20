/**
 * THE SITE'S OWN ADDRESS.
 *
 * One canonical base URL, so `metadataBase`, canonical links, OG/Twitter
 * `url` fields and JSON-LD `url`/`mainEntityOfPage` all agree — instead of
 * five files each trimming `NEXT_PUBLIC_SITE_URL` slightly differently.
 * (app/[handle]/page.tsx had its own copy of this before this file existed;
 * it now imports from here.)
 */

const RAW = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** No trailing slash, so callers can always do `${SITE_URL}/whatever`. */
export const SITE_URL = RAW.replace(/\/+$/, "");

export const SITE_NAME = "Living Page";

/** `absoluteUrl("/@handle/slug")` → `https://…/@handle/slug`. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

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
