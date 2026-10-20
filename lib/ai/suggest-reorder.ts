import "server-only";

/**
 * SECTION ORDER — an opt-in, explicit, structural suggestion. The one part
 * of the tightening pass that needs real judgment rather than pattern-
 * matching (whether the punch lands too early, whether a scene-setting
 * paragraph would work better nearer the top), so unlike PHRASING/
 * EMBODIMENT/PUNCH/LENGTH in `lib/writing-opportunities.ts` this is not a
 * heuristic — it is the same kind of narrow, opt-in LLM exception as
 * `lib/ai/nudge-fallback.ts` and `lib/ai/suggest-line.ts`, held to the same
 * rule those two are held to:
 *
 *  - never runs automatically. Only fires from a writer's explicit "check
 *    the order" click in the tightening pass.
 *  - CANNOT invent, drop, or reword a single word. The model may only
 *    choose an ORDER for the writer's own paragraphs — it is asked for a
 *    permutation of paragraph indices, nothing else, and the result is
 *    verified server-side (§ "THE LOAD-BEARING CHECK" below) before it's
 *    trusted. Anything that isn't a clean permutation of the exact input
 *    length is discarded, never shown.
 *  - never applies itself. The suggested order only ever reaches the draft
 *    through the writer's own "use this order" click in
 *    `components/living/TightenPass.tsx` — same chain of custody as every
 *    other action in that pass.
 *  - server-only, one call per explicit click, a small model, bounded
 *    input size.
 *
 * This does not conflict with `/about`'s "the words themselves are never
 * altered, reordered, or hidden by this process" — that promise is about
 * the RENDERING step (a reader's page is never rearranged behind the
 * writer's back). This runs earlier, in the writer's own pre-publish edit,
 * gated behind their own click, same as choosing "keep this" over "keep
 * that" already was in the original tightening pass.
 */

const SYSTEM_PROMPT = `You are a quiet structural editor helping with a personal story. You will be given the writer's own paragraphs, in order, each numbered.

Decide whether a DIFFERENT order of these SAME paragraphs would make the piece land better — the strongest line arriving at the right moment, tension building before it resolves, a scene-setting paragraph sitting where it orients the reader instead of where it interrupts. Do not judge the sentences themselves, only their sequence.

You may NOT add, remove, merge, split, or reword a single paragraph. Every paragraph must appear in your answer exactly once, unmodified, referenced only by its original number.

Return ONLY a JSON object (no prose before or after), shaped EXACTLY as:
{"order": [<the paragraph numbers, in the order you'd place them — every number from the input exactly once>], "rationale": "<one short, plain, editorial sentence — this product's voice is terse, e.g. \\"Your strongest line was buried third; it works harder as the opening.\\" Never chatty, never a compliment.>"}

If the current order already works, return the numbers in their original order (0,1,2,...) and a rationale saying so, in that same terse voice — e.g. "This already runs in the right order."`;

export type ReorderSuggestion = {
  /** a permutation of 0..paragraphs.length-1 — verified server-side */
  order: number[];
  rationale: string;
  /** true when `order` is the identity permutation (no change suggested) */
  unchanged: boolean;
};

type RawResponse = { order?: unknown; rationale?: unknown };

function isValidPermutation(order: unknown, n: number): order is number[] {
  if (!Array.isArray(order) || order.length !== n) return false;
  const seen = new Set<number>();
  for (const v of order) {
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v >= n) return false;
    if (seen.has(v)) return false;
    seen.add(v);
  }
  return seen.size === n;
}

function extractJsonObject(text: string): RawResponse | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as RawResponse) : null;
  } catch {
    return null;
  }
}

const MAX_PARAGRAPHS = 24; // a reorder suggestion this size or larger stops being a quick read for the writer to evaluate
const MAX_CHARS = 6000; // a generous but bounded read — matches nudge-fallback.ts's own cap

/** `paragraphs` — the writer's own paragraphs, split exactly the way the
 *  tightening pass already splits them (blank-line separated), in order.
 *  Returns `null` on any failure (missing key, network error, bad/invalid
 *  response, too large a draft) — fails quiet, same as the other opt-in
 *  assists; the UI treats `null` as "nothing to suggest right now". */
export async function suggestParagraphReorder(paragraphs: string[]): Promise<ReorderSuggestion | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || paragraphs.length < 3 || paragraphs.length > MAX_PARAGRAPHS) return null;

  const joined = paragraphs.map((p, i) => `[${i}] ${p}`).join("\n\n");
  if (joined.length > MAX_CHARS) return null;

  let text: string;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: joined }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    text = data.content?.find((b) => b.type === "text")?.text ?? "";
  } catch {
    return null;
  }

  const parsed = extractJsonObject(text);
  if (!parsed) return null;

  // THE LOAD-BEARING CHECK — the one thing that has to be true for this to
  // be safe to show: the model's answer is a genuine permutation of every
  // paragraph the writer wrote, nothing added, nothing missing, nothing
  // duplicated. Anything else is discarded here, server-side, before it
  // ever reaches the writer.
  if (!isValidPermutation(parsed.order, paragraphs.length)) return null;
  if (typeof parsed.rationale !== "string" || !parsed.rationale.trim()) return null;

  const order = parsed.order as number[];
  const unchanged = order.every((v, i) => v === i);
  return { order, rationale: parsed.rationale.trim().slice(0, 240), unchanged };
}
