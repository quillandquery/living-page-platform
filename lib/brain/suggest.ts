import "server-only";

/**
 * THE EDITOR'S SUGGESTIONS.  (docs/BRAIN-API.md) Runs as the writer pastes/pauses.
 * Returns:
 *   · cleaned — the writer's OWN words, lightly corrected and RE-BROKEN to the
 *     house rhythm: a paragraph per beat, and a punchy turn / landing line / key
 *     sentence pulled onto its own one-line paragraph. Never rewrites voice or
 *     invents content — it re-breaks and corrects.
 *   · sharpen — a few evocative nudges (highlight a phrase, propose a rewrite).
 *   · title  — a plain title if the piece has none.
 * Cheap tier (Sonnet). Server-only.
 */

import { callClaude, extractJson } from "@/lib/brain/router";

export type Sharpen = { anchor: string; mode: "replace" | "add"; question: string; suggestion: string };
export type SuggestResult =
  | { ok: true; title: string; cleaned: string; notes: string; sharpen: Sharpen[] }
  | { ok: false; reason: "no-key" | "api-error" | "invalid"; detail?: string };

const SYSTEM = `You are the editor for Living Page. You return a lightly corrected, well-STRUCTURED version of a writer's raw personal writing, plus a few evocative suggestions — all WITHOUT changing their voice or inventing content. You re-break and correct; you never rewrite.

"cleaned": the writer's OWN words, with:
- spelling, grammar and punctuation fixed;
- natural PARAGRAPH breaks at every shift in beat, time, place, or thought — one blank line between paragraphs;
- a punchy turn, a sudden reversal, a realization, a landing line, or a line of dialogue pulled onto its OWN one-line paragraph for impact. Do this 2-5 times where the writing truly earns it.
- the climactic line and any dialogue on its own line.
Keep EVERY word the writer's own. Do NOT add content, jokes, reframing, or new sentences. Do NOT change their wording beyond spelling/grammar/punctuation. This is RE-BREAKING, not rewriting.

Study this breaking rhythm (how raw prose becomes beats — note the one-line paragraphs on the turns):
RAW: "So I did what I do with everything - turning routines into my anchor. Beach walks at 6pm became the thing, until the day my routine turned against me. I walked on for 2+km..."
BROKEN:
"So I did what I do with everything: I built a routine and clung to it like a life raft. Beach walk, 6pm, every day. An anchor.

Until the anchor tried to kill me.

I walked on for two kilometres..."

"sharpen": up to 4 ways to make the writing SING. This is the creative layer — be a bold, witty editor who writes in the WRITER'S OWN voice and register. Each move either sharpens a flat / told-not-shown line into something specific and alive, reframes a cliché, or adds a landing line or a self-aware aside that earns its place. These are PROPOSALS the writer will accept or reject, so be ambitious — never generic, never purple, never off-voice.
Each has:
- "anchor": a SHORT exact substring copied from the text, marking where the move happens;
- "mode": "replace" (rewrite the anchor into something better) OR "add" (insert a new line right after the anchor's paragraph);
- "question": a one-line nudge naming the move (e.g. "a sharper image?", "land this harder?", "an aside here?");
- "suggestion": the actual new text, in the writer's voice. For "replace" it replaces the anchor; for "add" it is the new line.
Study the spirit (flat → alive):
  replace: "music makes you feel things" → "music stirs something in your chest you can't quite name"
  replace: "But artists are sad." → "But so many artists are sad, tangled up in their own grief."
  add (a landing line after the last paragraph): "No number in this story. A numbers girl told her mother she made it, and there's nothing to count."
If nothing truly earns it, [].

"title": a short, plain title in the writer's spirit if the piece has none; else "".

Return ONLY this JSON, no prose, no markdown:
{"title":"...","cleaned":"...","notes":"<one short line on what you changed>","sharpen":[{"anchor":"...","mode":"replace|add","question":"...","suggestion":"..."}]}`;

export async function suggest(text: string, title?: string): Promise<SuggestResult> {
  const user = `${title ? `Existing title: ${title}\n\n` : ""}Raw writing:\n${text.slice(0, 8000)}`;
  const res = await callClaude("sonnet", SYSTEM, user, 4000);
  if (!res.ok) return res;
  if (!res.text.trim()) return { ok: false, reason: "invalid", detail: "empty response" };
  try {
    const o = extractJson(res.text) as Record<string, unknown>;
    const cleaned = typeof o.cleaned === "string" ? o.cleaned.trim() : "";
    if (!cleaned) return { ok: false, reason: "invalid", detail: "no cleaned text" };
    const sharpen: Sharpen[] = Array.isArray(o.sharpen)
      ? (o.sharpen as Record<string, unknown>[])
          .filter((s) => typeof s.anchor === "string" && typeof s.suggestion === "string")
          .map((s) => ({ anchor: String(s.anchor), mode: s.mode === "add" ? "add" as const : "replace" as const, question: typeof s.question === "string" ? s.question : "sharper?", suggestion: String(s.suggestion) }))
          .slice(0, 4)
      : [];
    return { ok: true, title: typeof o.title === "string" ? o.title.trim() : "", cleaned, notes: typeof o.notes === "string" ? o.notes.trim() : "", sharpen };
  } catch (e) {
    return { ok: false, reason: "invalid", detail: `parse failed: ${e instanceof Error ? e.message : ""}` };
  }
}
