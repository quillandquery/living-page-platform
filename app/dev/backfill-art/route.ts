import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { extractStoryProfile } from "@/lib/semantic-profile";
import { generateArtDirection } from "@/lib/art-direction/generate";
import type { StoryRow } from "@/lib/types";

/**
 * DEV-ONLY BACKFILL — give every story a real art direction.
 *
 * Most rows predate Story Visual System 2.0 and carry `art_direction:
 * {}`, so the reader renders them stripped: no artwork, no signature, no
 * material, no composition. That is not a share-preview problem, it is a
 * data problem — and it makes every downstream visual look empty.
 *
 * This runs the SAME `generateArtDirection(raw, profile, opts)` the
 * editor runs (app/write/[id]/editor.tsx), with the writer's own saved
 * backdrop preserved as `environmentOverride` so a deliberate world pick
 * is never overwritten by the engine's guess. Deterministic: re-running
 * it produces identical output.
 *
 * Runs with the service-role key so it covers EVERY author's rows in one
 * pass (the stories are split across `reshikaa30` and `headinclouds`, and
 * a session-scoped run only ever sees one of them). That deliberately
 * bypasses RLS, which is why the whole route is dev-gated above and does
 * nothing in production.
 *
 * Additive, per D4 — it only fills `art_direction`; nothing else on the
 * row is touched, and `?dry=1` writes nothing at all.
 *
 *   GET /dev/backfill-art?dry=1   → report what would change
 *   GET /dev/backfill-art         → write it
 *   GET /dev/backfill-art?force=1 → regenerate even complete rows
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "dev only" }, { status: 404 });
  }

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const force = url.searchParams.get("force") === "1";
  // Drafts are in-progress work (sometimes another account's) and need no
  // share assets, so writes are published-only unless explicitly widened.
  const scope = url.searchParams.get("scope") === "all" ? "all" : "published";

  // Prefer the service role — it covers every author in one pass. If the
  // key is missing or rejected, fall back to the signed-in writer's own
  // session, which still works (RLS-scoped to their rows) and needs no
  // secret. Either path gets the job done; neither is required.
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let db: SupabaseClient | null = null;
  let mode = "service-role";

  if (SUPABASE_URL && SERVICE_KEY) {
    const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const probe = await svc.from("stories").select("id").limit(1);
    if (!probe.error) db = svc;
  }

  if (!db) {
    mode = "session";
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      return Response.json({
        error: "service-role key rejected AND not signed in",
        fix: "either paste a working SUPABASE_SERVICE_ROLE_KEY into .env.local and restart dev, or sign in at /login as the author whose stories need backfilling (reshikaa30)",
      }, { status: 401 });
    }
    db = sb;
  }

  const q = db.from("stories").select("*, author:profiles(handle)").order("created_at", { ascending: true });
  const { data, error } = mode === "session"
    ? await q.eq("author_id", (await db.auth.getUser()).data.user!.id)
    : await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Array<StoryRow & { author?: { handle: string } | null }>;
  const report: Array<Record<string, unknown>> = [];

  for (const row of rows) {
    const existing = row.art_direction ?? {};
    const keyCount = Object.keys(existing).length;
    // "usable" is the same bar the reader applies (isCompleteArtDirection)
    const usable = "environment" in existing && "artStyle" in existing && "signature" in existing;

    if (usable && !force) {
      report.push({ slug: row.slug, handle: row.author?.handle, status: row.status, action: "skipped", keys: keyCount });
      continue;
    }

    // Same inputs the editor uses: the writer's raw prose, its semantic
    // profile, and their explicit world pick when they made one.
    if (scope === "published" && row.status !== "published") {
      report.push({ slug: row.slug, handle: row.author?.handle, status: row.status, action: "out-of-scope", keys: keyCount });
      continue;
    }

    const raw = (row.source ?? "").trim() || row.fragment || "";
    if (!raw) {
      report.push({ slug: row.slug, handle: row.author?.handle, status: row.status, action: "no-source", keys: keyCount });
      continue;
    }

    const profile = extractStoryProfile(raw);
    const ad = generateArtDirection(raw, profile, {
      environmentOverride: row.backdrop ?? undefined,
    });

    if (!dry) {
      const { error: upErr } = await db.from("stories").update({ art_direction: ad }).eq("id", row.id);
      if (upErr) {
        report.push({ slug: row.slug, handle: row.author?.handle, status: row.status, action: "error", message: upErr.message });
        continue;
      }
    }

    report.push({
      slug: row.slug,
      handle: row.author?.handle,
      status: row.status,
      action: dry ? "would-write" : "written",
      before: keyCount,
      after: Object.keys(ad).length,
      environment: ad.environment.key,
      mood: ad.atmosphere.mood,
      look: ad.look,
      palette: ad.palette?.key,
      material: ad.material.key,
      composition: ad.composition.key,
      artwork: ad.artwork?.length ?? 0,
      signature: ad.signature?.doodle,
    });
  }

  return Response.json({
    mode, dry, force, scope,
    total: rows.length,
    changed: report.filter((r) => r.action === "written" || r.action === "would-write").length,
    report,
  }, { status: 200 });
}
