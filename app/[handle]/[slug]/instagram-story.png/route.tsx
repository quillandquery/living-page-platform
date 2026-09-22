import { ImageResponse } from "next/og";
import { publishedStory } from "@/lib/db";
import { ShareFrame, FallbackFrame, IG_STORY_SIZE } from "@/lib/og-render";
import { buildComposition, shareHost } from "@/lib/share-render";
import { loadShareFonts, availableFamilies } from "@/lib/og-fonts";

export const runtime = "nodejs";
export const revalidate = 3600;

const clean = (h: string) => decodeURIComponent(h).replace(/^@/, "").toLowerCase();

export async function GET(req: Request, { params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const story = await publishedStory(clean(handle), slug);
  const fonts = await loadShareFonts();
  if (!story) return new ImageResponse(<FallbackFrame canvas="story" />, { ...IG_STORY_SIZE, fonts });

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
      canvas="story"
      hasDisplay={families.has("Instrument Serif")}
      hasBody={families.has("Newsreader")}
      hasHand={families.has("Caveat")}
      hasMono={families.has("Space Mono")}
    />,
    { ...IG_STORY_SIZE, fonts },
  );
}
