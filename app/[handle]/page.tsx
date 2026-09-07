import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Doodle } from "@/components/doodles/Doodle";
import { writerStories } from "@/lib/db";

/** `/@handle` — a writer's shelf. Also answers `/handle` without the @. */
const clean = (h: string) => decodeURIComponent(h).replace(/^@/, "").toLowerCase();

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const data = await writerStories(clean(handle));
  if (!data) return {};
  const name = data.author.display_name || `@${data.author.handle}`;
  return { title: `${name} — The Living Page`, description: data.author.bio || `Travel writing by @${data.author.handle}.` };
}

export default async function WriterPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await writerStories(clean(handle));
  if (!data) notFound();
  const { author, stories } = data;

  return (
    <main className="frame">
      <nav className="topnav"><Link href="/" className="topnav-link">all pages</Link></nav>

      <section className="archive">
        <h1 className="archive-title">
          {author.display_name || `@${author.handle}`}
          <span className="archive-sub">@{author.handle}{author.bio ? ` · ${author.bio}` : ""}</span>
        </h1>

        {stories.length === 0 ? (
          <p className="hint">@{author.handle} hasn&rsquo;t published anything yet.</p>
        ) : null}

        <ul className="doorways">
          {stories.map((s) => (
            <li key={s.id}>
              <Link href={`/@${author.handle}/${s.slug}`} className="doorway" style={{ ["--accent" as string]: s.accent }}>
                <span className="place">{s.place}</span>
                <span className="doorway-line">{s.fragment}</span>
                <span className="doorway-mark" aria-hidden="true">
                  <Doodle name="arrow" seed={s.slug.length * 13} size={64} ink="var(--accent)" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
