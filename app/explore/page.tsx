import Link from "next/link";
import { publishedFeed } from "@/lib/db";

/**
 * DISCOVERY (PRD v2 §23). Where readers browse. Light and quiet — the stories
 * carry the colour, the surface stays out of the way.
 */
export default async function Explore() {
  const stories = await publishedFeed();

  return (
    <main className="ex">
      <style>{CSS}</style>
      <nav className="ex-nav">
        <Link href="/" className="ex-logo">Living Page</Link>
        <Link href="/make" className="ex-make">Make something</Link>
      </nav>
      <div className="ex-head">
        <h1 className="ex-h1">Stories worth experiencing</h1>
        <p className="ex-sub">Real stories, told the way they felt.</p>
      </div>
      {stories.length === 0 ? (
        <p className="ex-empty">Nothing here yet. <Link href="/make">Be the first to make one.</Link></p>
      ) : (
        <ul className="ex-list">
          {stories.map((s) => (
            <li key={s.id}>
              <Link href={`/@${s.author.handle}/${s.slug}`} className="ex-item" style={{ ["--a" as string]: s.accent }}>
                <span className="ex-place">{s.place}</span>
                <span className="ex-line">{s.fragment}</span>
                <span className="ex-by">@{s.author.handle}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

const CSS = `
.ex{ --paper:#FBF6EC; --paper-2:#fff; --ink:#1A1816; --ink-soft:#4A4642; --mute:#8A837A; --line:#E7DFCE; --electric:#2D6BF0;
  --f-disp:var(--font-disp),Georgia,serif; --f-body:var(--font-body),Georgia,serif; --f-hand:var(--font-hand),cursive;
  --f-mono:var(--font-mono),ui-monospace,monospace; background:var(--paper); color:var(--ink); min-height:100vh; font-family:var(--f-body); }
.ex-nav{ display:flex; align-items:center; justify-content:space-between; padding:1.3rem max(1rem,4vw); }
.ex-logo{ font-family:var(--f-hand); font-size:1.4rem; color:inherit; text-decoration:none; }
.ex-make{ font-family:var(--f-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--paper); background:var(--ink); padding:.5rem .9rem; border-radius:999px; text-decoration:none; }
.ex-make:hover{ background:var(--electric); }
.ex-head{ max-width:56rem; margin:0 auto; padding:6vh max(1rem,4vw) 2vh; }
.ex-h1{ font-family:var(--f-disp); font-weight:400; font-size:clamp(2.2rem,6vw,3.4rem); margin:0; }
.ex-sub{ font-size:1.1rem; color:var(--ink-soft); margin:.8rem 0 0; }
.ex-empty{ max-width:56rem; margin:0 auto; padding:4vh max(1rem,4vw); color:var(--mute); }
.ex-empty a{ color:var(--electric); }
.ex-list{ max-width:56rem; margin:0 auto; padding:2vh max(1rem,4vw) 10vh; list-style:none; }
.ex-item{ display:grid; grid-template-columns:13rem 1fr auto; align-items:baseline; gap:1rem; padding:1.3rem .4rem;
  border-bottom:1px solid var(--line); text-decoration:none; color:inherit; transition:background .15s; }
.ex-item:hover{ background:color-mix(in oklab,var(--a,var(--electric)) 6%,transparent); }
.ex-place{ font-family:var(--f-disp); font-size:1.35rem; color:color-mix(in oklab,var(--a,var(--electric)) 60%,var(--ink)); }
.ex-line{ font-size:1rem; color:var(--ink-soft); line-height:1.5; }
.ex-by{ font-family:var(--f-mono); font-size:.7rem; letter-spacing:.06em; color:var(--mute); white-space:nowrap; }
@media (max-width:680px){ .ex-item{ grid-template-columns:1fr; gap:.3rem; } }
`;
