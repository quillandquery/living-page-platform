import { redirect } from "next/navigation";
import Link from "next/link";
import { myProfile } from "@/lib/db";
import { SettingsForm } from "./form";
import { signOutAction } from "@/app/auth/actions";

export default async function SettingsPage() {
  const profile = await myProfile();
  if (!profile) redirect("/onboarding");

  return (
    <main className="gate">
      <div className="gate-card">
        <Link href="/write" className="back">your desk</Link>
        <h1 className="gate-title">@{profile.handle}</h1>
        <p className="gate-sub">Your handle is fixed. Everything else is yours to change.</p>
        <SettingsForm displayName={profile.display_name} bio={profile.bio} />
        <form action={signOutAction} className="gate-signout">
          <button className="linklike">sign out</button>
        </form>
      </div>
    </main>
  );
}
