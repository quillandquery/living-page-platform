import { NextResponse } from "next/server";
import { type BrainCast } from "@/lib/brain/castWithAI";
import { generatePage } from "@/lib/brain/generatePage";
import * as router from "@/lib/brain/router";

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
  let body: { text?: string; title?: string; cast?: BrainCast; tier?: "haiku" | "sonnet" | "opus"; maxTokens?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 }); }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });

  // Optional per-call overrides (tuning / comparison). Ignored unless valid.
  const tier = ["haiku", "sonnet", "opus"].includes(body.tier as string) ? body.tier : undefined;
  const maxTokens = typeof body.maxTokens === "number" && body.maxTokens >= 1000 && body.maxTokens <= 20000 ? body.maxTokens : undefined;

  const result = await generatePage(text, body.title, body.cast, { tier, maxTokens });
  return NextResponse.json({ ...result, diag: router.lastDiag });
}
