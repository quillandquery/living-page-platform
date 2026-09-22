/**
 * ONE STORY → ONE COMPOSITION → THREE CANVASES.
 *
 * Every image route calls this, so the OG card, the Instagram feed post
 * and the Instagram story are unmistakably the same artifact at three
 * aspect ratios — same setup, same turn, same world, same issue number —
 * rather than three renderers that drifted apart.
 */
import { deriveStoryContext } from "./story-context";
import { pickSetupTurn, scoreStrip } from "./share-beats";
import { composeShare, isReaction, type ShareComposition, type Reaction } from "./share-layout";
import { seedFromId } from "./og-render";
import { BRAND_HOST } from "./site";
import type { Block } from "./story-blocks.mjs";
import type { StoryArtDirection } from "./art-direction/types";

/** The publisher mark — always the brand host, because it is a mark and
 *  not an address. Share LINKS still resolve through `SITE_URL`, so
 *  local dev and preview deploys hand out working URLs while the
 *  artifact is signed the way it will be signed in the wild. */
export function shareHost(): string {
  return BRAND_HOST;
}

type StoryLike = {
  id: string;
  fragment: string;
  place: string;
  date: string;
  source?: string | null;
  blocks?: Block[] | null;
  backdrop?: string | null;
  art_direction?: Partial<StoryArtDirection> | null;
};

export function buildComposition(
  story: StoryLike,
  reactionParam?: string | null,
): {
  composition: ShareComposition;
  environmentKey: string;
  mood: string | null;
  seed: number;
} {
  const context = deriveStoryContext({
    fragment: story.fragment,
    place: story.place,
    date: story.date,
    source: story.source,
    blocks: story.blocks,
    backdrop: story.backdrop,
    artDirection: story.art_direction,
  });

  const mood = story.art_direction?.atmosphere?.mood ?? null;
  const seed = seedFromId(story.id);
  const { setup, turn, coda } = pickSetupTurn(story.fragment, story.blocks);
  const strip = scoreStrip(story.blocks, 48);
  const reaction: Reaction | null = isReaction(reactionParam) ? reactionParam : null;

  const composition = composeShare({
    setup,
    turn: turn || context.title,
    title: context.title,
    coda,
    place: story.place,
    date: story.date,
    seed,
    strip,
    reaction,
  });

  const environmentKey = story.art_direction?.environment?.key ?? story.backdrop ?? "dawn";

  return { composition, environmentKey, mood, seed };
}
