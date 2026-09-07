import Link from "next/link";
import { StoryFrame } from "@/components/living/StoryFrame";
import { Speak, Whisper, Shout } from "@/components/living/voices";
import { Hold } from "@/components/living/Scene";
import { Doodle } from "@/components/doodles/Doodle";
import { publishedFeed, myProfile } from "@/lib/db";

/**
 * THE FRONT DOOR of the platform. It still behaves like the medium — no grid
 * of article cards, each piece a doorway: a place, one line said out loud,
 * and the person who wrote it. The difference from the single-author site is
 * only that the doorways now belong to many people.
 */
export default async function Home() {
  const [stories, me] = await Promise.all([publishedFeed(), myProfile()]);

  return (
    <main className="frame">
      <nav className="topnav">
        {me
          ? <Link href="/write" className="topnav-link">your desk</Link>
          : <><Link href="/login" className="topnav-link">sign in</Link><Link href="/signup" className="topnav-cta">start writing</Link></>}
      </nav>

      <StoryFrame veil={false} arc={false}>
        <Shout body="compressed">People went somewhere.</Shout>
        <Speak>And came back with a story worth the way it&rsquo;s told.</Speak>

        <Hold beats={1} />

        <Whisper doodle="suitcase" side="right" gesture="breathe">This isn&rsquo;t a travel-blog network.</Whisper>
        <Speak>No listicles. No hidden gems. No SEO.</Speak>
        <Whisper body="edge">A page where the sentence decides how it looks.</Whisper>
      </StoryFrame>

      <section className="archive">
        <h1 className="archive-title">
          Places people have been
          <span className="archive-sub">and the way they remember them</span>
        </h1>

        {stories.length === 0 ? (
          <p className="hint">
            Nothing published yet. {me ? <Link href="/write">Write the first one.</Link> : <Link href="/signup">Be the first to write one.</Link>}
          </p>
        ) : null}

        <ul className="doorways">
          {stories.map((s) => (
            <li key={s.id}>
              <Link href={`/@${s.author.handle}/${s.slug}`} className="doorway" style={{ ["--accent" as string]: s.accent }}>
                <span className="place">{s.place}</span>
                <span className="doorway-line">{s.fragment}</span>
                <span className="doorway-by">by @{s.author.handle}</span>
                <span className="doorway-mark" aria-hidden="true">
                  <Doodle name="arrow" seed={s.slug.length * 13 + s.author.handle.length} size={64} ink="var(--accent)" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="studio-link">
          {me
            ? <><Link href="/write">your desk</Link> — start another piece</>
            : <><Link href="/signup">make a living page</Link> — write plainly, it does the rest</>}
        </p>
      </section>
    </main>
  );
}
