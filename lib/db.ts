import "server-only";
import { supabaseServer } from "./supabase/server";
import type { Profile, StoryRow, StoryWithAuthor } from "./types";

/**
 * READ SIDE.
 *
 * Every query here runs through the request-bound server client, so Row Level
 * Security decides what comes back: the feed and the reader only ever see
 * published rows, the dashboard sees the signed-in writer's own drafts too.
 * The filters below are for ordering and shape, not for privacy — the
 * database enforces privacy whether or not this file remembers to.
 */

const STORY_SELECT = "*, author:profiles(*)";

export async function currentUser() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** The signed-in writer's profile, or null if they haven't onboarded yet. */
export async function myProfile(): Promise<Profile | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile) ?? null;
}

export async function profileByHandle(handle: string): Promise<Profile | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("profiles").select("*").eq("handle", handle).maybeSingle();
  return (data as Profile) ?? null;
}

export async function handleTaken(handle: string): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("profiles").select("id").eq("handle", handle).maybeSingle();
  return !!data;
}

/** The public feed: every published story, newest first. */
export async function publishedFeed(limit = 60): Promise<StoryWithAuthor[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("stories")
    .select(STORY_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data as StoryWithAuthor[]) ?? [];
}

/** One published story, addressed the way readers address it: handle + slug. */
export async function publishedStory(handle: string, slug: string): Promise<StoryWithAuthor | null> {
  const author = await profileByHandle(handle);
  if (!author) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("stories")
    .select(STORY_SELECT)
    .eq("author_id", author.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as StoryWithAuthor) ?? null;
}

/** A writer's published collection, for their public page. */
export async function writerStories(handle: string): Promise<{ author: Profile; stories: StoryRow[] } | null> {
  const author = await profileByHandle(handle);
  if (!author) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("author_id", author.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return { author, stories: (data as StoryRow[]) ?? [] };
}

/** The signed-in writer's own stories — drafts and published — for the dashboard. */
export async function myStories(): Promise<StoryRow[]> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("author_id", user.id)
    .order("updated_at", { ascending: false });
  return (data as StoryRow[]) ?? [];
}

/** One of the signed-in writer's stories by id, for editing. */
export async function myStory(id: string): Promise<StoryRow | null> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .eq("author_id", user.id)
    .maybeSingle();
  return (data as StoryRow) ?? null;
}
