import { NextResponse } from "next/server";
import { suggest } from "@/lib/brain/suggest";

/**
 * POST /api/brain/suggest  { text, title? } → { ok, title, fixes[], sharpen[] }
 * The editor's live suggestions (Sonnet). Called as the writer pastes/pauses.
 */
export async function POST(req: Request) {
  let body: { text?: string; title?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 }); }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  return NextResponse.json(await suggest(text, body.title));
}
