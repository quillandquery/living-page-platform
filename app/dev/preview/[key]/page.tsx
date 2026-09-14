import { notFound } from "next/navigation";
import { StoryView } from "@/components/living/StoryView";
import { TEST_STORIES } from "@/lib/dev/test-stories";
import { extractStoryProfile } from "@/lib/semantic-profile";
import { generateArtDirection, describeArtDirection, scoreEnvironments } from "@/lib/art-direction/generate";
import { annotate, toBlocks } from "@/lib/annotate";

/**
 * DEVELOPMENT-ONLY — one test story rendered through the full pipeline
 * (semantic profile → art direction → StoryView), no database involved.
 * `?debug=1` appends the render plan as text under the page, for the same
 * reason `describeArtDirection` exists (§45).
 */
export default async function DevPreviewStory(
  { params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ debug?: string }> },
) {
  if (process.env.NODE_ENV === "production") notFound();
  const { key } = await params;
  const { debug } = await searchParams;
  const story = TEST_STORIES.find((s) => s.key === key);
  if (!story) notFound();

  const profile = extractStoryProfile(story.text);
  const artDirection = generateArtDirection(story.text, profile);
  const blocks = toBlocks(annotate(story.text, {
    doodleDensity: artDirection.atmosphere.spatialOpenness === "dense" ? 8 : artDirection.atmosphere.spatialOpenness === "sparse" ? 3 : 6,
    voiceBudget: 0.4,
  }));

  return (
    <>
      <StoryView
        place={story.place}
        date=""
        fragment={story.fragment}
        accent={artDirection.accent}
        backdrop={artDirection.environment.key}
        veil={false}
        blocks={blocks}
        seed={story.key}
        artDirection={artDirection}
      />
      {debug ? (
        <pre style={{
          position: "relative", zIndex: 2, maxWidth: 640, margin: "4vh auto", padding: "1.2rem",
          background: "#111", color: "#dfd", fontSize: ".78rem", lineHeight: 1.6, borderRadius: 8,
        }}>
          {describeArtDirection(artDirection)}
          {"\n\nENVIRONMENT SCORES\n"}
          {scoreEnvironments(story.text, profile).slice(0, 6).map((s) => `${s.key}: ${s.score.toFixed(1)}`).join("\n")}
        </pre>
      ) : null}
    </>
  );
}
