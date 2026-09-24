import { NextResponse, type NextRequest } from "next/server";
import { myProfile, currentUser } from "@/lib/db";
import { finalizeClaim } from "@/lib/claim";

/**
 * Where signup/login sends someone back once they have an account. Not a
 * page — there's nothing to look at, only a decision to make and a
 * redirect. Every branch is idempotent-safe: landing here twice (a
 * double-click, a browser back button) either re-sends them through the
 * same gate or hits finalizeClaim's own `claim_status = 'pending'` guard,
 * which simply refuses the second attempt rather than doing anything odd.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { origin } = new URL(request.url);
  const finishPath = `/claim/${token}/finish`;

  const user = await currentUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(finishPath)}`);
  }

  // Signed in but hasn't picked a handle yet (a brand-new signup lands here
  // before onboarding, or someone jumped straight to this URL) — onboarding
  // itself carries `next` right back to this same route once they're done.
  const profile = await myProfile();
  if (!profile) {
    return NextResponse.redirect(`${origin}/onboarding?next=${encodeURIComponent(finishPath)}`);
  }

  const result = await finalizeClaim(token, profile.id);
  if (!result.ok) {
    return NextResponse.redirect(`${origin}/claim/${token}?error=expired`);
  }
  return NextResponse.redirect(`${origin}/write/${result.storyId}?claimed=1`);
}
