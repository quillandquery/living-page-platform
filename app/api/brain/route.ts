import { NextResponse } from "next/server";
import { castWithAI } from "@/lib/brain/castWithAI";

/**
 * POST /api/brain  { text, title? } → { ok, cast } | { ok:false, reason }
 * Stage-2 brain (D11): Claude reads the story and casts a style. Server-side so
 * ANTHROPIC_API_KEY never reaches the client. Falls back cleanly with no key.
 */
export async function POST(req: Request) {
  let body: { text?: string; title?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 }); }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  const result = await castWithAI(text, body.title);
  return NextResponse.json(result);
}
