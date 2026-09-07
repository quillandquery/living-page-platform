import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Session refresh. Supabase access tokens are short-lived; without a refresh
 * on the way through, a signed-in reader would silently become anonymous
 * between page loads. This runs in middleware on every request, hands the
 * refreshed cookies to both the request (so the page that renders next sees
 * them) and the response (so the browser keeps them), and gates the two
 * routes that require a session.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet: CookieToSet[]) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // IMPORTANT: getUser() must be called to trigger the refresh. Do not put
  // logic between createServerClient and here.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const protectedRoute = path.startsWith("/write") || path.startsWith("/settings") || path === "/onboarding";

  if (!user && protectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
