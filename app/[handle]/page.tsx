import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { writerStories, currentUser } from "@/lib/db";
import { buildSeeds } from "@/lib/discover";
import { getArchiveVibe, getArchiveLabel } from "@/lib/archive-vibe";
import { AuthorArchive } from "@/components/profile/AuthorArchive";
import type { StoryWithAuthor } from "@/lib/types";

/** `/@handle` — a writer's public page. Also answers `/handle` without the @. */
const clean = (h: string) => decodeURIComponent(h).replace(/^@/, "").toLowerCase();

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const data = await writerStories(clean(handle));
  if (!data) return {};
  const { author, stories } = data;
  const name = author.display_name?.trim() && author.display_name.trim() !== author.handle
    ? author.display_name.trim()
    : `@${author.handle}`;
  const title = `${name} — Living Page`;
  // Doc §12: bio verbatim where present; otherwise a neutral, non-generic
  // fallback — never a story count (that's UI chrome, not identity).
  const description = author.bio?.trim()
    ? author.bio.trim()
    : "A Living Page author profile.";
  const url = `${SITE_URL}/@${author.handle}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Living Page",
      type: "profile",
      ...(author.avatar_url ? { images: [author.avatar_url] } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function WriterPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await writerStories(clean(handle));
  if (!data) notFound();
  const { author, stories } = data;

  const user = await currentUser();
  const isOwner = user?.id === author.id;

  const hasDisplayName = !!author.display_name?.trim() && author.display_name.trim() !== author.handle;
  const name = hasDisplayName ? author.display_name.trim() : `@${author.handle}`;
  const bio = author.bio?.trim() || "";

  const withAuthor: StoryWithAuthor[] = stories.map((s) => ({ ...s, author }));
  const seeds = buildSeeds(withAuthor);
  const vibe = getArchiveVibe(stories);
  const label = getArchiveLabel(vibe, author.id);

  const url = `${SITE_URL}/@${author.handle}`;
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url,
    ...(author.avatar_url ? { image: author.avatar_url } : {}),
    ...(bio ? { description: bio } : {}),
  };

  return (
    <main className="frame author-page">
      {/* Person structured data — only what's actually known about this
          profile; nothing invented (no fabricated sameAs links, no fake
          socials). See docs in the SEO strategy note on E-E-A-T. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd).replace(/</g, "\\u003c") }}
      />

      <nav className="topnav">
        <Link href="/wander" className="topnav-link">wander</Link>
      </nav>

      <section className="author-head">
        {author.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.avatar_url} alt="" className="author-avatar" />
        ) : null}
        <h1 className="author-name">{name}</h1>
        {hasDisplayName ? <p className="author-handle">@{author.handle}</p> : null}
        {bio ? <p className="author-bio">{bio}</p> : null}
      </section>

      {stories.length === 0 ? (
        <section className="author-empty">
          <p className="author-empty-line">Nothing here yet.</p>
          <p className="author-empty-sub">Which is probably about to change.</p>
          {isOwner ? <Link href="/make" className="author-empty-cta">write something →</Link> : null}
        </section>
      ) : (
        <>
          <p className="archive-label">{label}</p>
          <AuthorArchive seeds={seeds} />
        </>
      )}
    </main>
  );
}
