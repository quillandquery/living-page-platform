import { NextResponse } from "next/server";
import { polish } from "@/lib/brain/polish";

/**
 * POST /api/brain/polish  { text, title? } → { ok, title, text, notes, annotations }
 * The editor pass: clean + structure the writer's text (Sonnet), voice intact.
 */
export async function POST(req: Request) {
  let body: { text?: string; title?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 }); }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  return NextResponse.json(await polish(text, body.title));
}
