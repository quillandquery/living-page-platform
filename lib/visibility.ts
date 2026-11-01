/**
 * STORY VISIBILITY — the one place the rule lives (client-safe, no I/O).
 *
 *   status      draft | published        has it gone out at all?
 *   visibility  public | private         once published, who may read it?
 *
 * A story is PUBLICLY LISTED (author page, Wander, sitemap, llms-full,
 * read-next, share assets) only when it is published AND public. A private
 * story is still published — same row, same slug, same URL — but only its
 * author can read it.
 *
 * The database is the real gate (migration 0006: RLS "read public or own").
 * These helpers exist so (a) the query layer states the same rule explicitly,
 * since an author's OWN private rows pass RLS and would otherwise ride into
 * their feed queries, and (b) the rule is unit-testable without a database.
 */
import type { StoryStatus, StoryVisibility } from "./types";

export const VISIBILITIES: readonly StoryVisibility[] = ["public", "private"];

/** Narrow untrusted input (a server-action argument, a form field). */
export function parseVisibility(v: unknown): StoryVisibility | null {
  return v === "public" || v === "private" ? v : null;
}

type HasVisibility = { visibility?: StoryVisibility | null };
type Visible = HasVisibility & { status: StoryStatus };

/** Only an explicit "private" is private — the column is NOT NULL DEFAULT
 *  'public', so a missing value can only come from a non-DB fixture. */
export const isPrivate = (s: HasVisibility): boolean => s.visibility === "private";

/** Eligible for every public surface. */
export const isPubliclyListed = (s: Visible): boolean => s.status === "published" && !isPrivate(s);

/** May `viewerId` (null = signed out) read this story at its URL? */
export function canViewStory(s: Visible & { author_id: string }, viewerId: string | null | undefined): boolean {
  if (viewerId && viewerId === s.author_id) return true; // authors always see their own
  return isPubliclyListed(s);
}

/** Split a writer's list for the owner's "N public · M private" label. */
export function visibilityCounts(stories: HasVisibility[]): { public: number; private: number } {
  let priv = 0;
  for (const s of stories) if (isPrivate(s)) priv++;
  return { public: stories.length - priv, private: priv };
}

/** Copy lives here so the publish overlay, the editor, the author page and the
 *  reader pill all say the same thing. */
export const VISIBILITY_COPY: Record<StoryVisibility, { label: string; blurb: string }> = {
  public: { label: "Public", blurb: "Anyone can read it. It can appear on your page and in Wander." },
  private: { label: "Private", blurb: "Only you can read it. It stays off your page and out of Wander." },
};

export const MAKE_PRIVATE_WARNING =
  "Making this private takes it off your page and out of Wander right away. Anyone with the link will lose access. You can make it public again at any time.";
