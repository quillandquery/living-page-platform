import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { writerStories, writerPage } from "@/lib/db";
import { visibilityCounts } from "@/lib/visibility";
import { buildSeeds } from "@/lib/discover";
import { diversifyArchetypes } from "@/lib/archive-composition";
import { AuthorArchive } from "@/components/profile/AuthorArchive";
import { Doodle } from "@/components/doodles/Doodle";
import type { StoryWithAuthor } from "@/lib/types";
import { absoluteUrl } from "@/lib/site";
import { profilePageJsonLd, jsonLdScriptProps } from "@/lib/structured-data";
import { deriveAuthorDescription } from "@/lib/author-seo";

/** `/@handle` — a writer's public page. Also answers `/handle` without the @. */
const clean = (h: string) => decodeURIComponent(h).replace(/^@/, "").toLowerCase();

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  // PUBLIC stories only — the title/description/count in <head> must read the
  // same whoever (or whatever crawler) asks, and never mention a private story.
  const data = await writerStories(clean(handle));
  if (!data) return {};
  const { author, stories } = data;
  const name = author.display_name?.trim() && author.display_name.trim() !== author.handle
    ? author.display_name.trim()
    : `@${author.handle}`;
  const title = name;
  const description = author.bio?.trim()
    ? author.bio.trim()
    : deriveAuthorDescription(name, stories);
  const url = absoluteUrl(`/@${author.handle}`);

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
  // Strangers get public stories only. The writer, viewing their own page,
  // also gets their private ones (flagged) — resolved from the session inside
  // writerPage, never from anything the request can claim.
  const data = await writerPage(clean(handle));
  if (!data) notFound();
  const { author, stories, isOwner } = data;
  const counts = visibilityCounts(stories);

  const hasDisplayName = !!author.display_name?.trim() && author.display_name.trim() !== author.handle;
  const name = hasDisplayName ? author.display_name.trim() : `@${author.handle}`;
  const bio = author.bio?.trim() || "";

  const withAuthor: StoryWithAuthor[] = stories.map((s) => ({ ...s, author }));
  const seeds = diversifyArchetypes(buildSeeds(withAuthor));

  const url = absoluteUrl(`/@${author.handle}`);
  const profileLd = profilePageJsonLd({ name, url, image: author.avatar_url, description: bio || null });

  return (
    <main className="frame author-page">
      {/* Ambient personality art — a traveller who disappears into books.
          Faint, non-interactive, framing the page so the deck doesn't float
          in empty space. Real doodles from the registry, not stray shapes. */}
      <div className="author-ambient" aria-hidden="true">
        <span className="am am-1"><Doodle name="suitcase" seed={11} size={88} ink="var(--ink-soft)" /></span>
        <span className="am am-2"><Doodle name="book" seed={22} size={80} ink="var(--ink-soft)" /></span>
        <span className="am am-3"><Doodle name="map" seed={33} size={104} ink="var(--ink-soft)" /></span>
        <span className="am am-4"><Doodle name="passport" seed={44} size={72} ink="var(--ink-soft)" /></span>
        <span className="am am-5"><Doodle name="camera" seed={55} size={80} ink="var(--ink-soft)" /></span>
        <span className="am am-6"><Doodle name="ticket" seed={66} size={78} ink="var(--ink-soft)" /></span>
        <span className="am am-7"><Doodle name="mountain" seed={77} size={96} ink="var(--ink-soft)" /></span>
        <span className="am am-8"><Doodle name="book" seed={88} size={66} ink="var(--ink-soft)" /></span>
      </div>

      {/* Person + ProfilePage structured data — only what's actually known
          about this profile; nothing invented (no fabricated sameAs links,
          no fake socials). See docs in the SEO strategy note on E-E-A-T. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        {...jsonLdScriptProps(profileLd)}
      />

      <nav className="topnav">
        <Link href="/wander" className="topnav-link">wander</Link>
      </nav>

      <section className="author-head">
        {author.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.avatar_url} alt={`${name}'s photo`} className="author-avatar" />
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
          <p className="archive-label">Stories</p>
          {isOwner && counts.private > 0 ? (
            <p className="archive-sub">{counts.public} public · {counts.private} private · private ones only show to you</p>
          ) : null}
          <AuthorArchive seeds={seeds} isOwner={isOwner} />
        </>
      )}
    </main>
  );
}
