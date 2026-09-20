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
import { initAnalytics } from "@/lib/analytics/client";
import posthog from "posthog-js";

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

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => { initAnalytics(); }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </>
  );
}
