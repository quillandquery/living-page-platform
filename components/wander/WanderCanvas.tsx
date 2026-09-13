"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Doodle } from "@/components/doodles/Doodle";

export type WanderSeed = {
  id: string;
  slug: string;
  handle: string;
  authorName: string;
  place: string;
  fragment: string;
  accent: string;
  readSeconds: number;
  readLabel: string;
};

const TIME_BUCKETS = [
  { key: "all", label: "Everything" },
  { key: "quick", label: "under 2 min", test: (s: number) => s <= 120 },
  { key: "five", label: "2–5 min", test: (s: number) => s > 120 && s <= 300 },
  { key: "ten", label: "5–10 min", test: (s: number) => s > 300 && s <= 600 },
  { key: "long", label: "10+ min", test: (s: number) => s > 600 },
] as const;

const DOODLES = ["wave", "bird", "trace", "cloud", "mountain", "flower", "boat", "star"];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function doodleOf(id: string) {
  return DOODLES[hash(id + "d") % DOODLES.length];
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function Reveal({ as: As = "div", className = "", children }: { as?: any; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -7% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <As ref={ref} className={`wd-reveal${visible ? " is-visible" : ""}${className ? ` ${className}` : ""}`}>{children}</As>;
}

function ReadLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const onClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    const doc = document as any;
    if (reduced || typeof doc.startViewTransition !== "function") return;
    e.preventDefault();
    doc.startViewTransition(() => router.push(href));
  };
  return <Link href={href} className={className} onClick={onClick}>{children}</Link>;
}

function StoryMeta({ story, quiet = false }: { story: WanderSeed; quiet?: boolean }) {
  return (
    <span className={`wd-meta${quiet ? " wd-meta-quiet" : ""}`}>
      <span>{story.place}</span><i>·</i><span>{story.authorName}</span><i>·</i><span>{story.readLabel}</span>
    </span>
  );
}

export function WanderCanvas({ seeds }: { seeds: WanderSeed[] }) {
  const [spotlightIdx, setSpotlightIdx] = useState(0);
  const [bucket, setBucket] = useState<(typeof TIME_BUCKETS)[number]["key"]>("all");
  const reduced = useReducedMotion();

  useEffect(() => {
    if (seeds.length > 1) setSpotlightIdx(Math.floor(Math.random() * seeds.length));
  }, [seeds.length]);

  const spotlight = seeds[spotlightIdx];
  const activeBucket = TIME_BUCKETS.find((b) => b.key === bucket)!;
  const visibleSeeds = useMemo(
    () => activeBucket.key === "all" ? seeds : seeds.filter((s) => "test" in activeBucket && activeBucket.test(s.readSeconds)),
    [seeds, activeBucket],
  );
  const rabbitHole = useMemo(() => visibleSeeds.slice(0, 9), [visibleSeeds]);

  const another = () => {
    if (seeds.length < 2) return;
    let next = Math.floor(Math.random() * seeds.length);
    while (next === spotlightIdx) next = Math.floor(Math.random() * seeds.length);
    setSpotlightIdx(next);
  };

  return (
    <main className={`wd${reduced ? " wd-reduced" : ""}`}>
      <style>{CSS}</style>

      <nav className="wd-nav">
        <Link href="/" className="wd-brand">Living Page<span>✳</span></Link>
        <div className="wd-nav-right">
          <span className="wd-nav-context">a place to get lost</span>
          <Link href="/make" className="wd-make">Make a page ↗</Link>
        </div>
      </nav>

      {seeds.length === 0 ? (
        <section className="wd-empty">
          <p className="wd-kicker">The room is quiet.</p>
          <h1>Nothing here yet.</h1>
          <Link href="/make" className="wd-button wd-button-dark">Make the first one ↗</Link>
        </section>
      ) : (
        <>
          {/* 01 — deliberately quiet. Give the reader one clear invitation. */}
          <header className="wd-intro">
            <div className="wd-intro-number">01 / WANDER</div>
            <h1>Go somewhere<br /><em>unexpected.</em></h1>
            <p className="wd-intro-sub">Little pieces of other people&rsquo;s lives.<br />No itinerary required.</p>
            <div className="wd-intro-note">scroll slowly ↓</div>
          </header>

          {/* 02 — first piece of visual noise, but one story remains dominant. */}
          {spotlight ? (
            <Reveal as="section" className="wd-feature-wrap">
              <div className="wd-feature-label"><span>02</span><span>start here if you like</span></div>
              <article className="wd-feature" style={{ ["--accent" as string]: spotlight.accent }}>
                <div className="wd-feature-orbit" aria-hidden="true"><Doodle name={doodleOf(spotlight.id)} seed={hash(spotlight.id)} size={120} ink="var(--accent)" /></div>
                <div className="wd-feature-copy">
                  <StoryMeta story={spotlight} />
                  <h2>{spotlight.fragment}</h2>
                  <ReadLink href={`/@${spotlight.handle}/${spotlight.slug}`} className="wd-read-link">Read this one <span>→</span></ReadLink>
                </div>
                <button type="button" className="wd-another" onClick={another} disabled={seeds.length < 2} aria-label="Show another story">
                  <span>not this one?</span><strong>another ↗</strong>
                </button>
              </article>
            </Reveal>
          ) : null}

          {/* 03 — reader control appears only after the first story. */}
          <Reveal as="section" className="wd-lens">
            <div className="wd-section-mark">03</div>
            <div>
              <p className="wd-lens-title">How much time have you got?</p>
              <div className="wd-time-row" role="group" aria-label="Filter stories by reading time">
                {TIME_BUCKETS.map((b) => (
                  <button key={b.key} type="button" className={`wd-time-pill${bucket === b.key ? " is-active" : ""}`} onClick={() => setBucket(b.key)}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="wd-lens-count"><strong>{visibleSeeds.length}</strong><span>pieces<br />to wander into</span></div>
          </Reveal>

          {/* 04 — editorial river. Still calm, but rhythm and scale start changing. */}
          <section className="wd-river">
            <div className="wd-river-heading">
              <span>04</span>
              <h2>Keep going.</h2>
              <p>There is no correct order.</p>
            </div>

            {visibleSeeds.length === 0 ? (
              <p className="wd-empty-inline">Nothing in that time window yet. Try another.</p>
            ) : (
              visibleSeeds.map((story, i) => {
                const mode = i % 5;
                return (
                  <Reveal key={story.id} as="article" className={`wd-story wd-story-${mode}`}>
                    <ReadLink href={`/@${story.handle}/${story.slug}`} className="wd-story-link" style={{ ["--accent" as string]: story.accent } as React.CSSProperties}>
                      <span className="wd-story-index">{String(i + 1).padStart(2, "0")}</span>
                      <span className="wd-story-body">
                        <StoryMeta story={story} quiet />
                        <span className="wd-story-fragment">{story.fragment}</span>
                        <span className="wd-story-action">read →</span>
                      </span>
                      <span className="wd-story-doodle" aria-hidden="true"><Doodle name={doodleOf(story.id)} seed={hash(story.id)} size={mode === 1 ? 72 : 48} ink="var(--accent)" /></span>
                    </ReadLink>
                  </Reveal>
                );
              })
            )}
          </section>

          {/* 05 — the page deliberately becomes stranger here. */}
          {rabbitHole.length > 0 ? (
            <Reveal as="section" className="wd-rabbit">
              <div className="wd-rabbit-title">
                <span className="wd-section-mark">05</span>
                <p>One thing<br /><em>leads to another.</em></p>
                <span className="wd-rabbit-arrow">↘</span>
              </div>
              <div className="wd-rabbit-cloud">
                {rabbitHole.map((story, i) => (
                  <ReadLink
                    key={story.id}
                    href={`/@${story.handle}/${story.slug}`}
                    className={`wd-rabbit-node wd-rabbit-node-${i}`}
                    style={{ ["--accent" as string]: story.accent } as React.CSSProperties}
                  >
                    <span className="wd-node-mark">{i % 3 === 0 ? "✳" : i % 3 === 1 ? "○" : "✦"}</span>
                    <span className="wd-node-text">{story.fragment}</span>
                    <StoryMeta story={story} quiet />
                  </ReadLink>
                ))}
              </div>
              <p className="wd-rabbit-foot">You came for one story. You may leave with five.</p>
            </Reveal>
          ) : null}

          {/* 06 — a visual reset after maximalism. */}
          <Reveal as="section" className="wd-reset">
            <span className="wd-section-mark">06</span>
            <p>That&rsquo;s enough wandering<br /><em>for now.</em></p>
            <Link href="/" className="wd-reset-link">Back to Living Page ↗</Link>
          </Reveal>

          <footer className="wd-foot">
            <span>Living Page</span>
            <Link href="/make">Make something worth wandering into ↗</Link>
          </footer>
        </>
      )}
    </main>
  );
}

export default WanderCanvas;

const CSS = `
.wd{
  --paper:#FBF6EC; --white:#FFFDF8; --ink:#181714; --soft:#625D55; --mute:#9A9287; --line:#DDD4C5;
  --blue:#2D6BF0; --f-disp:var(--font-disp),Georgia,serif; --f-body:var(--font-body),Georgia,serif;
  --f-hand:var(--font-hand),cursive; --f-mono:var(--font-mono),ui-monospace,monospace;
  min-height:100vh; background:var(--paper); color:var(--ink); font-family:var(--f-body); overflow:hidden;
}
.wd *{box-sizing:border-box}.wd a{color:inherit;text-decoration:none}.wd button{font:inherit}.wd button:focus-visible,.wd a:focus-visible{outline:2px solid var(--blue);outline-offset:4px}
.wd-nav{height:76px;padding:0 max(24px,4vw);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);position:relative;z-index:10}
.wd-brand{font-family:var(--f-hand);font-size:1.35rem}.wd-brand span{font-family:var(--f-body);font-size:.8rem;margin-left:.3rem}.wd-nav-right{display:flex;align-items:center;gap:1.4rem}.wd-nav-context{font-family:var(--f-mono);font-size:.63rem;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.wd-make{font-family:var(--f-mono);font-size:.67rem;letter-spacing:.07em;text-transform:uppercase;background:var(--ink);color:var(--paper)!important;border-radius:99px;padding:.6rem .9rem}.wd-make:hover{background:var(--blue)}
.wd-intro{min-height:calc(100vh - 76px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:10vh 24px 15vh;position:relative}
.wd-intro-number,.wd-section-mark{font-family:var(--f-mono);font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}
.wd-intro h1{font-family:var(--f-disp);font-weight:400;font-size:clamp(4rem,10vw,8.8rem);line-height:.9;letter-spacing:-.055em;margin:1.8rem 0 1.5rem}.wd-intro h1 em{font-weight:400;color:var(--blue)}
.wd-intro-sub{font-family:var(--f-hand);font-size:1.35rem;line-height:1.35;color:var(--soft);margin:0}.wd-intro-note{position:absolute;bottom:5vh;font-family:var(--f-mono);font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);animation:wd-bob 2.4s ease-in-out infinite}.wd-reduced .wd-intro-note{animation:none}@keyframes wd-bob{50%{transform:translateY(5px)}}
.wd-reveal{opacity:0;transform:translateY(28px);transition:opacity .85s cubic-bezier(.2,.7,.25,1),transform .85s cubic-bezier(.2,.7,.25,1)}.wd-reveal.is-visible{opacity:1;transform:none}.wd-reduced .wd-reveal{opacity:1;transform:none;transition:none}
.wd-feature-wrap{max-width:1080px;margin:0 auto;padding:5vh max(24px,5vw) 12vh}.wd-feature-label{display:flex;justify-content:space-between;font-family:var(--f-mono);font-size:.62rem;letter-spacing:.11em;text-transform:uppercase;color:var(--mute);margin-bottom:1rem}.wd-feature{min-height:520px;background:var(--white);border:1px solid var(--line);border-radius:4px;position:relative;overflow:hidden;padding:clamp(2rem,6vw,5rem);display:flex;align-items:center;box-shadow:0 20px 70px rgba(24,23,20,.06)}
.wd-feature:before{content:"";position:absolute;left:0;top:0;width:9px;height:100%;background:var(--accent,var(--blue))}.wd-feature-copy{max-width:720px;position:relative;z-index:2}.wd-meta{display:flex;gap:.5rem;align-items:center;font-family:var(--f-mono);font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in oklab,var(--accent,var(--blue)) 68%,var(--ink));line-height:1.4}.wd-meta i{font-style:normal;color:var(--line)}.wd-feature h2{font-family:var(--f-disp);font-weight:400;font-size:clamp(2.5rem,6vw,5.2rem);line-height:1;letter-spacing:-.04em;max-width:760px;margin:1.4rem 0 2.2rem}.wd-read-link{font-family:var(--f-mono);font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid var(--ink);padding-bottom:.35rem}.wd-read-link span{margin-left:.4rem;color:var(--accent,var(--blue))}.wd-read-link:hover{color:var(--accent,var(--blue));border-color:var(--accent,var(--blue))}
.wd-feature-orbit{position:absolute;right:6%;top:12%;opacity:.35;transform:rotate(-9deg)}.wd-another{position:absolute;right:2rem;bottom:1.8rem;border:0;background:none;text-align:right;color:var(--soft);cursor:pointer}.wd-another span,.wd-another strong{display:block}.wd-another span{font-family:var(--f-hand);font-size:1rem}.wd-another strong{font-family:var(--f-mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;font-weight:400}.wd-another:hover{color:var(--accent,var(--blue))}.wd-another:disabled{opacity:.3}
.wd-lens{max-width:1080px;margin:0 auto;padding:3vh max(24px,5vw) 11vh;display:grid;grid-template-columns:70px 1fr auto;gap:1.5rem;align-items:end;border-top:1px solid var(--line)}.wd-lens-title{font-family:var(--f-disp);font-size:2rem;margin:0 0 1rem;letter-spacing:-.025em}.wd-time-row{display:flex;gap:.45rem;flex-wrap:wrap}.wd-time-pill{border:1px solid var(--line);background:transparent;border-radius:99px;padding:.55rem .85rem;color:var(--soft);font-family:var(--f-mono);font-size:.61rem;letter-spacing:.06em;cursor:pointer}.wd-time-pill:hover{border-color:var(--ink)}.wd-time-pill.is-active{background:var(--ink);border-color:var(--ink);color:var(--paper)}.wd-lens-count{display:flex;align-items:baseline;gap:.55rem}.wd-lens-count strong{font-family:var(--f-disp);font-size:3.2rem;font-weight:400;line-height:1}.wd-lens-count span{font-family:var(--f-mono);font-size:.58rem;line-height:1.2;text-transform:uppercase;letter-spacing:.06em;color:var(--mute)}
.wd-river{max-width:1120px;margin:0 auto;padding:0 max(24px,5vw) 14vh}.wd-river-heading{display:grid;grid-template-columns:70px 1fr auto;align-items:end;gap:1.5rem;margin-bottom:3rem}.wd-river-heading h2{font-family:var(--f-disp);font-size:clamp(3rem,6vw,5rem);font-weight:400;letter-spacing:-.045em;line-height:.9;margin:0}.wd-river-heading p{font-family:var(--f-hand);font-size:1.1rem;color:var(--soft);margin:0 0 .2rem}
.wd-story{margin-bottom:1.1rem}.wd-story-link{min-height:180px;border-top:1px solid var(--line);display:grid;grid-template-columns:70px 1fr 130px;gap:1.5rem;align-items:center;padding:2rem 1rem;position:relative;transition:padding .3s ease,background .3s ease}.wd-story-link:hover{background:var(--white);padding-left:1.7rem;padding-right:1.7rem}.wd-story-index{font-family:var(--f-mono);font-size:.62rem;color:var(--mute)}.wd-story-body{max-width:800px}.wd-story-fragment{display:block;font-family:var(--f-disp);font-size:clamp(1.7rem,3.4vw,3.25rem);line-height:1.03;letter-spacing:-.035em;margin-top:.65rem}.wd-story-action{display:block;font-family:var(--f-mono);font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;color:var(--accent,var(--blue));margin-top:1rem;opacity:0;transform:translateX(-5px);transition:.2s}.wd-story-link:hover .wd-story-action,.wd-story-link:focus-visible .wd-story-action{opacity:1;transform:none}.wd-story-doodle{justify-self:center;opacity:.6;transition:transform .35s ease}.wd-story-link:hover .wd-story-doodle{transform:rotate(8deg) scale(1.1)}.wd-story-1 .wd-story-link{padding-top:3.5rem;padding-bottom:3.5rem}.wd-story-1 .wd-story-fragment{font-size:clamp(2.2rem,5vw,4.6rem)}.wd-story-2 .wd-story-link{margin-left:8%;width:92%}.wd-story-3 .wd-story-link{margin-left:3%;width:97%}.wd-story-4 .wd-story-link{border-top:0;background:var(--white);border:1px solid var(--line);padding:2.2rem;border-radius:2px}.wd-story-4 .wd-story-fragment{font-size:clamp(1.5rem,2.8vw,2.5rem)}.wd-empty-inline{font-family:var(--f-hand);font-size:1.2rem;color:var(--mute);padding:3rem 0}
/* The rabbit hole is intentionally the maximalist climax. */
.wd-rabbit{max-width:1240px;margin:0 auto;padding:8vh max(24px,3vw) 16vh;position:relative}.wd-rabbit:before{content:"";position:absolute;inset:0 3vw;background:var(--ink);transform:rotate(-1.1deg);z-index:0}.wd-rabbit-title,.wd-rabbit-cloud,.wd-rabbit-foot{position:relative;z-index:1}.wd-rabbit-title{min-height:230px;padding:3rem 4rem;color:var(--paper);display:flex;align-items:center;gap:2rem;position:relative}.wd-rabbit-title .wd-section-mark{color:#817A70;align-self:flex-start}.wd-rabbit-title p{font-family:var(--f-disp);font-size:clamp(3rem,7vw,7rem);line-height:.8;letter-spacing:-.055em;margin:0}.wd-rabbit-title em{color:#A9C2FF;font-weight:400}.wd-rabbit-arrow{font-size:5rem;color:#A9C2FF;margin-left:auto;transform:rotate(12deg)}
.wd-rabbit-cloud{min-height:690px;position:relative;margin:0 3rem;padding-bottom:5rem}.wd-rabbit-node{position:absolute;width:min(300px,28vw);padding:1.2rem 1.3rem;background:var(--paper);color:var(--ink);border:1px solid #3b3935;box-shadow:8px 10px 0 var(--accent,var(--blue));transform:rotate(var(--rot,0deg));transition:transform .3s ease,box-shadow .3s ease,z-index .1s}.wd-rabbit-node:hover{transform:rotate(0) translateY(-8px) scale(1.03);box-shadow:13px 16px 0 var(--accent,var(--blue));z-index:20}.wd-rabbit-node-0{left:2%;top:8%;--rot:-4deg}.wd-rabbit-node-1{left:31%;top:2%;--rot:3deg}.wd-rabbit-node-2{right:2%;top:13%;--rot:-2deg}.wd-rabbit-node-3{left:12%;top:43%;--rot:2deg}.wd-rabbit-node-4{left:43%;top:37%;--rot:-3deg}.wd-rabbit-node-5{right:7%;top:48%;--rot:4deg}.wd-rabbit-node-6{left:0;top:72%;--rot:3deg}.wd-rabbit-node-7{left:35%;top:70%;--rot:-4deg}.wd-rabbit-node-8{right:0;top:76%;--rot:2deg}.wd-node-mark{font-size:1.5rem;color:var(--accent,var(--blue));display:block;margin-bottom:1.2rem}.wd-node-text{display:block;font-family:var(--f-disp);font-size:1.45rem;line-height:1.05;letter-spacing:-.025em}.wd-rabbit-node .wd-meta{margin-top:1.2rem;color:var(--mute);font-size:.52rem}.wd-rabbit-foot{text-align:center;color:#817A70;font-family:var(--f-hand);font-size:1.2rem;margin:1rem 0 0}.wd-reset{text-align:center;padding:17vh 24px 18vh;position:relative}.wd-reset .wd-section-mark{display:block;margin-bottom:2rem}.wd-reset p{font-family:var(--f-disp);font-size:clamp(3rem,7vw,7rem);line-height:.82;letter-spacing:-.055em;margin:0}.wd-reset em{font-weight:400;color:var(--blue)}.wd-reset-link{display:inline-block;margin-top:2.5rem;font-family:var(--f-mono);font-size:.62rem;text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid var(--ink);padding-bottom:.3rem}.wd-reset-link:hover{color:var(--blue);border-color:var(--blue)}
.wd-foot{border-top:1px solid var(--line);padding:2rem max(24px,4vw);display:flex;justify-content:space-between;gap:1rem;font-family:var(--f-mono);font-size:.58rem;letter-spacing:.07em;text-transform:uppercase;color:var(--mute)}.wd-foot a:hover{color:var(--blue)}
.wd-empty{min-height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.wd-empty .wd-kicker{font-family:var(--f-mono);font-size:.65rem;text-transform:uppercase;color:var(--mute)}.wd-empty h1{font-family:var(--f-disp);font-weight:400;font-size:4rem;margin:1rem 0 2rem}.wd-button{font-family:var(--f-mono);font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;padding:.8rem 1rem;border-radius:99px}.wd-button-dark{background:var(--ink);color:var(--paper)}
@media (max-width:760px){
  .wd-nav{height:64px}.wd-nav-context{display:none}.wd-intro{min-height:78vh;padding-top:8vh}.wd-intro h1{font-size:clamp(3.6rem,18vw,6rem)}
  .wd-feature{min-height:440px;padding:2.2rem 1.6rem}.wd-feature-orbit{right:-5%;top:6%;opacity:.25}.wd-feature h2{font-size:clamp(2.2rem,11vw,4rem);max-width:95%}.wd-another{right:1.2rem;bottom:1.2rem}
  .wd-lens{grid-template-columns:1fr;gap:.8rem}.wd-lens-count{margin-top:.8rem}.wd-lens-count strong{font-size:2.5rem}.wd-river-heading{grid-template-columns:40px 1fr;gap:.7rem}.wd-river-heading p{grid-column:2}.wd-story-link,.wd-story-1 .wd-story-link{grid-template-columns:36px 1fr;min-height:0;padding:1.7rem .2rem}.wd-story-doodle{display:none}.wd-story-action{opacity:1;transform:none}.wd-story-2 .wd-story-link,.wd-story-3 .wd-story-link{margin-left:0;width:100%}.wd-story-4 .wd-story-link{padding:1.5rem}
  .wd-rabbit{padding-left:0;padding-right:0}.wd-rabbit:before{inset:0}.wd-rabbit-title{padding:2.5rem 1.5rem;min-height:190px}.wd-rabbit-title p{font-size:clamp(3rem,13vw,5rem)}.wd-rabbit-arrow{font-size:3rem}.wd-rabbit-cloud{min-height:0;margin:0;padding:2rem 1.5rem 5rem;display:flex;flex-direction:column;gap:1.4rem}.wd-rabbit-node{position:relative!important;inset:auto!important;width:88%;transform:none!important;margin:0}.wd-rabbit-node:nth-child(even){margin-left:auto}.wd-rabbit-node:hover{transform:translateY(-5px)!important}.wd-foot{flex-direction:column}.wd-section-mark{font-size:.58rem}
}
@media (prefers-reduced-motion:reduce){.wd-intro-note{animation:none}.wd-story-link,.wd-story-action,.wd-story-doodle,.wd-rabbit-node{transition:none}}
`;
