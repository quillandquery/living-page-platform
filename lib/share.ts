/**
 * SHARE PROP BUILDER (Module 4, PARTS 13 / 36).
 *
 * One story → one visual identity → one set of share props, used by
 * every surface that needs to render the share controls. Keeps the
 * "one derivation, many renderings" discipline (`lib/story-context.ts`)
 * from leaking into the UI layer.
 */
import { deriveStoryContext } from "./story-context";
import { instagramCaption, shortShareText, whatsappMessage, emailBody } from "./share-caption";
import { absoluteUrl } from "./site";
import type { StoryWithAuthor } from "./types";
import type { ShareControlsProps } from "@/components/living/ShareControls";

export function buildShareProps(story: StoryWithAuthor): ShareControlsProps {
  const context = deriveStoryContext({
    fragment: story.fragment,
    place: story.place,
    date: story.date,
    source: story.source,
    blocks: story.blocks,
    backdrop: story.backdrop,
    artDirection: story.art_direction,
  });
  const path = `/@${story.author.handle}/${story.slug}`;
  const canonicalUrl = absoluteUrl(path);
  const input = { context, canonicalUrl, authorHandle: story.author.handle };

  return {
    storyId: story.id,
    authorHandle: story.author.handle,
    canonicalUrl,
    title: context.title,
    shareText: shortShareText({ context }),
    instagramCaption: instagramCaption(input),
    whatsappMessage: whatsappMessage(input),
    email: emailBody(input),
    instagramFeedUrl: absoluteUrl(`${path}/instagram-feed.png`),
    instagramStoryUrl: absoluteUrl(`${path}/instagram-story.png`),
    motionMp4: story.art_direction?.share?.loopMp4 ?? null,
    motionWebp: story.art_direction?.share?.loopWebp ?? null,
  };
}
