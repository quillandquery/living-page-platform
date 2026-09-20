"use client";

/**
 * GOOGLE ANALYTICS — a thin wrapper, same shape as lib/analytics/client.ts's
 * PostHog one: a single source of truth for the measurement id, and a
 * pageview helper that no-ops quietly when NEXT_PUBLIC_GA_MEASUREMENT_ID
 * isn't set (local dev and CI don't need a GA property to run).
 *
 * The base gtag.js loader + init call live in app/layout.tsx as next/script
 * tags (so they're not client-bundle code); this module only carries what a
 * client component needs afterwards — the id itself, and how to tell GA
 * about an App Router route change, which (like PostHog) doesn't fire a
 * native navigation event gtag.js can hook on its own.
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** Report a client-side route change. No-ops if GA isn't configured or
 *  gtag.js hasn't loaded yet. */
export function trackGaPageview(url: string) {
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("config", GA_MEASUREMENT_ID, { page_path: url });
}
