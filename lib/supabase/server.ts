import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * The server-side Supabase client, bound to the request's cookies so it acts
 * AS the signed-in reader — Row Level Security in the database is what keeps a
 * draft private, not anything in this file. Every server component, route
 * handler and server action that touches data goes through here.
 *
 * Reading cookies is always allowed; writing them only works inside a Server
 * Action or Route Handler, so the set/remove calls are wrapped — a Server
 * Component that merely reads must not throw when Supabase tries to refresh.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet: CookieToSet[]) {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // called from a Server Component render — middleware refreshes the
            // session instead, so this is safe to swallow.
          }
        },
      },
    },
  );
}
