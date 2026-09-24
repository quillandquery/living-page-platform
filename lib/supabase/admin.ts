import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * THE SERVICE-ROLE CLIENT — bypasses Row Level Security entirely.
 *
 * Everything else in this app reads and writes AS the signed-in person, so
 * the database (not this code) is what keeps a draft private. This client
 * exists for the one situation that pattern can't cover: a claim link. The
 * person opening `/claim/<token>` has no session at all, and the moment
 * they finish signing up, the row still isn't theirs by any policy —
 * ownership transfer IS the privileged operation.
 *
 * Used only from lib/claim.ts, and only for the two calls that genuinely
 * need it (reading one row by an unguessable token before any session
 * exists, and moving `author_id` to the claimant). Never import this to
 * take a shortcut around RLS anywhere else.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — claim links need it (server-only; never expose it to the browser). Add it to .env.local / the deploy's env.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
