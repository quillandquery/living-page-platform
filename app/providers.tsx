"use client";

/**
 * ROOT PROVIDERS — currently just analytics init + pageview tracking.
 *
 * App Router doesn't fire a native "route changed" event the way the Pages
 * Router's `next/router` did, so a manual pageview capture on
 * pathname/searchParams change is the standard PostHog-with-App-Router
 * pattern. `useSearchParams()` requires a Suspense boundary in the App
 * Router or the page opts out of static rendering — the inner component
 * exists only to carry that boundary.
 */

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initAnalytics, identify } from "@/lib/analytics/client";
import { trackGaPageview } from "@/lib/analytics/ga";
import { supabaseBrowser } from "@/lib/supabase/client";
import posthog from "posthog-js";

// Runs once, at module import time — not inside an effect. React runs a
// child's effects (PostHogIdentify below) before its parent's, so an
// `initAnalytics()` call in Providers' own useEffect would still be
// pending the first time PostHogIdentify tries to `identify()`, making
// that call silently no-op. Module-scope init runs before anything
// mounts. `initAnalytics()` itself is idempotent and a no-op during SSR
// (`typeof window === "undefined"`), so this is safe to run unconditionally
// on both server and client bundles.
initAnalytics();

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const url = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    // posthog-js's own $pageview, not a custom AnalyticsEvent — this is
    // infrastructure (which URL), not one of the curated activity events.
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

/**
 * IDENTITY — links a browser's anonymous PostHog history to the real
 * Supabase user once we know who they are.
 *
 * Without this, every event fired before this component ever ran
 * (`make_mode_selected`, `story_viewed`, etc.) is attached to a random
 * anonymous id PostHog invents per browser — it never learns that browser
 * belongs to a real writer, so the same person's activity across sessions
 * or devices never rolls up into one Person, and their server-side events
 * (captureServer, keyed by `profile.id` in app/write/actions.ts) end up as
 * a *different* Person than their client-side ones.
 *
 * `profiles.id` IS the Supabase auth user id (lib/db.ts's myProfile() looks
 * it up by `.eq("id", user.id)`), so `identify(user.id)` here lines up
 * exactly with the id server actions already use — one Person, not two.
 *
 * PostHog merges this browser's prior anonymous events into the identified
 * Person automatically the first time `identify` runs for it. `posthog.
 * reset()` on sign-out starts a fresh anonymous id for whoever uses the
 * browser next, so a shared/public machine doesn't attribute the next
 * person's clicks to the previous writer.
 */
function PostHogIdentify() {
  useEffect(() => {
    const supabase = supabaseBrowser();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) identify(user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) identify(session.user.id);
      if (event === "SIGNED_OUT") posthog.reset();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}

/* Same reasoning as PostHogPageview: gtag.js's own `gtag('config', ...)`
   call (app/layout.tsx) only ever fires once, on the first script load, so
   an App Router client-side navigation needs its own pageview reported by
   hand. trackGaPageview() is a silent no-op when GA isn't configured. */
function GaPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const url = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    trackGaPageview(url);
  }, [pathname, searchParams]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PostHogIdentify />
      <Suspense fallback={null}>
        <PostHogPageview />
        <GaPageview />
      </Suspense>
      {children}
    </>
  );
}
