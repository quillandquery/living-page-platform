"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { myProfile } from "@/lib/db";
import type { Block } from "@/lib/story-blocks.mjs";
import { resolveImagery } from "@/lib/media";
import { deriveSlugBase } from "@/lib/slug";
import { castWithAI } from "@/lib/brain/castWithAI";
import type { StoryArtDirection } from "@/lib/art-direction/types";
import { captureServer } from "@/lib/analytics/server";
import { createClaimLink, revokeClaimLink, type CreateClaimResult } from "@/lib/claim";
import type { StoryVisibility } from "@/lib/types";
import { parseVisibility } from "@/lib/visibility";
import { purgeShareLoops } from "@/lib/share-loops-purge.server";
import { withoutShare } from "@/lib/share-loops-purge";

/** Everything that lists, indexes or links a story. A status OR visibility
 *  change must refresh all of it — the sitemap and llms-full are time-cached
 *  (revalidate = 3600), so without this a story made private would linger in
 *  them for up to an hour. */
function revalidatePublicSurfaces(handle: string, slug: string) {
  revalidatePath("/");
  revalidatePath("/wander");
  revalidatePath(`/@${handle}`);
  revalidatePath(`/@${handle}/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms-full.txt");
}

/**
 * THE STUDIO'S HANDS, on a platform.
 *
 * The file-based studio put bytes on disk and refused to run in production.
 * This one writes rows, and runs everywhere — because Row Level Security, not
 * an environment check, is what stops one writer touching another's work. A
 * writer can only ever address their own rows; the database enforces it even
 * if a bug here forgets to.
 */

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/** The four /make entry modes — mirrors the `stories_type_check` constraint. */
export type StoryMode = "story" | "moment" | "thought" | "freeform";

/** Create a blank draft and open its editor. `mode` is the /make card the
 *  writer picked (D3's Story/Moment/Thought/Just start); it is cosmetic to
 *  rendering today (per the 0002 migration's own comment) but is exactly
 *  the core-loop signal analytics needs, so it is captured here rather
 *  than inferred later. `app/write/page.tsx` calls this with no argument
 *  (a plain "new piece" from the desk), which still defaults to "story". */
/** What the world-driven /make canvas carries into the new draft: the writer
 *  may already have typed a title, the story, and (rarely) pinned a world
 *  before pressing "Continue". All optional — a plain mode click passes none. */
export type MakeSeed = { source?: string; title?: string; world?: string | null };

export async function createStoryAction(mode: StoryMode = "story", seed: MakeSeed = {}) {
  const profile = await myProfile();
  // No profile yet (signed out, or signed in but never finished onboarding)
  // — send them through onboarding/login and carry /make + the mode they
  // picked along, so logging back in resumes the piece they were starting
  // instead of dropping them on the desk. (A long typed draft isn't carried
  // through the auth round-trip in the URL; the make canvas keeps it in
  // sessionStorage and rehydrates on return.)
  if (!profile) redirect(`/onboarding?next=${encodeURIComponent(`/make?mode=${mode}`)}`);

  const supabase = await supabaseServer();
  // a placeholder slug unique to this row; the writer names it properly on save
  const slug = `untitled-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from("stories")
    .insert({
      author_id: profile.id, slug, place: "", date: "", status: "draft", type: mode,
      fragment: (seed.title ?? "").trim(),
      source: (seed.source ?? "").trim(),
      world: seed.world ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create the piece.");
  // best-effort — a failed capture (missing key, network hiccup) never
  // blocks a writer from reaching the editor.
  await captureServer("draft_created", profile.id, { story_id: data.id, mode }).catch(() => {});
  redirect(`/write/${data.id}`);
}

/** Publish a bespoke living page STRAIGHT from /make — no editor detour. Creates a
 *  published story carrying the Opus-generated page the writer just saw
 *  (art_direction.bespokeHtml), plus the spec-kit experience as a reader fallback.
 *  Returns the published URL so the client can navigate to it. */
export async function publishBespokeFromMake(seed: {
  mode: StoryMode; source: string; title?: string; world?: string | null; bespokeHtml?: string;
  /** Defaults to public — what every publish was before 0006. */
  visibility?: StoryVisibility;
}): Promise<{ ok: true; url: string } | { ok: false; message: string; needsAuth?: boolean }> {
  const profile = await myProfile();
  if (!profile) return { ok: false, message: "Please sign in to publish.", needsAuth: true };
  const visibility = seed.visibility === undefined ? "public" : parseVisibility(seed.visibility);
  if (!visibility) return { ok: false, message: "Visibility must be public or private." };
  const source = (seed.source ?? "").trim();
  if (!source) return { ok: false, message: "Nothing to publish yet." };
  const title = (seed.title ?? "").trim();
  const supabase = await supabaseServer();

  // the spec-kit experience is a cheap reader fallback if the bespoke is absent
  let experience: unknown;
  try { const r = await castWithAI(source, title || undefined); if (r.ok) experience = r.cast.experience; } catch {}

  let slug = slugify(deriveSlugBase({ fragment: title, place: "" })) || `untitled-${Date.now().toString(36)}`;
  const { data: clash } = await supabase.from("stories").select("id").eq("author_id", profile.id).eq("slug", slug).maybeSingle();
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const art_direction: Record<string, unknown> = {};
  if (seed.bespokeHtml) art_direction.bespokeHtml = seed.bespokeHtml;
  if (experience) art_direction.experience = experience;

  const { data: inserted, error } = await supabase.from("stories").insert({
    author_id: profile.id, slug, place: "", date: "", status: "published", visibility,
    published_at: new Date().toISOString(), type: seed.mode, fragment: title, source,
    world: seed.world ?? null, art_direction,
  }).select("id").single();
  if (error || !inserted) return { ok: false, message: error?.message ?? "Could not publish." };

  revalidatePublicSurfaces(profile.handle, slug);
  await captureServer("story_published", profile.id, { story_id: inserted.id, format: "standard", mood: "auto", has_imagery: false, is_first_publish: true, visibility }).catch(() => {});
  return { ok: true, url: `/@${profile.handle}/${slug}` };
}

export type SaveInput = {
  id: string;
  place: string;
  date: string;
  fragment: string;
  accent: string;
  backdrop: string | null;
  veil: boolean;
  source: string;
  blocks: Block[];
  /** when true, the save resolves photographic imagery into the blocks */
  imagery?: boolean;
  /** the full Story Visual System 2.0 direction, computed client-side by
   *  the editor (lib/art-direction/generate.ts) so it round-trips exactly
   *  as previewed. Optional only for callers that predate this. */
  art_direction?: StoryArtDirection;
  /** The writer-pinned living-page world (D9, migration 0005), or null to
   *  auto-cast from the words at render time. Omitted by callers that predate
   *  worlds; `null` explicitly clears a pin back to auto. */
  world?: string | null;
  /** Optional SEO overrides (migration 0004) — null/`[]` means "keep
   *  deriving from the story's own words"; see lib/story-seo.ts. Optional
   *  on the type only for callers that predate this (e.g. gen-share-loops'
   *  fixture row), never a reason to skip saving them when present. */
  seo_title?: string | null;
  seo_description?: string | null;
  tags?: string[];
  /** Who can read the story once published (migration 0006). Applied ONLY by
   *  `publishAction` — a plain save or unpublish never changes it, so tweaking
   *  the picker in the publish overlay can't silently flip a live story.
   *  Omitted = leave as is (a never-published story stays at its default,
   *  'public'). Changing a live story's visibility on its own, without a
   *  republish, is `setVisibilityAction`. */
  visibility?: StoryVisibility;
};

export type SaveResult =
  | { ok: true; slug: string }
  | { ok: false; message: string };

/** Give this story a slug that no other story of the same writer holds. */
async function uniqueSlug(authorId: string, storyId: string, desired: string): Promise<string> {
  const base = slugify(desired) || "untitled";
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("stories")
    .select("slug")
    .eq("author_id", authorId)
    .neq("id", storyId);
  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 500; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  return `${base}-${storyId.slice(0, 6)}`;
}

async function persist(input: SaveInput, publish: boolean | null): Promise<SaveResult> {
  const profile = await myProfile();
  if (!profile) return { ok: false, message: "Sign in to save." };

  const missing = (["place", "fragment"] as const).filter((k) => !input[k]?.trim());
  if (publish && missing.length) {
    return { ok: false, message: `A published piece needs: ${missing.join(", ")}.` };
  }

  // Untrusted at this boundary (it's a server-action argument): anything but
  // exactly "public"/"private" is rejected rather than coerced.
  let visibility: StoryVisibility | undefined;
  if (input.visibility !== undefined) {
    const v = parseVisibility(input.visibility);
    if (!v) return { ok: false, message: "Visibility must be public or private." };
    visibility = v;
  }

  const supabase = await supabaseServer();

  // PUBLISHED URLS ARE PERMANENT (module PART 3): a story that has gone
  // out at least once keeps the slug it went out under, no matter what
  // the writer changes on a later save — recomputing it from `place` on
  // every save (the previous behaviour) meant an autosave could silently
  // move a link that was already shared. Only a story that has never been
  // published gets a freshly-derived slug.
  const { data: existing } = await supabase
    .from("stories")
    .select("slug, published_at, status, visibility, art_direction")
    .eq("id", input.id)
    .eq("author_id", profile.id)
    .maybeSingle();
  const slug = existing?.published_at
    ? existing.slug
    : await uniqueSlug(profile.id, input.id, deriveSlugBase({ fragment: input.fragment, place: input.place }));

  // image-forward register: resolve photos into the blocks. Guarded so a
  // missing key or a provider hiccup never blocks a save.
  let blocks = input.blocks;
  if (input.imagery) {
    try { blocks = await resolveImagery(input.place, input.source, input.blocks, input.art_direction?.environment?.key ?? input.backdrop ?? undefined); } catch { blocks = input.blocks; }
  }

  const patch: Record<string, unknown> = {
    slug,
    place: input.place,
    date: input.date,
    fragment: input.fragment,
    accent: input.accent,
    backdrop: input.backdrop,
    veil: input.veil,
    source: input.source,
    blocks,
  };
  if (input.art_direction) patch.art_direction = input.art_direction;
  // THE LIVING EXPERIENCE (docs/EXPERIENCE-BRIEF.md). On publish, the brain reads
  // the story and composes its bespoke world (sky/glow/silhouette/ambient/objects
  // + per-paragraph behaviour). Persisted into art_direction (additive, D4) so the
  // reader renders it with no LLM call per request. Best-effort: a hiccup or a
  // missing key never blocks publishing — the reader falls back to the heuristic.
  if (publish === true && input.source?.trim()) {
    try {
      const r = await castWithAI(input.source, input.fragment || undefined);
      if (r.ok && r.cast.experience) {
        patch.art_direction = { ...(input.art_direction ?? {}), experience: r.cast.experience };
      }
    } catch {}
  }
  if (input.world !== undefined) patch.world = input.world;
  if (input.seo_title !== undefined) patch.seo_title = input.seo_title;
  if (input.seo_description !== undefined) patch.seo_description = input.seo_description;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (publish === true) { patch.status = "published"; patch.published_at = new Date().toISOString(); }
  if (publish === false) { patch.status = "draft"; }
  // Visibility is committed only by a publish (see SaveInput.visibility).
  if (publish === true && visibility) {
    patch.visibility = visibility;
    // Going private: the pre-rendered share loops live in a public bucket;
    // drop the pointer here and the files below.
    if (visibility === "private") {
      patch.art_direction = withoutShare((patch.art_direction ?? existing?.art_direction) as Record<string, unknown> | null);
    }
  }

  const { error } = await supabase
    .from("stories")
    .update(patch)
    .eq("id", input.id)
    .eq("author_id", profile.id);
  if (error) return { ok: false, message: error.message };

  if (publish === true && visibility === "private") {
    await purgeShareLoops(input.id, (existing?.art_direction as { share?: unknown } | null)?.share);
  }

  revalidatePath(`/write/${input.id}`);
  revalidatePublicSurfaces(profile.handle, slug);

  if (publish === true) {
    await captureServer("story_published", profile.id, {
      story_id: input.id,
      format: input.art_direction?.format ?? "standard",
      mood: input.art_direction?.atmosphere?.mood ?? "auto",
      has_imagery: Boolean(input.imagery),
      is_first_publish: !existing?.published_at,
      visibility: visibility ?? (existing?.visibility as StoryVisibility | undefined) ?? "public",
    }).catch(() => {});
    const before = ((existing?.visibility as StoryVisibility | undefined) ?? "public");
    if (visibility && existing?.status === "published" && visibility !== before) {
      await captureServer("story_visibility_changed", profile.id, { story_id: input.id, from: before, to: visibility }).catch(() => {});
    }
  } else if (publish === false) {
    await captureServer("story_unpublished", profile.id, { story_id: input.id }).catch(() => {});
  }

  return { ok: true, slug };
}

export async function saveDraftAction(input: SaveInput) { return persist(input, null); }
export async function publishAction(input: SaveInput) { return persist(input, true); }
export async function unpublishAction(input: SaveInput) { return persist(input, false); }

export type SetVisibilityResult =
  | { ok: true; visibility: StoryVisibility; changed: boolean }
  | { ok: false; message: string };

/**
 * Flip ONE story between public and private — without republishing it.
 *
 * Touches only `visibility` (plus the share-loop pointer when going private):
 * the row, its content, slug, published_at and URL are untouched, so nothing
 * is duplicated or lost, and a private story keeps its link for the day it
 * goes public again. Runs as the signed-in writer, so the `update own stories`
 * RLS policy — not this code — is what stops anyone flipping someone else's.
 */
export async function setVisibilityAction(id: string, next: StoryVisibility): Promise<SetVisibilityResult> {
  const visibility = parseVisibility(next);
  if (!visibility) return { ok: false, message: "Visibility must be public or private." };
  const profile = await myProfile();
  if (!profile) return { ok: false, message: "Sign in to change this." };

  const supabase = await supabaseServer();
  const { data: row } = await supabase
    .from("stories")
    .select("id, slug, status, visibility, art_direction")
    .eq("id", id)
    .eq("author_id", profile.id)
    .maybeSingle();
  if (!row) return { ok: false, message: "Couldn't find that piece." };

  const before = (row.visibility as StoryVisibility) ?? "public";
  if (before === visibility) return { ok: true, visibility, changed: false };

  const patch: Record<string, unknown> = { visibility };
  if (visibility === "private") patch.art_direction = withoutShare(row.art_direction as Record<string, unknown> | null);

  const { data: updated, error } = await supabase
    .from("stories")
    .update(patch)
    .eq("id", id)
    .eq("author_id", profile.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!updated) return { ok: false, message: "Couldn't update that piece." };

  if (visibility === "private") {
    await purgeShareLoops(id, (row.art_direction as { share?: unknown } | null)?.share);
  }

  revalidatePath(`/write/${id}`);
  revalidatePublicSurfaces(profile.handle, row.slug as string);
  await captureServer("story_visibility_changed", profile.id, { story_id: id, from: before, to: visibility }).catch(() => {});
  return { ok: true, visibility, changed: true };
}

export async function deleteStoryAction(id: string) {
  const profile = await myProfile();
  if (!profile) redirect("/login");
  const supabase = await supabaseServer();
  await supabase.from("stories").delete().eq("id", id).eq("author_id", profile.id);
  revalidatePath(`/@${profile.handle}`);
  revalidatePath("/wander");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms-full.txt");
  redirect(`/@${profile.handle}`);
}

/**
 * CLAIM LINKS — thin wrappers so the editor talks to lib/claim.ts the same
 * way it talks to everything else here: a plain async action it can call
 * from a transition and get a result back, no redirect, no page reload.
 */

export async function createClaimLinkAction(storyId: string): Promise<CreateClaimResult> {
  const res = await createClaimLink(storyId);
  if (res.ok) revalidatePath(`/write/${storyId}`);
  return res;
}

export async function revokeClaimLinkAction(storyId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await revokeClaimLink(storyId);
  if (res.ok) revalidatePath(`/write/${storyId}`);
  return res;
}
