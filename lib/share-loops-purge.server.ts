import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { SHARE_LOOP_BUCKET, shareLoopObjectNames } from "./share-loops-purge";

/** Best-effort: delete a story's pre-rendered share loops from the public
 *  `share-loops` bucket. Never throws — a missing service-role key or a
 *  Storage hiccup must not block the visibility change itself (the DB flip is
 *  the source of truth; this only closes the one side channel). Returns how
 *  many objects were asked to be removed, for logging/tests. */
export async function purgeShareLoops(storyId: string, share: unknown): Promise<number> {
  const names = shareLoopObjectNames(storyId, share as Parameters<typeof shareLoopObjectNames>[1]);
  if (!names.length) return 0;
  try {
    const { error } = await supabaseAdmin().storage.from(SHARE_LOOP_BUCKET).remove(names);
    if (error) { console.warn("[visibility] share-loop purge failed:", error.message); return 0; }
    return names.length;
  } catch (e) {
    console.warn("[visibility] share-loop purge skipped:", (e as Error).message);
    return 0;
  }
}
