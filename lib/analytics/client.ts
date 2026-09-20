"use client";

/**
 * BROWSER-SIDE ANALYTICS — a thin, safe wrapper around posthog-js.
 *
 * Why a wrapper instead of calling posthog-js directly everywhere:
 *   - every call site stays typed against `lib/analytics/events.ts`, so a
 *     typo in an event name or a missing prop fails at compile time;
 *   - the whole thing is a no-op (never throws, never queues forever) when
 *     NEXT_PUBLIC_POSTHOG_KEY isn't set — local dev and CI don't need a
 *     PostHog project to run;
 *   - init happens exactly once, from `app/providers.tsx`, not from every
 *     component that wants to fire an event.
 *
 * This never touches the Auto engine's hot path (`lib/annotate.ts` /
 * `lib/art-direction`) — D1 (no network in the transform loop) is about the
 * *writing* experience, not about counting a publish afterwards. Analytics
 * calls here are fire-and-forget and never awaited by anything the writer
 * is waiting on.
 */

import posthog from "posthog-js";
import type { AnalyticsEventName, PropsFor } from "./events";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return; // no key configured — analytics silently disabled

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    // Living Page's story content (drafts, published text) must never reach
    // an analytics vendor — autocapture would otherwise scrape DOM text
    // from the editor and reader. Events fired below only ever carry ids,
    // enum-like labels and booleans; never raw story text.
    autocapture: false,
    capture_pageview: false, // app/providers.tsx fires pageviews itself (App Router has no route-change event to hook natively)
    person_profiles: "identified_only", // don't create a person for anonymous readers just from a pageview
  });
  initialized = true;
}

/** Fire a typed event. No-ops quietly if analytics was never initialized
 *  (no key configured) — every call site can be unconditional. */
export function track<N extends AnalyticsEventName>(name: N, props: PropsFor<N>) {
  if (!initialized) return;
  posthog.capture(name, props);
}

/** Call once a writer is known (e.g. after auth), so their events roll up
 *  under one person instead of a fresh anonymous id per browser. Only ever
 *  pass the internal profile/user id — never an email address. */
export function identify(userId: string) {
  if (!initialized) return;
  posthog.identify(userId);
}
