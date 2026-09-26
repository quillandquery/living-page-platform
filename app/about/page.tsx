import Link from "next/link";
import type { Metadata } from "next";

import { absoluteUrl, SITE_NAME } from "@/lib/site";

/**
 * `/about` (SEO/GEO/AEO audit, Sept 2026, re-applied Sept 26 from the
 * unmerged seo-fixes-2026-09-22 branch since main had diverged too far to
 * merge that branch cleanly). Two gaps this closes at once:
 *
 * 1. GEO/AEO citability — the one clean, literal "Living Page is..."
 *    sentence a system could quote existed only in llms.txt (public/llms.txt),
 *    which a partial (if growing) share of crawlers actually fetch. This page
 *    puts the same real sentence on an ordinary, fully-indexable HTML page.
 * 2. E-E-A-T Trustworthiness — there was no page anywhere stating what this
 *    is or how authorship/attribution works. Deliberately plain prose, not
 *    homepage-style copy: the locked hero (docs/COPY.md) is untouched here.
 *
 * What this page does NOT add: a founder name, a company entity, or a
 * contact address — none of those exist as real information to add here,
 * and lib/structured-data.ts's own rule is to never invent a fact.
 */
const ABOUT_TITLE = "About";
const ABOUT_DESCRIPTION =
  "Living Page is a storytelling platform where a person writes a short, ordinary story and the site works out the typography, motion, and colour it wants — automatically.";

export const metadata: Metadata = {
  title: ABOUT_TITLE,
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/about") },
  openGraph: {
    title: `${ABOUT_TITLE} — ${SITE_NAME}`,
    description: ABOUT_DESCRIPTION,
    url: absoluteUrl("/about"),
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${ABOUT_TITLE} — ${SITE_NAME}`,
    description: ABOUT_DESCRIPTION,
  },
};

export default function AboutPage() {
  return (
    <main className="about-page">
      <style>{CSS}</style>
      <nav className="about-nav">
        <Link href="/">Living Page</Link>
        <Link href="/wander">Wander</Link>
      </nav>

      <article className="about-body">
        <h1>About Living Page</h1>

        <p>
          Living Page is a storytelling platform where a person writes a short,
          ordinary story and the site works out the typography, motion, and
          colour it wants — automatically. Every story is a real, published
          page, not a template with the writer&rsquo;s words dropped into it.
        </p>

        <p>
          It is not a blog and not a page builder. A writer submits a
          fragment of text — a trip, a moment, a thought — and the system
          reads it and renders it as one of several distinct visual formats,
          chosen to fit that story&rsquo;s own shape and content. The words
          themselves are never altered, reordered, or hidden by this process
          — layout and motion are presentational only.
        </p>

        <h2>Attribution</h2>
        <p>
          Stories are written by their credited authors, who retain
          authorship. If you&rsquo;re quoting or summarizing a story, attribute
          it to its author and link to its own canonical page, rather than to
          Living Page as publisher.
        </p>

        <p>
          <Link href="/wander">Read some real stories on Wander →</Link>
        </p>
      </article>
    </main>
  );
}

const CSS = `
.about-page{
  min-height:100vh; background:var(--paper); color:var(--ink);
  font-family:var(--f-body);
}
.about-nav{ display:flex; gap:1.4rem; padding:1.3rem max(1rem,4vw);
  font-family:var(--f-mono); font-size:.72rem;
  letter-spacing:.08em; text-transform:uppercase; }
.about-nav a{ color:var(--mute); text-decoration:none; }
.about-nav a:hover{ color:var(--electric,#2D6BF0); }
.about-body{ max-width:38rem; margin:0 auto; padding:4vh max(1rem,4vw) 10vh; }
.about-body h1{ font-family:var(--f-disp); font-weight:400;
  font-size:clamp(2rem,5vw,2.8rem); margin:0 0 1.6rem; }
.about-body h2{ font-family:var(--f-disp); font-weight:400;
  font-size:1.3rem; margin:2.2rem 0 .8rem; }
.about-body p{ font-size:1.05rem; line-height:1.65; color:var(--ink-soft); margin:0 0 1.2rem; }
.about-body a{ color:var(--electric,#2D6BF0); }
`;
