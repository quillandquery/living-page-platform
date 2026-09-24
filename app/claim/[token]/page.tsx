import Link from "next/link";
import type { Metadata } from "next";
import { StoryStage } from "@/components/living/StoryStage";
import { resolveFormat, curatedFormats } from "@/lib/formats";
import { getPendingClaim } from "@/lib/claim";

/**
 * `/claim/[token]` — a story that isn't anyone's yet.
 *
 * Reached only by an unguessable link (lib/claim.ts), never linked to from
 * anywhere on the site itself, never in the feed, never indexed. It renders
 * through the exact same StoryStage the real reader page uses — whoever
 * opens this sees their own words exactly as they'll look once the piece
 * is really theirs — with one quiet way out of "seen" and into "owned".
 */

export const metadata: Metadata = {
  title: "A page for you — Living Page",
  robots: { index: false, follow: false },
};

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; as?: string }>;
}) {
  const { token } = await params;
  const { error, as } = await searchParams;
  const story = await getPendingClaim(token);

  if (!story) {
    return (
      <main className="claim-gone">
        <style>{GONE_CSS}</style>
        <div className="claim-gone-card">
          <p className="claim-gone-kicker">Living Page</p>
          <h1>{error === "expired" ? "That link has already been used." : "This link isn&rsquo;t live."}</h1>
          <p>Either it&rsquo;s already been claimed, it was revoked, or the address is off. If someone sent this expecting a story of theirs to be waiting, ask them for a fresh link.</p>
          <Link href="/" className="claim-gone-back">living page →</Link>
        </div>
      </main>
    );
  }

  const format = resolveFormat(as, story.blocks, {
    authorDefault: story.art_direction?.format,
    look: story.art_direction?.look,
  });
  const curated = curatedFormats(story.blocks, story.art_direction?.atmosphere?.mood);
  const fitting = Array.from(new Set([format, ...curated]));
  const basePath = `/claim/${token}`;
  const finishPath = `/claim/${token}/finish`;

  return (
    <>
      <style>{CLAIM_CSS}</style>
      <StoryStage
        format={format}
        formats={fitting}
        basePath={basePath}
        place={story.place}
        date={story.date}
        fragment={story.fragment}
        accent={story.accent}
        backdrop={story.backdrop}
        veil={story.veil}
        blocks={story.blocks}
        seed={story.id}
        artDirection={story.art_direction}
      />
      <div className="claim-cta">
        <div className="claim-cta-pill">
          <Link href={`/signup?next=${encodeURIComponent(finishPath)}`} className="claim-cta-claim">
            this is yours — claim it
          </Link>
          <Link href={`/login?next=${encodeURIComponent(finishPath)}`} className="claim-cta-login">
            already write here? log in
          </Link>
        </div>
      </div>
    </>
  );
}

const CLAIM_CSS = `
.claim-cta{ position:fixed; left:0; right:0; bottom:1.4rem; display:flex; justify-content:center; z-index:60; pointer-events:none; }
.claim-cta-pill{ pointer-events:auto; display:flex; align-items:center; gap:.7rem; background:rgba(20,18,16,.74); -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px); border-radius:999px; padding:.5rem .7rem .5rem 1.1rem; box-shadow:0 6px 24px rgba(0,0,0,.18); }
.claim-cta-claim{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.72rem; letter-spacing:.05em; text-transform:uppercase; color:#14161B; background:#fff; border-radius:999px; padding:.55rem 1.15rem; text-decoration:none; white-space:nowrap; }
.claim-cta-claim:hover{ filter:brightness(.96); }
.claim-cta-login{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.62rem; letter-spacing:.03em; color:rgba(255,255,255,.8); text-decoration:underline; white-space:nowrap; }
@media (max-width:520px){ .claim-cta-pill{ flex-direction:column; align-items:stretch; gap:.5rem; padding:.7rem; } .claim-cta-claim, .claim-cta-login{ text-align:center; } }
`;

const GONE_CSS = `
.claim-gone{ min-height:100vh; display:flex; align-items:center; justify-content:center; background:#FBF6EC; color:#1A1816; padding:2rem; font-family:Georgia,serif; }
.claim-gone-card{ max-width:26rem; text-align:center; }
.claim-gone-kicker{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.68rem; letter-spacing:.1em; text-transform:uppercase; color:#8A837A; margin:0 0 1.2rem; }
.claim-gone-card h1{ font-size:1.6rem; line-height:1.3; margin:0 0 .8rem; }
.claim-gone-card p{ color:#4A4642; line-height:1.6; margin:0 0 1.6rem; }
.claim-gone-back{ font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.7rem; letter-spacing:.06em; text-transform:uppercase; color:#2D6BF0; text-decoration:none; }
`;
