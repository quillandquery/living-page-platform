import { StoryStage } from "@/components/living/StoryStage";
import { extractStoryProfile } from "@/lib/semantic-profile";
import { generateArtDirection } from "@/lib/art-direction/generate";
import { isFormatKey, fittingFormats, resolveFormat } from "@/lib/formats";
import type { LookKey } from "@/lib/art-direction/looks";
import { annotate, toBlocks } from "@/lib/annotate";

/**
 * PUBLIC PREVIEW — the same sample story, switchable between formats, on one
 * live URL with no login (the studio is auth-gated). Temporary: delete once
 * the format system is signed off. `/looks?as=scrapbook`, `?look=postcard`.
 */
const SAMPLE = `A lot of solo travel is a bad day with a good view.

There are more bad days than good ones, and they're all happening somewhere that's never heard of you.

If you're crying, you're crying alone in your room. Or muffled in a dorm with five other people.

The bus left at dawn and I watched the city give way to fields, then to nothing, then to the sea.

I bought a ticket I couldn't read and got off at a stop that smelled like salt.

A stranger shared her umbrella and said nothing the whole way.

I thought I wanted to leave. Turns out I just wanted someone to ask me to stay.`;

export default async function LooksPreview(
  { searchParams }: { searchParams: Promise<{ as?: string; look?: string; seed?: string }> },
) {
  const { as, look, seed: seedRaw } = await searchParams;
  const seed = Number(seedRaw) || 7;
  const lookOverride = isFormatKey(look) ? undefined : (look as LookKey | undefined);

  const profile = extractStoryProfile(SAMPLE);
  const ad = generateArtDirection(SAMPLE, profile, { lookOverride, seed });
  const blocks = toBlocks(annotate(SAMPLE, { doodleDensity: 6, voiceBudget: 0.4, seed }));

  const fitting = fittingFormats(blocks);
  const format = resolveFormat(as, blocks, { look: ad.look });
  const qs = look ? `?look=${look}` : "";

  return (
    <StoryStage
      format={format}
      formats={fitting}
      basePath={`/looks${qs}`}
      place="Somewhere"
      date=""
      fragment="a bad day with a good view"
      accent={ad.accent}
      backdrop={ad.environment.key}
      veil={false}
      blocks={blocks}
      chrome
      artDirection={ad}
      seed="looks-preview"
    />
  );
}
