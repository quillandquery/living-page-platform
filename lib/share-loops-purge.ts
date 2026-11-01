/**
 * SHARE-LOOP CLEAN-UP when a story goes private.
 *
 * `scripts/gen-share-loops.ts` renders a moving share asset per story and
 * uploads it to the PUBLIC Supabase Storage bucket `share-loops`, stamping its
 * URLs on `art_direction.share`. Those files are served by Storage, outside
 * RLS — so flipping a story to private would NOT, by itself, stop its
 * moving preview being fetched from that URL. This removes the objects and the
 * pointer. Going public again re-fires the publish webhook (status stays
 * 'published'), which regenerates them.
 *
 * Pure name-parsing is split out so it can be tested without Storage.
 */
export const SHARE_LOOP_BUCKET = "share-loops";

type ShareStamp = { loopMp4?: unknown; loopWebp?: unknown } | null | undefined;

/** Object names (within the bucket) that belong to `storyId`, taken from the
 *  public URLs stamped on the story. Anything that doesn't look like this
 *  story's own file is ignored — we never delete by a name we didn't mint. */
export function shareLoopObjectNames(storyId: string, share: ShareStamp): string[] {
  if (!share || !storyId) return [];
  const names = new Set<string>();
  for (const url of [share.loopMp4, share.loopWebp]) {
    if (typeof url !== "string") continue;
    const last = url.split("?")[0].split("/").pop() ?? "";
    let name = last;
    try { name = decodeURIComponent(last); } catch { /* keep raw */ }
    if (name.startsWith(`${storyId}-`) && /\.(mp4|webp)$/.test(name)) names.add(name);
  }
  return [...names];
}

/** `art_direction` without its `share` stamp (immutable). */
export function withoutShare<T extends Record<string, unknown>>(ad: T | null | undefined): Omit<T, "share"> | Record<string, never> {
  if (!ad) return {};
  const { share: _share, ...rest } = ad as T & { share?: unknown };
  return rest;
}
