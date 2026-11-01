/**
 * The write side: publishing with a visibility, and flipping it afterwards.
 * Runs the real server actions (app/write/actions.ts + lib/db.ts) against the
 * in-memory Supabase from tests/helpers, with next/cache, analytics and
 * Storage replaced by spies.
 */
import { test, mock, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { makeFakeSupabase, seedWorld, type FakeDb, type Row } from "./helpers/fake-supabase";

let world: FakeDb;
let client: ReturnType<typeof makeFakeSupabase>;
let actions: typeof import("../app/write/actions");

const revalidated: string[] = [];
const events: { name: string; props: Record<string, unknown> }[] = [];
const removed: { bucket: string; names: string[] }[] = [];

const as = (viewerId: string | null) => { client = makeFakeSupabase(world, { viewerId }); };
const row = (id: string): Row => world.stories.find((s) => s.id === id)!;
const p = (rel: string) => path.join(process.cwd(), rel);

before(async () => {
  mock.module("next/cache", { namedExports: { revalidatePath: (x: string) => { revalidated.push(x); } } });
  mock.module("next/navigation", { namedExports: { redirect: (u: string) => { throw new Error(`redirect:${u}`); } } });
  mock.module(p("lib/supabase/server.ts"), { namedExports: { supabaseServer: async () => client } });
  mock.module(p("lib/analytics/server.ts"), {
    namedExports: { captureServer: async (name: string, _id: string, props: Record<string, unknown>) => { events.push({ name, props }); } },
  });
  mock.module(p("lib/supabase/admin.ts"), {
    namedExports: {
      supabaseAdmin: () => ({ storage: { from: (bucket: string) => ({ remove: async (names: string[]) => { removed.push({ bucket, names }); return { error: null }; } }) } }),
    },
  });
  mock.module(p("lib/brain/castWithAI.ts"), { namedExports: { castWithAI: async () => ({ ok: false }) } });
  actions = await import("../app/write/actions");
});

beforeEach(() => {
  world = seedWorld();
  revalidated.length = 0; events.length = 0; removed.length = 0;
  as("u-ann");
});

const saveInput = (id: string, extra: Record<string, unknown> = {}) => ({
  id, place: "Gokarna", date: "", fragment: "A hook", accent: "#2B3ED0", backdrop: null, veil: true,
  source: "some words", blocks: [], ...extra,
}) as Parameters<typeof actions.publishAction>[0];

// ── setVisibilityAction ─────────────────────────────────────────────────────

test("public → private flips ONLY visibility: same row, slug, content, published_at; nothing duplicated", async () => {
  const before = { ...row("s-ann-pub") };
  const count = world.stories.length;
  const res = await actions.setVisibilityAction("s-ann-pub", "private");
  assert.deepEqual(res, { ok: true, visibility: "private", changed: true });
  const after = row("s-ann-pub");
  assert.equal(after.visibility, "private");
  for (const k of ["id", "slug", "source", "fragment", "blocks", "status", "published_at", "author_id"]) {
    assert.deepEqual(after[k], before[k], `${k} untouched`);
  }
  assert.equal(world.stories.length, count, "no duplicate story created");
});

test("private → public makes it eligible again — same row, same URL", async () => {
  const res = await actions.setVisibilityAction("s-ann-priv", "public");
  assert.deepEqual(res, { ok: true, visibility: "public", changed: true });
  assert.equal(row("s-ann-priv").visibility, "public");
  assert.equal(row("s-ann-priv").slug, "ann-private");
  assert.deepEqual(removed, [], "going public never deletes anything");
});

test("every list that could show it is revalidated, incl. the time-cached sitemap & llms-full", async () => {
  await actions.setVisibilityAction("s-ann-pub", "private");
  for (const want of ["/", "/wander", "/@ann", "/@ann/ann-public", "/sitemap.xml", "/llms-full.txt"]) {
    assert.ok(revalidated.includes(want), `revalidates ${want}`);
  }
});

test("going private removes the pre-rendered share loops from the public bucket and the pointer from art_direction", async () => {
  const id = "s-ann-pub";
  row(id).art_direction = {
    format: "x",
    share: {
      loopMp4: `https://x.supabase.co/storage/v1/object/public/share-loops/${id}-og.mp4`,
      loopWebp: `https://x.supabase.co/storage/v1/object/public/share-loops/${id}-og.webp`,
      rev: "r1",
    },
  };
  await actions.setVisibilityAction(id, "private");
  assert.deepEqual(removed, [{ bucket: "share-loops", names: [`${id}-og.mp4`, `${id}-og.webp`] }]);
  assert.deepEqual(row(id).art_direction, { format: "x" });
});

test("only the author can change it — another writer, or a signed-out caller, is refused and nothing changes", async () => {
  as("u-bob");
  const r1 = await actions.setVisibilityAction("s-ann-priv", "public");
  assert.equal(r1.ok, false);
  assert.equal(row("s-ann-priv").visibility, "private");
  const r2 = await actions.setVisibilityAction("s-ann-pub", "private");
  assert.equal(r2.ok, false);
  assert.equal(row("s-ann-pub").visibility, "public");

  as(null);
  assert.equal((await actions.setVisibilityAction("s-ann-pub", "private")).ok, false);
  assert.equal(row("s-ann-pub").visibility, "public");
  assert.deepEqual(removed, []);
  assert.deepEqual(events, []);
});

test("invalid values are rejected, not coerced", async () => {
  for (const bad of ["unlisted", "Private", "", null, undefined, true]) {
    const r = await actions.setVisibilityAction("s-ann-pub", bad as never);
    assert.equal(r.ok, false, `rejects ${JSON.stringify(bad)}`);
  }
  assert.equal(row("s-ann-pub").visibility, "public");
});

test("setting the value it already has is a no-op (no churn, no revalidation, no event)", async () => {
  const res = await actions.setVisibilityAction("s-ann-pub", "public");
  assert.deepEqual(res, { ok: true, visibility: "public", changed: false });
  assert.deepEqual(revalidated, []);
  assert.deepEqual(events, []);
});

test("a change is recorded as ids only — never the title or slug of the story", async () => {
  await actions.setVisibilityAction("s-ann-pub", "private");
  assert.deepEqual(events, [{ name: "story_visibility_changed", props: { story_id: "s-ann-pub", from: "public", to: "private" } }]);
});

test("making one story private does not touch any other story", async () => {
  const snapshot = JSON.stringify(world.stories.filter((s) => s.id !== "s-ann-pub"));
  await actions.setVisibilityAction("s-ann-pub", "private");
  assert.equal(JSON.stringify(world.stories.filter((s) => s.id !== "s-ann-pub")), snapshot);
});

// ── publishing with a visibility ────────────────────────────────────────────

test("publishAction can publish a draft PRIVATELY: published, private, same row", async () => {
  const res = await actions.publishAction(saveInput("s-ann-draft", { visibility: "private" }));
  assert.equal(res.ok, true);
  const r = row("s-ann-draft");
  assert.equal(r.status, "published");
  assert.equal(r.visibility, "private");
  assert.ok(r.published_at, "has a published_at — private is not 'unpublished'");
  assert.equal(world.stories.filter((s) => s.id === "s-ann-draft").length, 1);
});

test("publishAction can publish PUBLICLY, and an omitted visibility changes nothing", async () => {
  await actions.publishAction(saveInput("s-ann-draft", { visibility: "public" }));
  assert.equal(row("s-ann-draft").visibility, "public");

  row("s-ann-priv").art_direction = {};
  await actions.publishAction(saveInput("s-ann-priv")); // no visibility key: an "Update" from a client that predates this
  assert.equal(row("s-ann-priv").visibility, "private", "a republish must not silently expose a private story");
});

test("re-publishing a live public story as private (Update) keeps the row and URL", async () => {
  const slugBefore = row("s-ann-pub").slug;
  const res = await actions.publishAction(saveInput("s-ann-pub", { visibility: "private" }));
  assert.equal(res.ok, true);
  assert.equal(row("s-ann-pub").visibility, "private");
  assert.equal(row("s-ann-pub").slug, slugBefore, "published URLs are permanent");
  assert.ok(events.some((e) => e.name === "story_visibility_changed"));
});

test("saving or unpublishing never changes visibility — only publishing (or setVisibilityAction) does", async () => {
  await actions.saveDraftAction(saveInput("s-ann-pub", { visibility: "private" }));
  assert.equal(row("s-ann-pub").visibility, "public", "Save ignores the picker");
  await actions.unpublishAction(saveInput("s-ann-priv", { visibility: "public" }));
  assert.equal(row("s-ann-priv").visibility, "private");
  assert.equal(row("s-ann-priv").status, "draft", "unpublish still works");
});

test("publishAction rejects an invalid visibility without writing", async () => {
  const before = JSON.stringify(row("s-ann-draft"));
  const res = await actions.publishAction(saveInput("s-ann-draft", { visibility: "unlisted" }));
  assert.equal(res.ok, false);
  assert.equal(JSON.stringify(row("s-ann-draft")), before);
});

test("another writer cannot publish or re-visibility someone else's story through publishAction", async () => {
  as("u-bob");
  await actions.publishAction(saveInput("s-ann-priv", { visibility: "public" }));
  assert.equal(row("s-ann-priv").visibility, "private");
});

test("/make publish: defaults to public (as before), honours private, rejects junk", async () => {
  const base = { mode: "story" as const, source: "my words", title: "A title" };
  const a = await actions.publishBespokeFromMake(base);
  assert.equal(a.ok, true);
  assert.equal(world.stories.at(-1)!.visibility, "public");

  const b = await actions.publishBespokeFromMake({ ...base, title: "Another", visibility: "private" });
  assert.equal(b.ok, true);
  const created = world.stories.at(-1)!;
  assert.equal(created.visibility, "private");
  assert.equal(created.status, "published");

  const n = world.stories.length;
  const c = await actions.publishBespokeFromMake({ ...base, visibility: "everyone" as never });
  assert.equal(c.ok, false);
  assert.equal(world.stories.length, n, "nothing inserted");
});
