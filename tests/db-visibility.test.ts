/**
 * The query layer (lib/db.ts) against an in-memory Supabase that models the
 * migration-0006 RLS policy. Two guarantees are checked for every public
 * surface, from every viewer:
 *
 *   1. with RLS ON  — nobody but the author ever receives a private story;
 *   2. with RLS OFF — the public-surface queries STILL exclude private
 *      stories, because they state `visibility = 'public'` themselves. (A
 *      writer's own private rows pass RLS, so without the explicit filter a
 *      signed-in author's feed/Wander/read-next would include them.)
 */
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { makeFakeSupabase, seedWorld, type FakeDb } from "./helpers/fake-supabase";

let world: FakeDb;
let client: ReturnType<typeof makeFakeSupabase>;
let db: typeof import("../lib/db");

const as = (viewerId: string | null, rls = true) => { client = makeFakeSupabase(world, { viewerId, rls }); };
const slugs = (rows: { slug: string }[]) => rows.map((r) => r.slug).sort();

before(async () => {
  mock.module(path.join(process.cwd(), "lib/supabase/server.ts"), {
    namedExports: { supabaseServer: async () => client },
  });
  db = await import("../lib/db");
});
beforeEach(() => { world = seedWorld(); as(null); });

// ── the public repository: Wander, sitemap, llms-full ──────────────────────

for (const rls of [true, false]) {
  const tag = rls ? "RLS on" : "RLS OFF";

  test(`publishedFeed excludes private stories for a stranger [${tag}]`, async () => {
    as(null, rls);
    assert.deepEqual(slugs(await db.publishedFeed()), ["ann-public", "bob-public"]);
  });

  test(`publishedFeed excludes the AUTHOR'S OWN private story too [${tag}]`, async () => {
    as("u-ann", rls);
    const feed = await db.publishedFeed();
    assert.deepEqual(slugs(feed), ["ann-public", "bob-public"]);
    assert.ok(!feed.some((s) => s.fragment.includes("SECRET")));
  });

  test(`otherPublishedStories (read-next / recommendations) is public-only [${tag}]`, async () => {
    as("u-ann", rls);
    assert.deepEqual(slugs(await db.otherPublishedStories("s-ann-pub")), ["bob-public"]);
  });

  test(`writerStories (public page, metadata, counts) is public-only even for the owner [${tag}]`, async () => {
    as("u-ann", rls);
    const res = await db.writerStories("ann");
    assert.deepEqual(slugs(res!.stories), ["ann-public"]);
    as(null, rls);
    assert.deepEqual(slugs((await db.writerStories("ann"))!.stories), ["ann-public"]);
  });

  test(`writerPage hides private from strangers and other writers [${tag}]`, async () => {
    for (const viewer of [null, "u-bob"]) {
      as(viewer, rls);
      const res = await db.writerPage("ann");
      assert.equal(res!.isOwner, false);
      assert.deepEqual(slugs(res!.stories), ["ann-public"]);
    }
  });

  test(`publishedStory: a private story resolves for NO ONE but its author [${tag}]`, async () => {
    for (const viewer of [null, "u-bob"]) {
      as(viewer, rls);
      assert.equal(await db.publishedStory("ann", "ann-private"), null, `viewer ${viewer} must not read it`);
    }
    as("u-ann", rls);
    const own = await db.publishedStory("ann", "ann-private");
    assert.equal(own?.id, "s-ann-priv");
  });
}

// ── the author's own view ──────────────────────────────────────────────────

test("writerPage gives the owner public AND private (drafts stay off the page)", async () => {
  as("u-ann");
  const res = await db.writerPage("ann");
  assert.equal(res!.isOwner, true);
  assert.deepEqual(slugs(res!.stories), ["ann-private", "ann-public"]);
});

test("a stranger cannot read the owner's page-as-owner by claiming to be them (viewer comes from the session)", async () => {
  as("u-bob");
  const res = await db.writerPage("ann");
  assert.equal(res!.isOwner, false);
  assert.ok(!res!.stories.some((s) => s.visibility === "private"));
});

test("public stories keep working exactly as before", async () => {
  as(null);
  const s = await db.publishedStory("bob", "bob-public");
  assert.equal(s?.id, "s-bob-pub");
  assert.equal(s?.author.handle, "bob");
  assert.equal((await db.writerStories("bob"))!.stories.length, 1);
});

test("an unknown slug and a hidden private slug are indistinguishable (no existence leak)", async () => {
  as(null);
  assert.equal(await db.publishedStory("ann", "ann-private"), await db.publishedStory("ann", "does-not-exist"));
});

test("a draft never resolves publicly, even if its visibility is public", async () => {
  as(null);
  assert.equal(await db.publishedStory("ann", "ann-draft"), null);
  as("u-ann");
  assert.equal(await db.publishedStory("ann", "ann-draft"), null, "publishedStory is for published stories only");
});

// ── transitions, as the data layer sees them ───────────────────────────────

test("public → private removes it from every public query immediately; private → public restores it", async () => {
  const row = world.stories.find((s) => s.id === "s-bob-pub")!;

  row.visibility = "private";
  as(null);
  assert.ok(!slugs(await db.publishedFeed()).includes("bob-public"));
  assert.equal(await db.publishedStory("bob", "bob-public"), null);
  assert.equal((await db.writerStories("bob"))!.stories.length, 0, "profile shows the empty state, not a count");
  as("u-bob");
  assert.equal((await db.publishedStory("bob", "bob-public"))?.id, "s-bob-pub", "author keeps access");

  row.visibility = "public";
  as(null);
  assert.ok(slugs(await db.publishedFeed()).includes("bob-public"));
  assert.equal((await db.publishedStory("bob", "bob-public"))?.id, "s-bob-pub", "same row, same URL");
});
