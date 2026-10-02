/**
 * AUTHOR-PAGE DESCRIPTION (discoverability layer, 2026-10 — SEO audit Sept
 * 2026, item 5). Pulled out of `app/[handle]/page.tsx` so `scripts/seo-
 * audit.mjs` can assert against the exact same function the live page
 * renders with, instead of a second copy that could quietly drift.
 *
 * Every bio-less author used to fall back to the literal string "A Living
 * Page author profile." — byte-identical across every profile, the same
 * "doorway page" shape the product's own quality bar (PRD §32) warns
 * against for stories. This builds a real, per-author sentence instead,
 * from data that's actually true of THIS profile (how many stories, what
 * the newest one is) — same "extract, never invent" discipline as
 * `lib/story-context.ts`, just templated instead of excerpted, because
 * there's no prose to excerpt on a profile with no bio.
 */
import type { StoryRow } from "./types";

export function deriveAuthorDescription(name: string, stories: Pick<StoryRow, "fragment" | "place">[]): string {
  if (!stories.length) return `${name}'s page on Living Page — nothing published yet.`;
  const count = stories.length;
  const storyWord = count === 1 ? "story" : "stories";
  const latest = stories[0]; // callers already order newest-first (writerStories())
  const hook = latest.fragment?.trim();
  const where = latest.place?.trim();
  const latestBit = hook
    ? `most recently, "${hook}"${where ? ` (${where})` : ""}`
    : where ? `most recently, a story from ${where}` : null;
  let out = [`${name} on Living Page`, `${count} ${storyWord}`, latestBit].filter(Boolean).join(" — ");
  if (out.length > 160) out = out.slice(0, 157).replace(/\s+\S*$/, "") + "…";
  return out;
}
