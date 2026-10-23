import { annotate, toBlocks } from "./annotate";
import type { Profile, StoryWithAuthor } from "./types";

/**
 * SEED STORIES FOR WANDER
 *
 * Wander is a field, and a field needs bodies in it. Until enough people
 * have published, these curated pieces give the discovery surface real
 * density — but nothing here is faked into existence: each one is authored
 * the exact way a writer's story is, as plain prose run through the same
 * annotate()+toBlocks() emitter the studio uses, so its voices, doodles,
 * world and themes are derived, not hand-set. They read through the same
 * StoryView the real reader uses (see app/wander/s/[slug]/page.tsx).
 *
 * They are clearly authored by "Living Page" and addressed under /wander/s/,
 * never under a real @handle, so they never impersonate a person.
 */

const AUTHOR: Profile = {
  id: "livingpage-seed",
  handle: "livingpage",
  display_name: "Living Page",
  bio: "Seed stories, so you always have something to fall into.",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00Z",
};

type SampleInput = {
  slug: string;
  place: string;
  date: string;
  accent: string;
  backdrop: string | null;
  /** the hook shown in Wander */
  hook: string;
  /** the full piece, plain prose — the same thing a writer types */
  body: string;
};

// Cleared Oct 23 2026 — the first 12 placeholder seeds were removed; add the
// next batch of better ones here (see SampleInput above).
const SAMPLES: SampleInput[] = [];

function build(input: SampleInput): StoryWithAuthor {
  const blocks = toBlocks(annotate(input.body, { seed: hashSeed(input.slug) }));
  return {
    id: `sample-${input.slug}`,
    author_id: AUTHOR.id,
    slug: input.slug,
    place: input.place,
    date: input.date,
    fragment: input.hook,
    accent: input.accent,
    backdrop: input.backdrop,
    veil: false,
    source: input.body,
    blocks,
    art_direction: {},
    type: "story",
    world: null,
    status: "published",
    published_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    claim_token: null,
    claim_status: "none",
    claimed_at: null,
    seeded_by: null,
    seo_title: null,
    seo_description: null,
    tags: [],
    author: AUTHOR,
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** The seed stories, ready for the field and the reader. Built once. */
export const SAMPLE_STORIES: StoryWithAuthor[] = SAMPLES.map(build);

export const isSampleId = (id: string) => id.startsWith("sample-");

export function sampleBySlug(slug: string): StoryWithAuthor | null {
  return SAMPLE_STORIES.find((s) => s.slug === slug) ?? null;
}

export function otherSamples(excludeSlug: string): StoryWithAuthor[] {
  return SAMPLE_STORIES.filter((s) => s.slug !== excludeSlug);
}
