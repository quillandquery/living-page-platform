import { NextResponse } from "next/server";
import { type BrainCast } from "@/lib/brain/castWithAI";
import { generatePage } from "@/lib/brain/generatePage";

/**
 * POST /api/brain/generate  { text, title?, cast? } → { ok, html } | { ok:false, reason }
 * Stage 4 (gated): generate a bespoke self-contained living page. The generator
 * prompt is self-sufficient (it draws its own palette from the story), so we do
 * NOT run a second "cast" call here — that only added ~5-10s and another point of
 * failure to an already-long request. We honour a cast ONLY if the client already
 * computed one (the Auto pass) and passed it along. Server-side; key never leaves.
 */
// A rich, dense page can take 80-120s to author. Give the function real headroom
// so a long story doesn't get killed mid-generation and 504 (which the client
// then shows as "couldn't reach the brain"). 300s is the Pro ceiling.
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: { text?: string; title?: string; cast?: BrainCast };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 }); }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });

  const result = await generatePage(text, body.title, body.cast);
  return NextResponse.json(result);
}
