import { notFound } from "next/navigation";
import Link from "next/link";
import { FormatRender } from "@/components/living/formats/render";
import { inferFormat } from "@/lib/formats";
import { annotate, toBlocks } from "@/lib/annotate";
import { describeArtDirection, generateArtDirection } from "@/lib/art-direction/generate";
import { extractStoryProfile } from "@/lib/semantic-profile";
import {
  artDirectionFromVisualProfile,
  describeVisualDecision,
  type VisualProfile,
} from "@/lib/art-direction/from-visual-profile";
import { sceneToBlocks } from "@/lib/art-direction/scene-to-blocks";
import { loadBrainSample, loadScene } from "@/lib/dev/brain-samples";
import type { StoryArtDirection } from "@/lib/art-direction/types";

/**
 * DEV ONLY — one story rendered as a real page, art-directed by the new brain.
 *
 *   brain/out/<key>.json (VisualProfile)  →  Visual Grammar Engine  →  StoryView
 *
 * ?debug=1        show the brain's decision + the resolved art direction
 * ?engine=old     render through the legacy regex engine instead (A/B)
 * ?source=beats   build the text from the brain's per-beat scene graph
 *                 (brain/scenes/<key>.json) instead of annotate() — the
 *                 narrative timeline drives each beat's voice/body/move.
 */

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function derivePlace(vp: VisualProfile): string {
  const p = vp.linguistic.places[0];
  if (p) return titleCase(p);
  return titleCase(vp.semantic.concepts[0]?.name ?? "A story");
}

function deriveFragment(text: string): string {
  const first = text.split(/(?<=[.!?])\s+/)[0] ?? text;
  return first.length > 120 ? first.slice(0, 117).trimEnd() + "…" : first;
}

function densityFor(ad: StoryArtDirection): number {
  const open = ad.atmosphere.spatialOpenness;
  return open === "dense" ? 8 : open === "sparse" ? 3 : 6;
}

export default async function BrainTestStory({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ debug?: string; engine?: string; source?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { key } = await params;
  const { debug, engine, source } = await searchParams;

  const sample = await loadBrainSample(key);
  if (!sample) notFound();
  const { text, profile: vp } = sample;

  const useOld = engine === "old";
  const ad: StoryArtDirection = useOld
    ? generateArtDirection(text, extractStoryProfile(text), {})
    : artDirectionFromVisualProfile(vp, text);

  // BEATS MODE — the per-beat scene graph drives each block's voice/body/move,
  // instead of annotate() inferring the texture. Rendered in the standard shell
  // so the per-beat choreography is legible rather than masked by a format.
  const beatsMode = source === "beats";
  const scene = beatsMode ? await loadScene(key) : null;
  const blocks = beatsMode && scene
    ? sceneToBlocks(scene)
    : toBlocks(annotate(text, { doodleDensity: densityFor(ad), voiceBudget: 0.4 }));
  // The structural layout (crawl, postcard, marquee, scrapbook, film…) comes
  // from the format wrapper, chosen from the Look the brain picked — this is
  // what makes two stories differ in *shape*, not just colour. Beats mode uses
  // the plain standard shell so the per-beat behaviour shows.
  const format = beatsMode ? "standard" : inferFormat(blocks, ad.look);

  return (
    <>
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          display: "flex", gap: ".8rem", alignItems: "center",
          padding: ".4rem .8rem", background: "rgba(20,20,20,.82)", color: "#fff",
          fontFamily: "system-ui, sans-serif", fontSize: ".8rem", backdropFilter: "blur(4px)",
        }}
      >
        <Link href="/brain-test" style={{ color: "#9cf" }}>← all</Link>
        <strong>{key}</strong>
        <span style={{ opacity: 0.7 }}>
          {beatsMode ? "source: scene-graph beats" : "source: annotate"} · look: {ad.look} · {beatsMode ? `${scene?.beats.length ?? 0} beats` : `format: ${format}`}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", gap: ".6rem" }}>
          <Link href={`/brain-test/${key}${beatsMode ? "" : "?source=beats"}`} style={{ color: "#9cf" }}>
            {beatsMode ? "→ whole-story" : "→ per-beat"}
          </Link>
          <Link href={`/brain-test/${key}?engine=old`} style={{ color: "#9cf" }}>old engine</Link>
          <Link href={`/brain-test/${key}?${beatsMode ? "source=beats&" : ""}debug=1`} style={{ color: "#9cf" }}>
            debug
          </Link>
        </span>
      </div>

      {beatsMode && !scene ? (
        <div style={{
          position: "relative", zIndex: 2, maxWidth: 680, margin: "12vh auto 2rem", padding: "1.2rem",
          background: "#fff6f6", border: "1px solid #f0caca", borderRadius: 8, fontFamily: "system-ui, sans-serif",
        }}>
          <strong>No scene graph for “{key}”.</strong> Generate it first:
          <pre style={{ background: "#111", color: "#dfd", padding: ".8rem", borderRadius: 6, overflowX: "auto" }}>
{`cd brain
python run.py --file samples/*.txt --scene --out scenes/`}
          </pre>
        </div>
      ) : null}

      <FormatRender
        format={format}
        place={derivePlace(vp)}
        date=""
        fragment={deriveFragment(text)}
        accent={ad.accent}
        backdrop={ad.environment.key}
        veil={false}
        blocks={blocks}
        seed={key}
        artDirection={ad}
      />

      {debug ? (
        <pre
          style={{
            position: "relative", zIndex: 2, maxWidth: 680, margin: "4vh auto 10vh",
            padding: "1.2rem", background: "#111", color: "#dfd",
            fontSize: ".78rem", lineHeight: 1.6, borderRadius: 8, whiteSpace: "pre-wrap",
          }}
        >
{useOld ? "LEGACY REGEX ENGINE\n\n" : "NEW BRAIN — VISUAL GRAMMAR\n\n" + describeVisualDecision(vp) + "\n\n"}
{beatsMode && scene ? "NARRATIVE STRUCTURE (per-beat → voice/body/move)\n" +
  sceneToBlocks(scene).filter((b) => b.kind === "beat").map((b) => {
    const bb = b as { voice: string; body?: string; move?: string; text: string };
    return `  ${bb.voice.padEnd(8)} ${String(bb.body).padEnd(11)} mv-${String(bb.move).padEnd(9)} | ${bb.text.slice(0, 40)}`;
  }).join("\n") + "\n\n" : ""}
{"RESOLVED ART DIRECTION\n"}
{describeArtDirection(ad)}
        </pre>
      ) : null}
    </>
  );
}
