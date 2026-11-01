import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Same-site path(+query) only — never let `next` send anyone off this domain. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/onboarding";
}

/**
 * Where an auth round-trip lands: a confirmation email, or Google (OAuth/PKCE).
 * Supabase sends the reader here with a `code`; we trade it for a session
 * (which sets the cookies) and send them on — by default to onboarding, which
 * asks new writers for a handle and forwards returning ones to their page.
 * If the provider refused (they cancelled on Google's screen, say) it comes
 * back with `error` instead, and we return them to login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const failed = searchParams.get("error") ? "oauth" : "confirm";

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Behind a proxy/CDN the request's own origin can be internal; trust the
      // forwarded host in production so the redirect stays on the public site.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const base = process.env.NODE_ENV !== "development" && forwardedHost ? `https://${forwardedHost}` : origin;
      return NextResponse.redirect(`${base}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=${failed}`);
}
