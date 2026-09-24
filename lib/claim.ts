import "server-only";
import crypto from "node:crypto";
import { supabaseServer } from "./supabase/server";
import { supabaseAdmin } from "./supabase/admin";
import { myProfile } from "./db";
import { SITE_URL } from "./site";
import type { StoryWithAuthor } from "./types";

/**
 * CLAIM LINKS.
 *
 * The GTM shape this exists for: you paste someone else's writing (a
 * LinkedIn post, a Substack essay, a blog they already keep) into an
 * ordinary draft — the Auto engine treats pasted prose exactly like your
 * own, nothing new to build there — generate a private link, and send it
 * to them. They see their own words turned into a living page before
 * they've made any account. One button turns "seen" into "owned": claiming
 * transfers `author_id` to them, and from that second on it is their row
 * in every sense RLS already understands.
 *
 * Three operations, three different trust levels:
 *   - createClaimLink  — you, the seeder, acting as yourself (RLS as usual)
 *   - getPendingClaim  — a stranger with a link and no session at all
 *   - finalizeClaim    — a brand-new writer, transferring a row they don't
 *                        own yet — the one moment that has to bypass RLS
 */

const TOKEN_BYTES = 18; // 24 base64url chars — unguessable, short enough to paste

function newToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

export type CreateClaimResult =
  | { ok: true; token: string; url: string }
  | { ok: false; message: string };

/** Generate (or re-fetch) the standing claim link for one of YOUR OWN
 *  drafts. Only drafts can be handed off — a piece you've already
 *  published under your own name isn't a "seed" any more. Idempotent:
 *  calling it again on an already-pending draft returns the same link
 *  rather than silently invalidating the one you already sent out. */
export async function createClaimLink(storyId: string): Promise<CreateClaimResult> {
  const profile = await myProfile();
  if (!profile) return { ok: false, message: "Sign in first." };

  const supabase = await supabaseServer();
  const { data: existing } = await supabase
    .from("stories")
    .select("status, claim_status, claim_token")
    .eq("id", storyId)
    .eq("author_id", profile.id)
    .maybeSingle();
  if (!existing) return { ok: false, message: "Couldn't find that piece." };
  if (existing.status !== "draft") {
    return { ok: false, message: "Only a draft can be handed off — unpublish it first." };
  }
  if (existing.claim_status === "pending" && existing.claim_token) {
    return { ok: true, token: existing.claim_token, url: `${SITE_URL}/claim/${existing.claim_token}` };
  }

  const token = newToken();
  const { error } = await supabase
    .from("stories")
    .update({ claim_token: token, claim_status: "pending", seeded_by: profile.id })
    .eq("id", storyId)
    .eq("author_id", profile.id);
  if (error) return { ok: false, message: error.message };

  return { ok: true, token, url: `${SITE_URL}/claim/${token}` };
}

/** Kill a link before anyone's used it — you changed your mind, or sent it
 *  to the wrong person. Safe no-op if it was never generated. */
export async function revokeClaimLink(storyId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const profile = await myProfile();
  if (!profile) return { ok: false, message: "Sign in first." };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("stories")
    .update({ claim_token: null, claim_status: "none" })
    .eq("id", storyId)
    .eq("author_id", profile.id)
    .eq("claim_status", "pending");
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** What `/claim/[token]` shows a stranger, before they've signed in to
 *  anything. Service-role: this visitor owns nothing yet, so there is no
 *  session for RLS to check the row against. Scoped tight on purpose — a
 *  single row, by its exact token, only while still pending. */
export async function getPendingClaim(token: string): Promise<StoryWithAuthor | null> {
  if (!token) return null;
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("stories")
    .select("*, author:profiles(*)")
    .eq("claim_token", token)
    .eq("claim_status", "pending")
    .maybeSingle();
  return (data as StoryWithAuthor) ?? null;
}

export type FinalizeClaimResult =
  | { ok: true; storyId: string }
  | { ok: false; message: string };

/** The actual handoff — called once the claimant has a real account and a
 *  handle. Runs as the service role because the row's current owner is
 *  whoever seeded it, not this person: normal RLS would (correctly)
 *  refuse the update. The WHERE clause doubles as the concurrency guard —
 *  Postgres only ever matches the row for the first caller to land, so two
 *  people opening the same link at once can't both win it. */
export async function finalizeClaim(token: string, claimantProfileId: string): Promise<FinalizeClaimResult> {
  if (!token) return { ok: false, message: "Missing link." };
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("stories")
    .update({
      author_id: claimantProfileId,
      claim_status: "claimed",
      claimed_at: new Date().toISOString(),
      claim_token: null,
    })
    .eq("claim_token", token)
    .eq("claim_status", "pending")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "This link has already been claimed, revoked, or never existed." };
  return { ok: true, storyId: data.id as string };
}
