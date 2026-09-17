import { StoryView } from "@/components/living/StoryView";
import { extractStoryProfile } from "@/lib/semantic-profile";
import { generateArtDirection } from "@/lib/art-direction/generate";
import { LOOK_KEYS, LOOKS, type LookKey } from "@/lib/art-direction/looks";
import { annotate, toBlocks } from "@/lib/annotate";

/**
 * PUBLIC LOOKS PREVIEW — the same sample story rendered through each Look,
 * so the whole visual range is visible on one live URL (the dev preview is
 * gated to non-production). Temporary: safe to delete once the Look system
 * is signed off. `/looks?look=eighties` etc.
 */
const SAMPLE = `A lot of solo travel is a bad day with a good view.

There are more bad days than good ones, and they're all happening somewhere that's never heard of you.

If you're crying, you're crying alone in your room. Or muffled in a dorm with five other people.

The bus left at dawn and I watched the city give way to fields, then to nothing, then to the sea.

I thought I wanted to leave. Turns out I just wanted someone to ask me to stay.`;

export default async function LooksPreview(
  { searchParams }: { searchParams: Promise<{ look?: string }> },
) {
  const { look } = await searchParams;
  const active: LookKey = (LOOK_KEYS as string[]).includes(look ?? "")
    ? (look as LookKey) : "minimal";

  const profile = extractStoryProfile(SAMPLE);
  const ad = generateArtDirection(SAMPLE, profile, { lookOverride: active, seed: 7 });
  const blocks = toBlocks(annotate(SAMPLE, { doodleDensity: 6, voiceBudget: 0.4, seed: 7 }));

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        display: "flex", gap: 0, justifyContent: "center",
        background: "rgba(10,10,12,.82)", padding: ".5rem",
        fontFamily: "ui-monospace, monospace", fontSize: ".8rem",
        backdropFilter: "blur(6px)",
      }}>
        {LOOK_KEYS.map((k) => (
          <a key={k} href={`/looks?look=${k}`} style={{
            color: k === active ? "#fff" : "#9a9a9e",
            padding: ".35rem .9rem", textDecoration: "none",
            fontWeight: k === active ? 700 : 400,
          }}>{LOOKS[k].label}</a>
        ))}
      </nav>

      <StoryView
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
    </>
  );
}
