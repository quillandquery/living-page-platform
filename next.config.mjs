/** @type {import('next').NextConfig} */

/**
 * SECURITY HEADERS (SEO audit, Sept 2026). Previously the only header on
 * any response was Vercel's own default, partial HSTS — no CSP, no
 * X-Frame-Options, no X-Content-Type-Options, no Referrer-Policy. This is
 * a real, working baseline built from what the app actually loads in the
 * browser today (GA's gtag.js, PostHog's own API host, Supabase auth calls,
 * inline JSON-LD/style), not a copy-pasted strict template — see each
 * directive's comment for why it's there. `'unsafe-inline'` on script-src
 * and style-src is a deliberate, documented trade-off (the homepage's
 * inline `<style>` block and the app's inline JSON-LD both need it, and a
 * nonce-based CSP would need per-request middleware wiring); tightening
 * that further is a follow-up, not a blocker for shipping the rest of this
 * policy now.
 */
const CSP = [
  "default-src 'self'",
  // www.googletagmanager.com: GA's gtag.js loader (app/layout.tsx).
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  // The homepage's inline <style>{CSS}</style> block and React inline
  // `style={{...}}` props used throughout components/living/* all need
  // 'unsafe-inline' here too.
  "style-src 'self' 'unsafe-inline'",
  // Generated OG/icon images and (future) Supabase Storage avatar URLs are
  // both real, but not from one fixed host — kept broad rather than
  // guessing at a Supabase project host that varies per environment.
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  // GA + PostHog beacons, Supabase auth/data calls (NEXT_PUBLIC_SUPABASE_URL
  // is a per-project *.supabase.co host, not one fixed domain).
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://us.i.posthog.com https://*.supabase.co",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig = {
  // Stories are rows now, rendered at request time from their blocks, so the
  // app no longer compiles .mdx files and needs no MDX loader.

  // The share/OG image routes read vendored .ttf bytes off disk
  // (lib/share-fonts). Trace them into every route bundle so the files
  // exist in the serverless function at render time.
  outputFileTracingIncludes: {
    "/**": ["./lib/share-fonts/**"],
  },

  // Stop leaking "X-Powered-By: Next.js" on every response.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Vercel already sets a bare HSTS header; this replaces it with a
          // stronger one (includeSubDomains + preload).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
