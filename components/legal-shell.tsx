import Link from "next/link";
import type { ReactNode } from "react";

/** Where privacy and legal questions go. Confirm this inbox exists before launch. */
export const CONTACT_EMAIL = "reshikaa30@gmail.com";

/**
 * Shared shell for the plain-prose legal pages (/privacy, /terms). Same
 * restrained look as /about: no motion, no art, just readable text.
 */
export function LegalShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="legal-page">
      <style>{CSS}</style>
      <nav className="legal-nav">
        <Link href="/">Living Page</Link>
        <Link href="/about">About</Link>
      </nav>
      <article className="legal-body">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated {updated}</p>
        {children}
      </article>
    </main>
  );
}

const CSS = `
.legal-page{ min-height:100vh; background:var(--paper); color:var(--ink); font-family:var(--f-body); }
.legal-nav{ display:flex; gap:1.4rem; padding:1.3rem max(1rem,4vw);
  font-family:var(--f-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; }
.legal-nav a{ color:var(--mute); text-decoration:none; }
.legal-nav a:hover{ color:var(--electric,#2D6BF0); }
.legal-body{ max-width:38rem; margin:0 auto; padding:4vh max(1rem,4vw) 10vh; }
.legal-body h1{ font-family:var(--f-disp); font-weight:400; font-size:clamp(2rem,5vw,2.8rem); margin:0 0 .6rem; }
.legal-body h2{ font-family:var(--f-disp); font-weight:400; font-size:1.3rem; margin:2.2rem 0 .8rem; }
.legal-body p, .legal-body li{ font-size:1.05rem; line-height:1.65; color:var(--ink-soft); }
.legal-body p{ margin:0 0 1.2rem; }
.legal-body ul{ margin:0 0 1.2rem; padding-left:1.3rem; }
.legal-body li{ margin-bottom:.5rem; }
.legal-body a{ color:var(--electric,#2D6BF0); }
.legal-updated{ font-family:var(--f-mono); font-size:.72rem !important; letter-spacing:.08em; text-transform:uppercase; color:var(--mute) !important; margin-bottom:2rem !important; }
`;
