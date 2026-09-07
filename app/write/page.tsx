import Link from "next/link";
import { redirect } from "next/navigation";
import { myProfile, myStories } from "@/lib/db";
import { createStoryAction } from "./actions";
import { signOutAction } from "@/app/auth/actions";

/**
 * THE DESK. Everything a writer has started, drafts and published together,
 * newest touched first. Not a grid of cards pretending to be a magazine —
 * a list of pieces, the way a notebook is a list of pages.
 */
export default async function Dashboard() {
  const profile = await myProfile();
  if (!profile) redirect("/onboarding");
  const stories = await myStories();

  const drafts = stories.filter((s) => s.status === "draft");
  const live = stories.filter((s) => s.status === "published");

  return (
    <main className="desk">
      <header className="desk-bar">
        <span className="desk-mark">the living page</span>
        <span style={{ flex: 1 }} />
        <Link href={`/@${profile.handle}`} className="back">@{profile.handle}</Link>
        <Link href="/settings" className="back">settings</Link>
        <form action={signOutAction}><button className="linklike">sign out</button></form>
      </header>

      <section className="desk-head">
        <h1 className="desk-title">Your desk</h1>
        <form action={createStoryAction}>
          <button className="act">start a new piece</button>
        </form>
      </section>

      {stories.length === 0 ? (
        <p className="hint desk-empty">Nothing here yet. A piece starts with a bad first draft — that&rsquo;s the whole idea.</p>
      ) : null}

      {drafts.length ? (
        <>
          <h2 className="desk-section">Drafts</h2>
          <ul className="desk-list">
            {drafts.map((s) => (
              <li key={s.id}>
                <Link href={`/write/${s.id}`} className="desk-item">
                  <span className="desk-place">{s.place || "untitled"}</span>
                  <span className="desk-frag">{s.fragment || "no doorway line yet"}</span>
                  <span className="desk-badge draft">draft</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {live.length ? (
        <>
          <h2 className="desk-section">Published</h2>
          <ul className="desk-list">
            {live.map((s) => (
              <li key={s.id}>
                <Link href={`/write/${s.id}`} className="desk-item">
                  <span className="desk-place" style={{ ["--accent" as string]: s.accent }}>{s.place || "untitled"}</span>
                  <span className="desk-frag">{s.fragment}</span>
                  <span className="desk-links">
                    <Link href={`/@${profile.handle}/${s.slug}`} className="desk-badge live">read →</Link>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </main>
  );
}
