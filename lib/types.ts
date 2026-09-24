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
  /** The live claim token for `/claim/<token>`, or null once claimed,
   *  revoked, or never generated. Never shown to a reader — only ever
   *  read server-side via the service-role client (lib/claim.ts). */
  claim_token: string | null;
  claim_status: ClaimStatus;
  claimed_at: string | null;
  /** Who generated the claim link — durable, unlike `author_id`, which
   *  moves to the claimant the moment it's claimed. */
  seeded_by: string | null;
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
};
