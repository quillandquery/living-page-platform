import { ImageResponse } from "next/og";
import { publishedStory } from "@/lib/db";
import { ShareFrame, FallbackFrame, IG_FEED_SIZE } from "@/lib/og-render";
import { buildComposition, shareHost } from "@/lib/share-render";
import { loadShareFonts, availableFamilies } from "@/lib/og-fonts";

export const runtime = "nodejs";
export const revalidate = 3600;

const clean = (h: string) => decodeURIComponent(h).replace(/^@/, "").toLowerCase();

export async function GET(req: Request, { params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const story = await publishedStory(clean(handle), slug);
  const fonts = await loadShareFonts();
  if (!story) return new ImageResponse(<FallbackFrame canvas="feed" />, { ...IG_FEED_SIZE, fonts });

  // `?r=` — a reader's one-tap reaction, baked on only for the asset
  // they're about to share, generated fresh at share time (never cached
  // per-story the way the OG crawler image is).
  const reaction = new URL(req.url).searchParams.get("r");
  const families = availableFamilies(fonts);
  const { composition, environmentKey, mood } = buildComposition(story, reaction);
  return new ImageResponse(
    <ShareFrame
      composition={composition}
      environmentKey={environmentKey}
      authorHandle={`@${story.author.handle}`}
      mood={mood}
      host={shareHost()}
      canvas="feed"
      hasDisplay={families.has("Instrument Serif")}
      hasBody={families.has("Newsreader")}
      hasHand={families.has("Caveat")}
      hasMono={families.has("Space Mono")}
    />,
    { ...IG_FEED_SIZE, fonts },
  );
}
