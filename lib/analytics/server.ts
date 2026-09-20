import "server-only";

/**
 * SERVER-SIDE ANALYTICS — for the core-loop events that must not depend on
 * a browser tab staying open.
 *
 * `createStoryAction` and `persist()` (app/write/actions.ts) end in a
 * `redirect()`, which unmounts the client before a client-side `track()`
 * call would reliably fire. Draft-created and published/unpublished are
 * captured here instead, from the server action itself, right after the
 * write that made them true.
 *
 * Same no-op-without-a-key contract as lib/analytics/client.ts: local dev
 * and CI run with no PostHog project configured.
 */

import { PostHog } from "posthog-node";
import type { AnalyticsEventName, PropsFor } from "./events";

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY; // same project as the client; server events roll up together
  if (!key) { client = null; return client; }
  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1, // a serverless function exits right after the response; batch of one so this event isn't dropped
    flushInterval: 0,
  });
  return client;
}

/**
 * Capture a server-side event. `distinctId` should be the writer's profile
 * id (never their email) so it joins up with their client-side activity.
 * Awaited by callers that redirect immediately after — it's a single
 * network call at `flushAt: 1`, not a wait on PostHog's own processing.
 */
export async function captureServer<N extends AnalyticsEventName>(
  name: N,
  distinctId: string,
  props: PropsFor<N>,
): Promise<void> {
  const ph = getClient();
  if (!ph) return;
  ph.capture({ distinctId, event: name, properties: props });
  await ph.flush();
}
