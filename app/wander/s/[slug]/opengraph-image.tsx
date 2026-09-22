import { ImageResponse } from "next/og";
import { sampleBySlug } from "@/lib/wander-samples";
import { ShareFrame, FallbackFrame, OG_SIZE } from "@/lib/og-render";
import { buildComposition, shareHost } from "@/lib/share-render";
import { loadShareFonts, availableFamilies } from "@/lib/og-fonts";

/** Seed stories get a real share artifact too — see `page.tsx` here for
 *  why they stay `noindex`: a good share card and search exclusion are
 *  not in tension. */
export const runtime = "nodejs";
export const alt = "A story on Living Page";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = sampleBySlug(slug);
  const fonts = await loadShareFonts();
  if (!story) return new ImageResponse(<FallbackFrame canvas="og" />, { ...size, fonts });

  const families = availableFamilies(fonts);
  const { composition, environmentKey, mood } = buildComposition(story);
  return new ImageResponse(
    <ShareFrame
      composition={composition}
      environmentKey={environmentKey}
      authorHandle={null}
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
