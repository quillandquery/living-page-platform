import "server-only";

/**
 * THE EDITOR — a sensitive copy-edit + structure pass.  (docs/BRAIN-API.md)
 *
 * Cleans a writer's raw text WITHOUT changing their voice: fixes spelling,
 * light grammar and punctuation, breaks a wall of text into paragraphs, marks
 * scene shifts with a section break, and suggests a plain title if there's
 * none. It never rewrites phrasing, imagery, vocabulary, or ideas — the words
 * stay the writer's own. Cheap tier (Sonnet). Server-only.
 */

import { callClaude, extractJson } from "@/lib/brain/router";

export type PolishResult =
  | { ok: true; title: string; text: string; notes: string; annotations: string[] }
  | { ok: false; reason: "no-key" | "api-error" | "invalid"; detail?: string };

const SYSTEM = `You are a sensitive copy-editor for Living Page. You clean and structure a writer's raw personal writing WITHOUT changing their voice.

DO:
1. Fix spelling.
2. Fix clear grammar errors (tense, agreement, obvious slips) — lightly.
3. Normalise punctuation: fix missing/ doubled marks; add a period, or ONE earned exclamation mark, where the writer clearly intended emphasis. Never use "!!!".
4. Break the text into natural PARAGRAPHS — one blank line between them — especially if it arrived as one wall of text. Each paragraph is a beat.
5. Insert a section break — a line containing exactly "* * *" — ONLY where the story clearly shifts scene, time, or place. Most short pieces need none.
6. If the piece has no title of its own, suggest a short, plain one in the writer's spirit (never clickbait, never a summary).
7. Pull out any true ASIDE — a parenthetical or a small self-aware tangent — as a margin annotation (a short phrase), and keep the main text clean. At most 2.

DO NOT rewrite the writer's phrasing, word choices, imagery, sentence rhythm or voice. DO NOT add, remove, reorder, or summarise ideas. Every sentence stays the writer's own — you are tidying, not authoring.

Return ONLY this JSON, no prose, no markdown:
{"title":"<a title, or empty string if the piece already names itself>","text":"<the cleaned, paragraph- and section-broken text; keep the writer's words>","annotations":["<short aside>", ...],"notes":"<one short line on what you changed>"}`;

export async function polish(text: string, title?: string): Promise<PolishResult> {
  const user = `${title ? `Existing title: ${title}\n\n` : ""}Raw writing:\n${text.slice(0, 8000)}`;
  const res = await callClaude("sonnet", SYSTEM, user, 4000);
  if (!res.ok) return res;
  if (!res.text.trim()) return { ok: false, reason: "invalid", detail: "empty response" };
  try {
    const o = extractJson(res.text) as Record<string, unknown>;
    const cleaned = typeof o.text === "string" ? o.text.trim() : "";
    if (!cleaned) return { ok: false, reason: "invalid", detail: "no text in reply" };
    return {
      ok: true,
      title: typeof o.title === "string" ? o.title.trim() : "",
      text: cleaned,
      notes: typeof o.notes === "string" ? o.notes.trim() : "",
      annotations: Array.isArray(o.annotations) ? (o.annotations as unknown[]).map(String).slice(0, 2) : [],
    };
  } catch (e) {
    return { ok: false, reason: "invalid", detail: `parse failed: ${e instanceof Error ? e.message : ""}` };
  }
}
