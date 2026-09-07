import { redirect } from "next/navigation";
import Link from "next/link";
import { myProfile, currentUser } from "@/lib/db";
import { OnboardingForm } from "./form";

/**
 * The one thing every writer does once: choose the name they write under.
 * If they already have a profile there is nothing to do here.
 */
export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const profile = await myProfile();
  if (profile) redirect("/write");

  const suggestion = (user.email ?? "").split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);

  return (
    <main className="gate">
      <div className="gate-card">
        <Link href="/" className="back">places</Link>
        <h1 className="gate-title">Pick a name to write under.</h1>
        <p className="gate-sub">It becomes your address on the site — living.page/@you — and it&rsquo;s hard to change later, so choose one you&rsquo;d sign.</p>
        <OnboardingForm suggestion={suggestion} />
      </div>
    </main>
  );
}
