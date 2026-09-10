"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { myProfile } from "@/lib/db";
import type { Block } from "@/lib/story-blocks.mjs";
import { resolveImagery } from "@/lib/media";

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

/** Create a blank draft and open its editor. */
export async function createStoryAction() {
  const profile = await myProfile();
  if (!profile) redirect("/onboarding");

  const supabase = await supabaseServer();
  // a placeholder slug unique to this row; the writer names it properly on save
  const slug = `untitled-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from("stories")
    .insert({ author_id: profile.id, slug, place: "", date: "", fragment: "", status: "draft" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create the piece.");
  redirect(`/write/${data.id}`);
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

  const slug = await uniqueSlug(profile.id, input.id, input.place || "untitled");
  const supabase = await supabaseServer();

  // image-forward register: resolve photos into the blocks. Guarded so a
  // missing key or a provider hiccup never blocks a save.
  let blocks = input.blocks;
  if (input.imagery) {
    try { blocks = await resolveImagery(input.place, input.source, input.blocks); } catch { blocks = input.blocks; }
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
  if (publish === true) { patch.status = "published"; patch.published_at = new Date().toISOString(); }
  if (publish === false) { patch.status = "draft"; }

  const { error } = await supabase
    .from("stories")
    .update(patch)
    .eq("id", input.id)
    .eq("author_id", profile.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/write");
  revalidatePath(`/write/${input.id}`);
  revalidatePath("/");
  revalidatePath(`/@${profile.handle}`);
  revalidatePath(`/@${profile.handle}/${slug}`);
  return { ok: true, slug };
}

export async function saveDraftAction(input: SaveInput) { return persist(input, null); }
export async function publishAction(input: SaveInput) { return persist(input, true); }
export async function unpublishAction(input: SaveInput) { return persist(input, false); }

export async function deleteStoryAction(id: string) {
  const profile = await myProfile();
  if (!profile) redirect("/login");
  const supabase = await supabaseServer();
  await supabase.from("stories").delete().eq("id", id).eq("author_id", profile.id);
  revalidatePath("/write");
  redirect("/write");
}
