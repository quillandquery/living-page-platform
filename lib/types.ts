import type { Block } from "./story-blocks.mjs";

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
};
