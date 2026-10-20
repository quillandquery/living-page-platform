import type { Block } from "./story-blocks.mjs";
import type { StoryArtDirection } from "./art-direction/types";

/** Story / Moment / Thought / Just start (D3) — cosmetic entry mode. */
export type StoryType = "story" | "moment" | "thought" | "freeform";

/**
 * THE DATA SHAPES that cross the DB boundary.
 *
 * A story used to be a file: frontmatter + MDX. Now it is a row. The
 * `blocks` column carries the exact same Block[] the studio has always
 * emitted, so nothing about how a piece READS changed — only where it
 * lives between writing it and reading it.
 */

export type Profile = {
  id: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
};

export type StoryStatus = "draft" | "published";

/** A link generated so someone who didn't write this row can claim it —
 *  see docs/CLAIMING.md and lib/claim.ts. `none` covers every ordinary
 *  story that was never handed off. */
export type ClaimStatus = "none" | "pending" | "claimed";

/** A story row as it lives in Postgres. */
export type StoryRow = {
  id: string;
  author_id: string;
  slug: string;
  place: string;
  date: string;
  fragment: string;
  accent: string;
  backdrop: string | null;
  veil: boolean;
  source: string;
  blocks: Block[];
  status: StoryStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  /** `{}` for a row saved before Story Visual System 2.0 — see
   *  `isCompleteArtDirection` in `lib/art-direction/types.ts`. */
  art_direction: Partial<StoryArtDirection>;
  type: StoryType;
  /** The writer-pinned living-page world (D9, migration 0005), or null to
   *  auto-cast from the story's own words at render time (lib/living/cast.ts).
   *  A `WorldKey` string; kept loose here so lib/types stays free of the
   *  worlds import. */
  world: string | null;
  /** The live claim token for `/claim/<token>`, or null once claimed,
   *  revoked, or never generated. Never shown to a reader — only ever
   *  read server-side via the service-role client (lib/claim.ts). */
  claim_token: string | null;
  claim_status: ClaimStatus;
  claimed_at: string | null;
  /** Who generated the claim link — durable, unlike `author_id`, which
   *  moves to the claimant the moment it's claimed. */
  seeded_by: string | null;
  /** Optional author override for the derived title (migration 0004) —
   *  null means "use `deriveStoryContext().title`". Never required to
   *  publish; see docs/DISCOVERABILITY.md. */
  seo_title: string | null;
  /** Optional author override for the derived description (migration
   *  0004) — null means "use `deriveStoryContext().summary`". */
  seo_description: string | null;
  /** Optional, author-supplied topic words. `[]` means none were set —
   *  nothing today infers or requires these. */
  tags: string[];
};

/** A story joined with the writer who wrote it — what the feed and reader need. */
export type StoryWithAuthor = StoryRow & { author: Profile };

/** The editable surface of a story, everything the studio owns. */
export type StoryDraftInput = {
  id?: string;
  slug: string;
  place: string;
  date: string;
  fragment: string;
  accent: string;
  backdrop: string | null;
  veil: boolean;
  source: string;
  blocks: Block[];
  art_direction?: Partial<StoryArtDirection>;
  type?: StoryType;
  /** Writer-pinned world (migration 0005) — null/undefined = auto-cast. */
  world?: string | null;
  /** Optional SEO overrides (migration 0004) — see `StoryRow`. */
  seo_title?: string | null;
  seo_description?: string | null;
  tags?: string[];
};
