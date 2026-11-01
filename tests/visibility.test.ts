import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseVisibility, isPrivate, isPubliclyListed, canViewStory, visibilityCounts,
} from "../lib/visibility";
import { shareLoopObjectNames, withoutShare } from "../lib/share-loops-purge";
import { buildSeed } from "../lib/discover";
import type { StoryWithAuthor } from "../lib/types";
import { seedWorld } from "./helpers/fake-supabase";

// ── the access table from the spec, row by row ─────────────────────────────

const story = (status: "draft" | "published", visibility: "public" | "private") =>
  ({ status, visibility, author_id: "author" });

test("public story: author yes, others yes, signed-out yes", () => {
  const s = story("published", "public");
  assert.equal(canViewStory(s, "author"), true);
  assert.equal(canViewStory(s, "someone-else"), true);
  assert.equal(canViewStory(s, null), true);
  assert.equal(isPubliclyListed(s), true);
});

test("private story: author yes, everyone else no (direct URL / API / signed-out)", () => {
  const s = story("published", "private");
  assert.equal(canViewStory(s, "author"), true);
  assert.equal(canViewStory(s, "someone-else"), false);
  assert.equal(canViewStory(s, null), false);
  assert.equal(canViewStory(s, undefined), false);
  assert.equal(canViewStory(s, ""), false);
  assert.equal(isPubliclyListed(s), false, "never eligible for repository/profile/search/recs");
});

test("a draft is author-only whatever its visibility says", () => {
  for (const v of ["public", "private"] as const) {
    const s = story("draft", v);
    assert.equal(canViewStory(s, "author"), true);
    assert.equal(canViewStory(s, "other"), false);
    assert.equal(isPubliclyListed(s), false);
  }
});

test("a legacy row with no visibility value stays public (backward compatible)", () => {
  const legacy = { status: "published" as const, author_id: "a" };
  assert.equal(isPrivate({ visibility: undefined }), false);
  assert.equal(isPrivate({ visibility: null }), false);
  assert.equal(isPubliclyListed(legacy), true);
});

test("parseVisibility accepts exactly public|private", () => {
  assert.equal(parseVisibility("public"), "public");
  assert.equal(parseVisibility("private"), "private");
  for (const bad of ["Public", "PRIVATE", "unlisted", "", null, undefined, 1, {}, ["private"]]) {
    assert.equal(parseVisibility(bad), null, `rejects ${JSON.stringify(bad)}`);
  }
});

test("visibilityCounts splits public/private for the owner's label", () => {
  assert.deepEqual(visibilityCounts([{ visibility: "public" }, { visibility: "private" }, { visibility: "private" }]), { public: 1, private: 2 });
  assert.deepEqual(visibilityCounts([]), { public: 0, private: 0 });
});

// ── share-loop clean-up ────────────────────────────────────────────────────

test("shareLoopObjectNames only names this story's own loop files", () => {
  const id = "11111111-2222-3333-4444-555555555555";
  const base = "https://x.supabase.co/storage/v1/object/public/share-loops";
  assert.deepEqual(
    shareLoopObjectNames(id, { loopMp4: `${base}/${id}-og.mp4`, loopWebp: `${base}/${id}-og.webp?t=1` }).sort(),
    [`${id}-og.mp4`, `${id}-og.webp`],
  );
  // a pointer at someone else's file, or a non-loop file, is never deleted
  assert.deepEqual(shareLoopObjectNames(id, { loopMp4: `${base}/other-id-og.mp4`, loopWebp: `${base}/${id}-notes.txt` }), []);
  assert.deepEqual(shareLoopObjectNames(id, null), []);
  assert.deepEqual(shareLoopObjectNames("", { loopMp4: `${base}/-og.mp4` }), []);
});

test("withoutShare drops only the share stamp, immutably", () => {
  const ad = { format: "x", share: { loopMp4: "u" }, palette: { key: "p" } };
  const out = withoutShare(ad);
  assert.deepEqual(out, { format: "x", palette: { key: "p" } });
  assert.ok("share" in ad, "input is untouched");
  assert.deepEqual(withoutShare(null), {});
});

// ── discovery seeds carry the flag for the owner's badge ───────────────────

test("buildSeed marks private stories, defaults everything else to public", () => {
  const w = seedWorld();
  const row = (id: string) => {
    const s = w.stories.find((r) => r.id === id)!;
    return { ...s, author: w.profiles.find((p) => p.id === s.author_id)! } as StoryWithAuthor;
  };
  assert.equal(buildSeed(row("s-ann-pub")).visibility, "public");
  assert.equal(buildSeed(row("s-ann-priv")).visibility, "private");
});
