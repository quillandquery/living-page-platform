import { ImageResponse } from "next/og";
import { publishedStory } from "@/lib/db";
import { ShareFrame, FallbackFrame, OG_SIZE } from "@/lib/og-render";
import { buildComposition, shareHost } from "@/lib/share-render";
import { loadShareFonts, availableFamilies } from "@/lib/og-fonts";
import { isPrivate } from "@/lib/visibility";

export const runtime = "nodejs";
export const alt = "A story on Living Page";
export const size = OG_SIZE;
export const contentType = "image/png";

const clean = (h: string) => decodeURIComponent(h).replace(/^@/, "").toLowerCase();

// The OG image is crawled and cached once by each platform — it has no
// per-viewer reaction to carry, unlike the Instagram assets below, which
// a reader generates fresh at the moment they choose to share.
export default async function Image({ params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const story = await publishedStory(clean(handle), slug);
  const fonts = await loadShareFonts();
  // A private story never gets a card — and never renders its words into an
  // image response that a CDN or crawler could cache. Same generic frame as a
  // story that doesn't exist.
  if (!story || isPrivate(story)) return new ImageResponse(<FallbackFrame canvas="og" />, { ...size, fonts });

  const families = availableFamilies(fonts);
  const { composition, environmentKey, mood } = buildComposition(story);
  return new ImageResponse(
    <ShareFrame
      composition={composition}
      environmentKey={environmentKey}
      authorHandle={`@${story.author.handle}`}
      mood={mood}
      host={shareHost()}
      canvas="og"
      hasDisplay={families.has("Instrument Serif")}
      hasBody={families.has("Newsreader")}
      hasHand={families.has("Caveat")}
      hasMono={families.has("Space Mono")}
    />,
    { ...size, fonts },
  );
}
