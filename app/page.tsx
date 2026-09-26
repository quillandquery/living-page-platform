import Link from "next/link";
import type { Metadata } from "next";

import { Doodle } from "@/components/doodles/Doodle";
import { TryIt } from "@/components/home/TryIt";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { homeJsonLd, jsonLdScriptProps } from "@/lib/structured-data";

/**
 * HOMEPAGE METADATA (SEO audit, Sept 2026). The homepage previously set no
 * metadata of its own — it inherited the root layout's title/description,
 * which is fine for search snippets, but it had no `openGraph`/`twitter`
 * fields or canonical URL, so a shared homepage link (the highest-traffic
 * SEO asset the product has, per the pre-launch strategy doc) rendered as a
 * bare text link everywhere instead of a card. The image comes from the
 * co-located opengraph-image.tsx via Next's file convention.
 */
const HOME_TITLE = "Living Page — A new way to tell a story";
const HOME_DESCRIPTION =
  "You have a story. It shouldn't look like a blog post. Write it normally — Living Page works out the typography, motion and colour it wants, automatically.";

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

/** The four writer entry points — same copy/hrefs as the shipped Phase 1
 *  homepage (commit 83c0c44), restored per feedback. All four go to /make;
 *  which mode you land in is /make's own concern, not re-implemented here. */
const MODES = [
  { key: "story", label: "Something happened.", cta: "Start a story" },
  { key: "moment", label: "Something tiny you can't forget.", cta: "Capture a moment" },
  { key: "thought", label: "Something sitting in your head.", cta: "Put it somewhere" },
  { key: "freeform", label: "Don't know yet? That's fine.", cta: "Just start" },
] as const;

/** Three real-feeling glimpses of what a page can look like — restored
 *  alongside the mode grid. Each one links straight to the real Wander
 *  seed story it's teasing (lib/wander-samples.ts) instead of the generic
 *  /wander hub — these used to all point at /wander itself, which read as
 *  three specific story teasers that led nowhere specific. */
const EXAMPLES = [
  { place: "GOKARNA", line: "The night bus, and the ten minutes after I got down.", accent: "var(--electric)", slug: "ask-me-to-stay" },
  { place: "A KITCHEN, 2AM", line: "Everyone was asleep. I wasn't.", accent: "var(--tomato)", slug: "chargers" },
  { place: "THE 6:40 TRAIN", line: "I didn't expect to miss this place.", accent: "var(--grass)", slug: "the-best-night" },
] as const;

/**
 * THE FRONT DOOR (homepage P0 pass, see the P0 brief this session was
 * scoped from). Three jobs only: make the visitor understand what Living
 * Page is, make them curious what happens to *their* writing, give them two
 * obvious doors — Make something / Wander. Nothing else.
 *
 * Visual language: the demo stays matched to the live homepage (one bordered
 * card, personalities as pure typography swaps) — but the two doors and the
 * personality tabs are deliberately the fun/playful bits, per feedback: the
 * doors get a gradient + hand-drawn doodle icon each (star / steps), the
 * tabs get their colour back (one swatch per personality via `--sw`).
 *
 * The hero transform and the "one sentence, many personalities" demo are one
 * interactive thing (`TryIt`): it tours on its own for a passive visitor,
 * and typing your own line is a deliberate two-step — type it, then hit
 * "Give it life" to watch it transform, rather than a live-as-you-type
 * effect (that read as broken more often than it read as magic).
 *
 * The four writer modes (Story/Moment/Thought/Just start) and the Wander
 * discovery surface are NOT re-implemented here — both already have a real
 * home (`/make`, `/wander`); duplicating them on the homepage was filler.
 *
 * Self-contained (inline styles, no Tailwind/component lib per Decision D7)
 * so this pass can't touch Wander, Make Something, the editor, or the story
 * renderer — all explicitly out of scope for this P0.
 */

export default function Home() {
  return (
    <main className="lp">
      {/* Site-level entity structured data (SEO/GEO audit, Sept 2026) --
          the only place Organization/WebSite JSON-LD is rendered; every
          other page's structured data is about a story or an author, not
          about Living Page itself. See lib/structured-data.ts's homeJsonLd(). */}
      <script type="application/ld+json" {...jsonLdScriptProps(homeJsonLd())} />
      <style>{CSS}</style>

      <nav className="lp-nav">
        <span className="lp-logo">Living Page</span>
        <span className="lp-nav-r">
          <Link href="/wander">Wander</Link>
          <Link href="/login">Sign in</Link>
        </span>
      </nav>

      {/* ── hero: statement + doors (left), try it (right) ── */}
      <header className="lp-hero">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow">A new way to tell a story</p>
          <h1 className="lp-h1">
            You have a story.
            <br />
            <span className="lp-h1-2">It shouldn&rsquo;t look like a blog post.</span>
          </h1>
          <p className="lp-sub">Write it normally. We&rsquo;ll make it come alive.</p>
          <div className="lp-cta-row">
            <Link href="/make" className="lp-door lp-door-make">
              <span className="lp-door-icon">
                <Doodle name="star" seed={5} size={20} width={1.8} ink="currentColor" />
              </span>
              Make something
            </Link>
            <Link href="/wander" className="lp-door lp-door-wander">
              <span className="lp-door-icon">
                <Doodle name="steps" seed={11} size={20} width={1.6} ink="currentColor" />
              </span>
              Wander
            </Link>
          </div>
        </div>

        <div className="lp-hero-demo">
          <p className="lp-demo-kick">One sentence. Many personalities.</p>
          <TryIt />
        </div>
      </header>

      {/* ── the four modes (restored, unchanged from the shipped homepage) ── */}
      <section className="lp-sec">
        <h2 className="lp-sec-h">You don&rsquo;t have to write a whole thing.</h2>
        <div className="lp-modes">
          {MODES.map((m) => (
            <Link key={m.key} href="/make" className="lp-mode">
              <span className="lp-mode-label">{m.label}</span>
              <span className="lp-mode-cta">{m.cta} →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── or just read something (restored) ── */}
      <section className="lp-sec">
        <h2 className="lp-sec-h">Or just read something.</h2>
        <div className="lp-examples">
          {EXAMPLES.map((e) => (
            <Link key={e.place} href={`/wander/s/${e.slug}`} className="lp-example" style={{ ["--a" as string]: e.accent }}>
              <span className="ex-place">{e.place}</span>
              <span className="ex-line">{e.line}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── closing ── */}
      <section className="lp-close">
        <p className="lp-close-kick">Got a story?</p>
        <p className="lp-close-h">Tell it.</p>
        <Link href="/make" className="lp-btn lp-btn-primary lp-btn-lg">
          Make your first page →
        </Link>
        <Link href="/wander" className="lp-close-alt">
          Read something beautiful →
        </Link>
      </section>

      <footer className="lp-foot">
        Living Page <Link href="/about" className="lp-foot-about">About</Link>
      </footer>
    </main>
  );
}

const CSS = `
.lp{
  --paper:#FBF6EC; --paper-2:#fff; --ink:#1A1816; --ink-soft:#4A4642; --mute:#8A837A; --line:#E7DFCE;
  --sun:#FFC53D; --tomato:#F0492E; --electric:#2D6BF0; --grass:#1F9E5A; --coral:#FF5C7A; --lilac:#9B7EDE;
  --f-disp:var(--font-disp),Georgia,serif; --f-body:var(--font-body),Georgia,serif;
  --f-hand:var(--font-hand),cursive; --f-mono:var(--font-mono),ui-monospace,monospace;
  background:var(--paper); color:var(--ink); min-height:100vh; overflow-x:hidden;
  font-family:var(--f-body);
}
.lp a{ color:inherit; text-decoration:none; }
.lp-nav{ display:flex; align-items:center; justify-content:space-between; padding:1.3rem max(1rem,4vw); }
.lp-logo{ font-family:var(--f-hand); font-size:1.4rem; }
.lp-nav-r{ display:flex; gap:1.4rem; font-family:var(--f-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; }
.lp-nav-r a{ color:var(--mute); } .lp-nav-r a:hover{ color:var(--electric); }

.lp-hero{ display:grid; grid-template-columns:1.05fr .95fr; gap:3rem; align-items:center;
  padding:6vh max(1rem,4vw) 8vh; max-width:78rem; margin:0 auto; }
.lp-hero-copy{ display:flex; flex-direction:column; }
.lp-eyebrow{ font-family:var(--f-mono); font-size:.72rem; letter-spacing:.16em; text-transform:uppercase; color:var(--electric); margin:0 0 1rem; }
.lp-h1{ font-family:var(--f-disp); font-weight:400; font-size:clamp(2.6rem,6vw,4.4rem); line-height:1.03; margin:0; }
.lp-h1-2{ color:var(--tomato); }
.lp-sub{ font-size:1.25rem; color:var(--ink-soft); margin:1.4rem 0 2rem; }

/* ── the two doors — the one deliberately playful pair of buttons on the
   page: Make something is a little gift (gradient + a star being drawn),
   Wander is a quieter invitation (paper card + footsteps). No decorative
   elements behind either button — the earlier "peek" shapes floated free of
   the button on small screens, so the doodle lives inside the button now. ── */
.lp-cta-row{ display:flex; gap:.9rem; flex-wrap:wrap; }
.lp-door{ display:inline-flex; align-items:center; gap:.65rem; font-family:var(--f-mono); font-size:.78rem;
  letter-spacing:.08em; text-transform:uppercase; padding:.95rem 1.5rem; border-radius:14px;
  transition:transform .25s cubic-bezier(.2,1.25,.3,1), box-shadow .25s, border-color .2s, color .2s; }
.lp-door-icon{ display:inline-flex; width:20px; height:20px; flex:none; }
.lp-door-icon .doodle{ display:block; }
.lp-door-make{ background:linear-gradient(135deg, var(--tomato), var(--sun)); color:#fff;
  box-shadow:0 10px 26px rgba(240,73,46,.3); }
.lp-door-make .lp-door-icon{ color:#fff; }
.lp-door-make:hover{ transform:translateY(-3px) rotate(-.3deg); box-shadow:0 16px 34px rgba(240,73,46,.4); }
.lp-door-wander{ background:var(--paper-2); border:1px solid var(--line); color:var(--ink-soft); }
.lp-door-wander .lp-door-icon{ color:var(--mute); transition:color .2s; }
.lp-door-wander:hover{ border-color:var(--electric); color:var(--electric); transform:translateY(-3px);
  box-shadow:0 10px 24px rgba(45,107,240,.14); }
.lp-door-wander:hover .lp-door-icon{ color:var(--electric); }

/* plain pill — still used by the closing section's single CTA */
.lp-btn{ display:inline-block; font-family:var(--f-mono); font-size:.75rem; letter-spacing:.1em; text-transform:uppercase;
  padding:.85rem 1.3rem; border-radius:999px; transition:transform .2s cubic-bezier(.2,1.25,.3,1), background .2s; }
.lp a.lp-btn-primary{ background:var(--ink); color:var(--paper); }
.lp a.lp-btn-primary:hover{ background:var(--electric); transform:translateY(-2px); }
.lp a.lp-btn-ghost{ border:1px solid var(--line); color:var(--ink-soft); }
.lp a.lp-btn-ghost:hover{ border-color:var(--electric); color:var(--electric); }
.lp-btn-lg{ font-size:.85rem; padding:1rem 1.6rem; }

/* ── try it: hero transform + "one sentence, many personalities", merged.
   Same card the live hero already used (.hero-page); personalities are
   pure typography swaps on one line, same trick as the live page's
   p-whisper/p-shout/p-hand/p-drift/p-type. One box only — the tabs and the
   input row sit below it unboxed. ── */
.lp-hero-demo{ display:flex; flex-direction:column; }
.lp-demo-kick{ font-family:var(--f-mono); font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:var(--mute); margin:0 0 .9rem; }
.tryit{ display:flex; flex-direction:column; gap:1rem; }

.hero-page{ position:relative; background:var(--paper-2); border:1px solid rgba(231,223,206,.55); border-radius:26px;
  padding:2.4rem 2.2rem; min-height:14rem;
  box-shadow:0 1px 2px rgba(26,24,22,.03), 0 24px 48px -14px rgba(26,24,22,.16), 0 10px 22px rgba(26,24,22,.05);
  overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
.hero-line{ font-family:var(--f-body); font-size:1.35rem; line-height:1.5; margin:.2rem 0; color:var(--ink);
  transition:all .9s cubic-bezier(.2,.8,.3,1); }
.ph-0 .hero-line{ color:var(--mute); font-size:1.15rem; letter-spacing:0; }
.ph-1 .hero-line{ color:var(--ink-soft); }
.ph-2 .hl-0{ font-family:var(--f-hand); font-size:1.5rem; color:var(--electric); transform:rotate(-1.5deg); }
.ph-2 .hl-1{ color:var(--electric); font-style:italic; letter-spacing:.02em; opacity:.85; }
.ph-2 .hl-2{ font-family:var(--f-disp); font-size:2.6rem; line-height:1.1; color:var(--tomato); }
.hero-doodle{ position:absolute; right:-1.4rem; top:-1.4rem; width:130px; height:130px; opacity:0;
  background:radial-gradient(circle at 55% 45%, var(--sun) 0%, rgba(255,197,61,.45) 34%, transparent 72%);
  transition:opacity .8s ease; }
.ph-2 .hero-doodle{ opacity:1; animation:hb 3s ease-in-out infinite; }
@keyframes hb{ 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.15); } }
.hero-caret{ display:inline-block; width:.5em; height:1em; margin-left:.15em; background:var(--mute); vertical-align:-.15em;
  animation:lp-blink 1s steps(1) infinite; }
.ph-1 .hero-caret, .ph-2 .hero-caret{ display:none; }
@keyframes lp-blink{ 50%{ opacity:0; } }

/* personalities — same box, one line, just a different voice */
.per-line{ display:block; font-size:2rem; transition:all .5s cubic-bezier(.2,.8,.3,1); }
.p-postcard{ font-family:var(--f-disp); font-style:italic; font-size:2rem; color:var(--tomato); }
.p-diary{ font-family:var(--f-hand); font-size:2.2rem; color:var(--electric); transform:rotate(-2deg); }
.p-comic{ font-family:var(--f-disp); font-size:2.6rem; text-transform:uppercase; color:var(--tomato); }
.p-collage{ font-family:var(--f-disp); font-size:1.9rem; }
.p-collage .wc-word{ display:inline-block; transform:rotate(var(--r,0deg)); }
.p-collage .wc-word:nth-child(3n){ color:var(--grass); }
.p-collage .wc-word:nth-child(4n){ font-family:var(--f-hand); }
.p-cinematic{ font-style:italic; color:var(--lilac); letter-spacing:.1em; opacity:.8; }
.p-minimal{ font-size:1.1rem; color:var(--mute); letter-spacing:.04em; }

/* personality tabs — the other deliberately playful/colourful bit: each
   tab carries its own swatch (--sw, set inline per tab) instead of one
   flat interactive colour. */
.stage-tabs{ display:flex; flex-wrap:wrap; gap:.5rem; }
.stage-tab{ display:inline-flex; align-items:center; gap:.42rem; font-family:var(--f-mono); font-size:.68rem;
  letter-spacing:.08em; text-transform:uppercase; color:var(--mute);
  background:var(--paper-2); border:1px solid var(--line); border-radius:999px; padding:.42rem .85rem .42rem .7rem; cursor:pointer;
  transition:border-color .2s, color .2s, background .2s; }
.tab-dot{ width:7px; height:7px; border-radius:50%; background:var(--sw, var(--mute)); flex:none; transition:transform .2s ease; }
.stage-tab:hover{ border-color:var(--sw); color:var(--sw); }
.stage-tab:hover .tab-dot{ transform:scale(1.35); }
.stage-tab.active{ border-color:var(--sw); color:var(--sw); background:color-mix(in oklab, var(--sw) 10%, var(--paper-2)); }
.stage-tab.active .tab-dot{ transform:scale(1.35); }

/* try-your-own-line */
.stage-try{ display:flex; align-items:center; gap:.6rem; }
.try-icon{ color:var(--mute); font-size:.9rem; }
.stage-input{ flex:1; background:transparent; border:none; border-bottom:1px dashed var(--line); font-family:var(--f-body);
  font-size:1rem; color:var(--ink); padding:.3rem .1rem; outline:none; transition:border-color .2s; min-width:0; }
.stage-input::placeholder{ color:var(--mute); font-style:italic; }
.stage-input:focus{ border-color:var(--electric); }
.try-reset{ font-family:var(--f-mono); font-size:.65rem; letter-spacing:.06em; text-transform:uppercase; color:var(--mute);
  background:none; border:none; cursor:pointer; padding:.2rem .3rem; white-space:nowrap; }
.try-reset:hover{ color:var(--electric); }

/* "give it life" — the deliberate second step for a typed line: it sits
   there looking ordinary until you press this, then it transforms. */
.try-life{ font-family:var(--f-mono); font-size:.68rem; letter-spacing:.06em; text-transform:uppercase; color:#fff;
  background:linear-gradient(135deg, var(--electric), var(--lilac)); border:none; border-radius:999px;
  padding:.5rem .9rem; cursor:pointer; white-space:nowrap; box-shadow:0 6px 16px rgba(45,107,240,.28);
  transition:transform .2s cubic-bezier(.2,1.25,.3,1), box-shadow .2s; animation:try-life-pulse 1.8s ease-in-out infinite; }
.try-life:hover{ transform:translateY(-2px); box-shadow:0 10px 22px rgba(45,107,240,.4); }
@keyframes try-life-pulse{ 0%,100%{ box-shadow:0 6px 16px rgba(45,107,240,.28); } 50%{ box-shadow:0 6px 20px rgba(45,107,240,.45); } }

/* the four modes + read-something (restored from the shipped homepage) */
.lp-sec{ max-width:66rem; margin:0 auto; padding:5vh max(1rem,4vw); border-top:1px solid var(--line); }
.lp-sec-h{ font-family:var(--f-disp); font-weight:400; font-size:clamp(1.7rem,4vw,2.6rem); margin:0 0 1.6rem; }

.lp-modes{ display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; }
.lp-mode{ background:var(--paper-2); border:1px solid var(--line); border-radius:14px; padding:1.4rem 1.5rem;
  display:flex; flex-direction:column; gap:.8rem; transition:transform .2s cubic-bezier(.2,1.25,.3,1), border-color .2s; }
.lp-mode:hover{ transform:translateY(-3px); border-color:var(--electric); }
.lp-mode-label{ font-family:var(--f-disp); font-size:1.4rem; }
.lp-mode-cta{ font-family:var(--f-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--electric); }

.lp-examples{ display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; }
.lp-example{ background:var(--paper-2); border:1px solid var(--line); border-left:3px solid var(--a,var(--electric));
  border-radius:12px; padding:1.3rem 1.4rem; display:flex; flex-direction:column; gap:.6rem; transition:transform .2s; }
.lp-example:hover{ transform:translateY(-3px); }
.ex-place{ font-family:var(--f-mono); font-size:.68rem; letter-spacing:.1em; color:color-mix(in oklab,var(--a,var(--electric)) 70%,var(--ink)); }
.ex-line{ font-family:var(--f-disp); font-size:1.25rem; line-height:1.25; }

/* closing */
.lp-close{ text-align:center; padding:12vh max(1rem,4vw) 8vh; border-top:1px solid var(--line); }
.lp-close-kick{ font-family:var(--f-mono); font-size:.8rem; letter-spacing:.14em; text-transform:uppercase; color:var(--mute); margin:0; }
.lp-close-h{ font-family:var(--f-disp); font-size:clamp(3rem,10vw,6rem); margin:.2rem 0 1.8rem; }
.lp-close-alt{ display:block; margin-top:1.2rem; font-family:var(--f-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--mute); }
.lp-close-alt:hover{ color:var(--electric); }
.lp-foot{ text-align:center; padding:3rem; font-family:var(--f-hand); font-size:1.2rem; color:var(--mute); border-top:1px solid var(--line); }
.lp-foot-about{ font-family:var(--f-mono); font-size:.65rem; letter-spacing:.08em; text-transform:uppercase; vertical-align:middle; margin-left:.6rem; }
.lp-foot-about:hover{ color:var(--electric); }

@media (max-width:820px){
  .lp-hero{ grid-template-columns:1fr; gap:2rem; }
  .lp-modes{ grid-template-columns:1fr; }
  .lp-examples{ grid-template-columns:1fr; }
}
@media (prefers-reduced-motion:reduce){
  .hero-line, .per-line, .hero-doodle, .hero-caret, .stage-tab, .lp-door, .try-life{ transition:none !important; animation:none !important; }
}
`;
