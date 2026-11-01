"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * "Continue with Google". One button for both sign-in and sign-up — Supabase
 * creates the account on first use. It starts the OAuth (PKCE) redirect; Google
 * sends the reader back to /auth/callback with a `code`, which the route trades
 * for a session.
 *
 * `next` is wherever they were headed before the wall (a same-site path). It
 * rides through the callback as `/onboarding?next=<dest>` — the same nesting
 * email sign-up uses — so a brand-new Google user picks a handle first and a
 * returning one is bounced straight on by onboarding.
 */
export function GoogleButton({ next = "", label = "Continue with Google" }: { next?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    const dest = next.startsWith("/") && !next.startsWith("//") ? next : "";
    const onboardingNext = `/onboarding${dest ? `?next=${encodeURIComponent(dest)}` : ""}`;

    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(onboardingNext)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    // On success the browser is already navigating to Google; only a failure
    // to start the redirect lands here.
    if (error) {
      setError("Couldn’t reach Google. Try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="google-btn" onClick={go} disabled={busy}>
        <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
        </svg>
        <span>{busy ? "…" : label}</span>
      </button>
      {error ? <p className="say say-bad">{error}</p> : null}
    </>
  );
}
