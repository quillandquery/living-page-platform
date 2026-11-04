import "server-only";
import { supabaseServer } from "./supabase/server";
import type { Profile, StoryRow, StoryWithAuthor } from "./types";
import { canViewStory, isPrivate } from "./visibility";

/**
 * READ SIDE.
 *
 * Every query here runs through the request-bound server client, so Row Level
 * Security decides what comes back: strangers only ever see published PUBLIC
 * rows, the signed-in writer sees their own drafts and private stories too.
 * The database enforces privacy whether or not this file remembers to — but
 * a writer's own private rows pass RLS, so the public-surface queries below
 * ALSO filter `visibility = 'public'` explicitly (see the note on them).
 */

// `stories` has TWO foreign keys to `profiles` (author_id, and seeded_by from
// migration 0003). A bare `profiles(*)` embed is ambiguous to PostgREST
// (PGRST201) and fails the whole query — so name the FK column explicitly.
const STORY_SELECT = "*, author:profiles!author_id(*)";

function logQueryError(where: string, error: { message: string } | null) {
  if (error) console.error(`[db.${where}]`, error.message);
}

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

/**
 * PUBLIC vs PRIVATE (migration 0006).
 *
 * RLS already hides another writer's private rows from everyone else — but a
 * writer's OWN private rows pass RLS, so a signed-in author's feed query would
 * happily return them. Every query that feeds a PUBLIC surface (Wander, the
 * sitemap, llms-full, read-next, a writer's public page) therefore states the
 * rule itself: `status = published AND visibility = public`. Only the queries
 * at the bottom (myStories / myStory / writerPage-as-owner / publishedStory
 * for its own author) can ever return a private story, and only to its author.
 */

/** The public feed: every published, PUBLIC story, newest first. */
export async function publishedFeed(limit = 60): Promise<StoryWithAuthor[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("stories")
    .select(STORY_SELECT)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .limit(limit);
  logQueryError("publishedFeed", error);
  return (data as StoryWithAuthor[]) ?? [];
}

/** One published story, addressed the way readers address it: handle + slug.
 *
 *  A PRIVATE story resolves only for its own author — everyone else (signed
 *  out, or another writer) gets `null`, i.e. the same 404 as a story that
 *  never existed, so its existence isn't confirmed either. RLS already
 *  enforces this; the explicit check keeps it true even if a policy is ever
 *  loosened by mistake. */
export async function publishedStory(handle: string, slug: string): Promise<StoryWithAuthor | null> {
  const author = await profileByHandle(handle);
  if (!author) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("stories")
    .select(STORY_SELECT)
    .eq("author_id", author.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  logQueryError("publishedStory", error);
  const story = (data as StoryWithAuthor) ?? null;
  if (!story) return null;
  if (isPrivate(story)) {
    // only pay for the auth lookup when the answer matters
    const user = await currentUser();
    if (!canViewStory(story, user?.id)) return null;
  }
  return story;
}

/** Every published PUBLIC story except one — for "keep going" / Wander, where
 * the reader shouldn't be handed the piece they just finished. */
export async function otherPublishedStories(excludeId: string, limit = 200): Promise<StoryWithAuthor[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("stories")
    .select(STORY_SELECT)
    .eq("status", "published")
    .eq("visibility", "public")
    .neq("id", excludeId)
    .order("published_at", { ascending: false })
    .limit(limit);
  logQueryError("otherPublishedStories", error);
  return (data as StoryWithAuthor[]) ?? [];
}

/** A writer's PUBLIC collection — what a stranger sees on their page. Used
 * for metadata / structured data / descriptions too, so a private title or
 * count can never reach page source that a crawler or another reader sees. */
export async function writerStories(handle: string): Promise<{ author: Profile; stories: StoryRow[] } | null> {
  const author = await profileByHandle(handle);
  if (!author) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("author_id", author.id)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false });
  return { author, stories: (data as StoryRow[]) ?? [] };
}

/** A writer's page AS THE CURRENT VIEWER sees it. Strangers get exactly
 * `writerStories` (public only). The writer themself also gets their private
 * stories, flagged by `visibility`, plus `isOwner`. The viewer is resolved
 * here from the session — callers can't claim to be the owner. */
export async function writerPage(
  handle: string,
): Promise<{ author: Profile; stories: StoryRow[]; isOwner: boolean } | null> {
  const author = await profileByHandle(handle);
  if (!author) return null;
  const user = await currentUser();
  const isOwner = user?.id === author.id;
  const supabase = await supabaseServer();
  let q = supabase
    .from("stories")
    .select("*")
    .eq("author_id", author.id)
    .eq("status", "published");
  if (!isOwner) q = q.eq("visibility", "public");
  const { data } = await q.order("published_at", { ascending: false });
  return { author, stories: (data as StoryRow[]) ?? [], isOwner };
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
