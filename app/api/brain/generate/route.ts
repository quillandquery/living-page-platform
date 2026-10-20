import { NextResponse } from "next/server";
import { castWithAI, type BrainCast } from "@/lib/brain/castWithAI";
import { generatePage } from "@/lib/brain/generatePage";

/**
 * POST /api/brain/generate  { text, title?, cast? } → { ok, html } | { ok:false, reason }
 * Stage 4 (Opus, gated): generate a bespoke self-contained living page. If the
 * caller didn't pass a Stage-1 cast, we run it first (Sonnet) for art direction.
 * Server-side; the key never reaches the client. Opus runs here only.
 */
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { text?: string; title?: string; cast?: BrainCast };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 }); }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });

  // The read is only art-direction guidance — a hiccup here must NOT block
  // generation. Proceed with whatever we got (possibly none).
  let cast = body.cast;
  if (!cast) {
    const c = await castWithAI(text, body.title);
    if (c.ok) cast = c.cast;
  }
  const result = await generatePage(text, body.title, cast);
  return NextResponse.json(result);
}
