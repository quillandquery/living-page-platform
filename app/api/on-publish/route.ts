/**
 * PUBLISH → LOOP. A Supabase Database Webhook on `stories` (INSERT/UPDATE)
 * posts here the moment a story is published or edited; this forwards a
 * `repository_dispatch` to GitHub Actions, which renders + uploads the
 * moving share asset for that one story (see .github/workflows/share-loops.yml).
 *
 * Kept thin on purpose: the heavy render needs ffmpeg, which can't run in
 * a Vercel function — this only fans the event out to the worker.
 *
 * Env: SHARE_WEBHOOK_SECRET (shared with the Supabase webhook header),
 *      GH_REPO ("owner/repo"), GH_DISPATCH_TOKEN (a token that can create
 *      a repository_dispatch — fine-grained PAT with Contents: read/write,
 *      or a classic token with `repo`).
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (!process.env.SHARE_WEBHOOK_SECRET || secret !== process.env.SHARE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null) as { record?: Record<string, unknown> } | null;
  const record = body?.record ?? {};
  if (record.status !== "published" || !record.id) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  const repo = process.env.GH_REPO;
  const token = process.env.GH_DISPATCH_TOKEN;
  if (!repo || !token) {
    return NextResponse.json({ ok: false, error: "GH_REPO / GH_DISPATCH_TOKEN not set" }, { status: 500 });
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ event_type: "story-published", client_payload: { id: record.id } }),
  });
  return NextResponse.json({ ok: res.ok, id: record.id }, { status: res.ok ? 200 : 502 });
}
