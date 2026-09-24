import Link from "next/link";
import { StoryStage } from "@/components/living/StoryStage";
import { FormatSelectDemo } from "@/components/living/FormatSelectDemo";
import { extractStoryProfile } from "@/lib/semantic-profile";
import { generateArtDirection } from "@/lib/art-direction/generate";
import { isFormatKey, resolveFormat, fittingFormats } from "@/lib/formats";
import { LOOK_KEYS, LOOKS, type LookKey } from "@/lib/art-direction/looks";
import { annotate, toBlocks } from "@/lib/annotate";
import { resolveImagery } from "@/lib/media";

/**
 * PUBLIC PREVIEW — one live URL, no login, to see every WORLD. Each world gets
 * a sample that fits it so the backdrop, hero subject, type and format all read
 * as one place. `/looks?look=diving`, `/looks?look=space&as=crawl`.
 * Temporary: delete once the world system is signed off.
 */
const DEFAULT_SAMPLE = `A lot of solo travel is a bad day with a good view.

There are more bad days than good ones, and they're all happening somewhere that's never heard of you.

The bus left at dawn and I watched the city give way to fields, then to nothing, then to the sea.

I bought a ticket I couldn't read and got off at a stop that smelled like salt.

A stranger shared her umbrella and said nothing the whole way.

I thought I wanted to leave. Turns out I just wanted someone to ask me to stay.`;

const SAMPLES: Partial<Record<LookKey, string>> = {
  diving: `We dropped beneath the surface and the noise of the world went out like a light.

Then something enormous moved beneath us. A whale shark, older than the boat, older than the country.

It didn't care that we were there. It just kept swimming, trailing a whole galaxy of small fish.

I forgot to breathe. The dive master tapped my tank and pointed at the reef, but I was already somewhere else.`,
  paris: `I went to Paris expecting the postcard and got the cobblestones instead.

The Eiffel Tower kept appearing at the end of streets I hadn't meant to walk down.

We drank bad coffee on a good balcony and let the afternoon go soft.

I fell a little in love, mostly with the light.`,
  noir: `It was raining the last time I saw her, the kind of rain that turns a street into a mirror.

She stood under the streetlight and told me the truth, and then she told me a better lie.

A stranger lit a cigarette in the doorway. Somewhere a car door closed like a verdict.

I walked home through the shadow and didn't look back. That was my first mistake.`,
  neon: `The club didn't really start until 2am, when the bass dropped and the whole room turned electric.

Neon ran down the wet street outside like spilled paint. Midnight, then later, then nowhere.

We danced until the floor felt like the deck of a ship. Nobody wanted the night to end.

Somewhere around dawn the city switched its signs off, one by one.`,
  wanted: `They put my face on a poster outside the saloon. WANTED, it said, and then a number I was almost proud of.

I quit my job and drove across the desert with everything I owned and nothing I needed.

The reward went up every town I passed through. The frontier has a long memory and a short fuse.

Dead or alive, the poster said. I chose a third option and kept riding.`,
  space: `A long time ago, we looked up and decided the stars were a map.

The galaxy turned above the desert, indifferent and enormous, and we felt gloriously small.

Light that left those stars before we were born arrived, finally, to land in two ordinary eyes.

We are the universe, briefly, trying to remember itself.`,
  fieldnotes: `Things I learned this week, sketched in the margins of a notebook.

Always carry a pen. The idea never waits for the laptop.

Notice the small things. A good day is mostly small things, stacked.

Draw it badly rather than not at all.`,
  essay: `I've come to believe that meaning is not found but made.

We are not owed a point. We spend our short attention and, in spending it, we make one.

What matters, in the end, is smaller and quieter than we were promised, and better.

Be kind. It changes someone, and it changes you.`,
  ember: `We built a fire at the edge of the field and let the dark come in close.

Home was three hundred miles away, but the firelight made a small warm room out of nothing.

We talked past midnight, the good kind of talk that only happens when no one can see your face.

The embers held their heat long after we stopped feeding them.`,
};

export default async function LooksPreview(
  { searchParams }: { searchParams: Promise<{ as?: string; look?: string; seed?: string; veil?: string; select?: string }> },
) {
  const { as, look, seed: seedRaw, veil, select } = await searchParams;
  const seed = Number(seedRaw) || 7;
  const lookKey = (look && (LOOK_KEYS as string[]).includes(look)) ? (look as LookKey) : undefined;
  const lookOverride = isFormatKey(look) ? undefined : lookKey;

  const sample = (lookKey && SAMPLES[lookKey]) || DEFAULT_SAMPLE;
  const profile = extractStoryProfile(sample);
  const ad = generateArtDirection(sample, profile, { lookOverride, seed });
  const rawBlocks = toBlocks(annotate(sample, { doodleDensity: 6, voiceBudget: 0.42, seed }));
  // mirror the real save path (app/write/actions.ts): curated photography
  // auto-on unless the resolved Visuals dial is "minimal" — so this preview
  // shows exactly what publishing the sample would produce.
  const blocks = ad.visualIntensity !== "minimal"
    ? await resolveImagery("Somewhere", sample, rawBlocks, ad.environment.key)
    : rawBlocks;

  const fitting = fittingFormats(blocks);
  // respect the world's own format (or an explicit ?as=), not a curated clamp
  const format = resolveFormat(as, blocks, { authorDefault: ad.format, look: ad.look });
  const qs = look ? `?look=${look}` : "";

  if (select === "1") {
    return (
      <FormatSelectDemo
        data={{ place: "Somewhere", date: "", fragment: ad.subject?.reason ?? "a world", accent: ad.accent, backdrop: ad.environment.key, blocks, seed: "looks-preview", artDirection: ad }}
        formats={fitting}
        initial={format}
      />
    );
  }

  return (
    <>
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, display: "flex", flexWrap: "wrap", gap: ".4rem", padding: ".5rem .7rem", background: "rgba(0,0,0,.55)", backdropFilter: "blur(6px)", fontFamily: "var(--font-plex, monospace)", fontSize: ".62rem", letterSpacing: ".08em", textTransform: "uppercase" }}>
        <span style={{ color: "#fff", opacity: .6, marginRight: ".4rem" }}>worlds:</span>
        {LOOK_KEYS.map((k) => (
          <Link key={k} href={`/looks?look=${k}`} style={{ color: k === (lookKey ?? "") ? "#8ff0dd" : "#fff", textDecoration: k === lookKey ? "underline" : "none", opacity: k === lookKey ? 1 : .8 }}>
            {LOOKS[k].label}
          </Link>
        ))}
      </nav>
      <StoryStage
        format={format}
        formats={Array.from(new Set([format, ...fitting]))}
        basePath={`/looks${qs}`}
        place={lookKey ? LOOKS[lookKey].label : "Somewhere"}
        date=""
        fragment={ad.subject ? ad.subject.reason : "a bad day with a good view"}
        accent={ad.accent}
        backdrop={ad.environment.key}
        veil={veil === "1"}
        blocks={blocks}
        chrome
        artDirection={ad}
        seed="looks-preview"
      />
    </>
  );
}
