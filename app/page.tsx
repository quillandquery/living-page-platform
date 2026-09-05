import Link from "next/link";
import { STORIES } from "@/content/stories/registry";
import { StoryFrame } from "@/components/living/StoryFrame";
import { Speak, Whisper, Shout } from "@/components/living/voices";
import { Hold } from "@/components/living/Scene";
import { Doodle } from "@/components/doodles/Doodle";

/**
 * §16 — the homepage establishes the medium by behaving like it, then
 * gets out of the way. No grid of article cards. Each story is a
 * doorway: a place, and one line you would say out loud.
 */
export default function Home() {
  return (
    <main className="frame">
      <StoryFrame veil={false}>
        <Shout body="compressed">I went somewhere.</Shout>
        <Speak>And then I came back with a story.</Speak>

        <Hold beats={1} />

        <Whisper doodle="suitcase" side="right" gesture="breathe">This isn&rsquo;t a travel guide.</Whisper>
        <Speak>No ten things to do. No hidden gems.</Speak>
        <Whisper body="edge">Just things I remember.</Whisper>
      </StoryFrame>

      <section className="archive">
        <h1 className="archive-title">
          Places I&rsquo;ve been
          <span className="archive-sub">things I remember</span>
        </h1>

        <ul className="doorways">
          {STORIES.map(({ meta }) => (
            <li key={meta.slug}>
              <Link href={`/stories/${meta.slug}`} className="doorway" style={{ ["--accent" as string]: meta.accent }}>
                <span className="place">{meta.place}</span>
                <span className="doorway-line">{meta.fragment}</span>
                <span className="doorway-mark" aria-hidden="true">
                  <Doodle name="arrow" seed={meta.slug.length * 13} size={64} ink="var(--accent)" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="studio-link">
          <Link href="/studio">the studio</Link> — paste a draft, get a first pass
        </p>
      </section>
    </main>
  );
}
