import { createBrowserClient } from "@supabase/ssr";

/**
 * The browser Supabase client. Used by the few interactive pieces that talk
 * to auth directly — sign up, sign in, sign out. Everything that reads or
 * writes story data goes through server actions instead, so the anon key is
 * the only thing that ever reaches the browser.
 */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
