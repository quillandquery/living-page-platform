"use client";

/**
 * THE LIVING READER (D9) — the published-story reader on the worlds system.
 *
 * Casts the story's own words into its world (`lib/living/cast.ts`), honouring a
 * writer-pinned world or auto-choosing one, and dispatches to the bespoke rich
 * worlds (noir / coast-storm) or the generic `LivingStory`. Below the page sit
 * the pieces the old reader carried and we keep: share, and the "read next"
 * rabbit hole — rendered in a solid footer so they stay legible over the world's
 * fixed background.
 */

import { useMemo } from "react";
import Link from "next/link";
import { LivingStory } from "@/components/living/LivingStory";
import { NoirRoom } from "@/components/living/scenes/NoirRoom";
import { CoastStorm } from "@/components/living/scenes/CoastStorm";
import { LivingExperience } from "@/components/living/LivingExperience";
import { castLivingScene, coastStormInput, noirRoomInput, RICH_WORLDS } from "@/lib/living/cast";
import { WORLDS, type WorldKey } from "@/lib/living/worlds";
import type { ExperienceSpec } from "@/lib/living/experience";
import { ShareControls, type ShareControlsProps } from "@/components/living/ShareControls";

export type ReadNextLink = { handle: string; slug: string; place: string; fragment: string } | null;
export type LivingReaderProps = {
  source: string;
  world: string | null;
  title?: string;
  eyebrow?: string;
  experience?: ExperienceSpec | null;
  bespokeHtml?: string | null;
  share: ShareControlsProps;
  more: { same: ReadNextLink; surprise: ReadNextLink };
};

export function LivingReader({ source, world, title, eyebrow, experience, bespokeHtml, share, more }: LivingReaderProps) {
  const scene = useMemo(
    () => castLivingScene(source, {
      title: title || undefined,
      eyebrow: eyebrow || undefined,
      world: world && world in WORLDS ? (world as WorldKey) : undefined,
    }),
    [source, title, eyebrow, world],
  );

  // The brain composed this story's bespoke living experience at publish time —
  // render it (the primary path). Older stories with no saved spec fall back to
  // the heuristic worlds (never a blank page — D4 preserve-data).
  const page = bespokeHtml
    ? <iframe title="living page" sandbox="allow-scripts" srcDoc={bespokeHtml} style={{ width: "100%", height: "100vh", border: 0, display: "block", background: "#0a0912" }} />
    : experience
    ? <LivingExperience text={source} spec={experience} title={title || undefined} eyebrow={eyebrow || undefined} dek={scene.dek} />
    : scene.world.key === "noir-room" ? <NoirRoom {...noirRoomInput(scene)} />
    : RICH_WORLDS.has(scene.world.key) ? <CoastStorm {...coastStormInput(scene)} />
    : <LivingStory scene={scene} />;

  const links = [more.same, more.surprise].filter((l): l is NonNullable<ReadNextLink> => Boolean(l));

  return (
    <>
      {page}
      <footer className="lr-foot" data-scheme={experience ? experience.scheme : scene.world.scheme}>
        <div className="lr-foot-in">
          <ShareControls {...share} />
          {links.length ? (
            <div className="lr-next">
              <p className="lr-next-h">Read next</p>
              <div className="lr-next-row">
                {links.map((l, i) => (
                  <Link key={i} href={`/@${l.handle}/${l.slug}`} className="lr-next-card">
                    <span className="lr-next-place">{l.place || "A living page"}</span>
                    <span className="lr-next-frag">{l.fragment}</span>
                    <span className="lr-next-go">{i === 0 ? "this reminded me of…" : "surprise me"} →</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </footer>
      <style>{CSS}</style>
    </>
  );
}
export default LivingReader;

const CSS = `
.lr-foot{ position:relative; z-index:2; border-top:1px solid rgba(0,0,0,.08); background:#FBF6EC; color:#1A1816; }
.lr-foot[data-scheme="dark"]{ background:#0b0d12; color:#E7E8EC; border-top-color:rgba(255,255,255,.08); }
.lr-foot-in{ max-width:36rem; margin:0 auto; padding:8vh 1.7rem 12vh; display:flex; flex-direction:column; gap:3rem; }
.lr-next-h{ font-family:var(--f-mono,"Space Mono",monospace); font-size:.64rem; letter-spacing:.3em; text-transform:uppercase; opacity:.5; margin:0 0 1rem; }
.lr-next-row{ display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
.lr-next-card{ display:flex; flex-direction:column; gap:.4rem; padding:1.2rem; border:1px solid rgba(0,0,0,.1); border-radius:14px; text-decoration:none; color:inherit; transition:border-color .2s, transform .2s; }
.lr-foot[data-scheme="dark"] .lr-next-card{ border-color:rgba(255,255,255,.12); }
.lr-next-card:hover{ transform:translateY(-2px); border-color:currentColor; }
.lr-next-place{ font-family:var(--f-mono,"Space Mono",monospace); font-size:.6rem; letter-spacing:.18em; text-transform:uppercase; opacity:.55; }
.lr-next-frag{ font-family:var(--f-disp,"Instrument Serif",Georgia,serif); font-size:1.15rem; line-height:1.25; }
.lr-next-go{ font-family:var(--f-mono,"Space Mono",monospace); font-size:.62rem; letter-spacing:.06em; opacity:.6; margin-top:.3rem; }
@media (max-width:560px){ .lr-next-row{ grid-template-columns:1fr; } }
`;
