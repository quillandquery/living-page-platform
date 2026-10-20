import "server-only";

/**
 * THE FALLBACK PASS — an explicit, opt-in exception to D1 ("heuristic, no
 * LLM"), scoped as narrowly as the tradeoff allows:
 *
 *  - never runs automatically. `lib/writing-opportunities.ts` always runs
 *    first, for free, instantly, in the browser. This only fires when that
 *    pass found NOTHING and the writer clicks "look closer" — an informed,
 *    per-draft choice, not a background call.
 *  - server-only (the "server-only" import makes this a build error if
 *    ever pulled into client code) — the API key never reaches the browser.
 *  - still can't ghostwrite: the model is told, in the system prompt, to
 *    only ask questions in the existing nudge voice, never to rewrite or
 *    invent — and every returned `quote`/`secondQuote` is verified against
 *    the actual draft text server-side before it's trusted. Anything the
 *    model claims that isn't a real, verbatim substring of the draft is
 *    dropped, never shown to the writer (§13's "no invention", enforced in
 *    code rather than only in the prompt).
 *  - one call per distinct draft (the caller in components/living/Nudge.tsx
 *    remembers what it already asked about), a small, cheap model, and a
 *    hard cap on input size — this is a fallback, not a running feature.
 */
import { hashId, type WritingOpportunity, type OpportunityType } from "@/lib/writing-opportunities";

const SYSTEM_PROMPT = `You are a quiet writing editor embedded in Living Page, a personal storytelling tool. You never write, rewrite, improve, or embellish the writer's prose — you only notice things and ask short, specific questions, the way a human editor sitting beside the writer would.

You will be given a draft. A deterministic pass already checked it and found nothing obvious, so look closer — but only surface something if it is genuinely there in the writer's own words.

Return ONLY a JSON array (no prose before or after), up to 3 items, each shaped EXACTLY as:
{"type": "repetition"|"vague"|"imagery"|"moment"|"tension"|"telling"|"opening"|"buriedLine", "quote": "<a verbatim substring of the draft, copied exactly, character for character>", "secondQuote": "<verbatim substring, ONLY for repetition or tension, otherwise omit>", "observation": "<a short, all-caps headline, 2-6 words>", "question": "<one short, specific question>"}

Hard rules:
- "quote" and "secondQuote" MUST be copied exactly from the draft — not paraphrased, not summarized, not corrected for grammar. If you cannot quote something exactly, do not include that item.
- Never invent detail, imagery, or emotion the writer did not write.
- Never praise, evaluate, or say anything like "great job", "this is well written", "consider revising", or "I love this line".
- Voice matches these examples exactly: "STAY HERE", "WHAT DID THAT LOOK LIKE?", "THIS FEELS IMPORTANT", "IS THAT WORTH STAYING WITH?", "DON'T TELL ME YET", "KEEP THIS", "YOU'VE SAID THIS TWICE". Terse and editorial, never conversational, never a chatbot.
- If there is truly nothing worth asking about, return [].`;

const VALID_TYPES = new Set<OpportunityType>(["repetition", "vague", "imagery", "moment", "tension", "telling", "opening", "buriedLine"]);

type RawItem = { type?: string; quote?: string; secondQuote?: string; observation?: string; question?: string };

function extractJsonArray(text: string): unknown[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Only ever called when the heuristic pass already ran and found nothing,
 *  and the writer explicitly asked for a closer read. Returns `[]` on any
 *  failure (missing key, network error, bad response) — this is a
 *  fallback, so it fails quiet, never blocks the writer. */
export async function suggestFallbackOpportunities(raw: string): Promise<WritingOpportunity[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !raw.trim()) return [];

  const draft = raw.slice(0, 6000); // a generous but bounded read — this is a fallback, not a transcript service

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
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: draft }],
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    text = data.content?.find((b) => b.type === "text")?.text ?? "";
  } catch {
    return [];
  }

  const items = extractJsonArray(text) as RawItem[];
  const out: WritingOpportunity[] = [];
  for (const item of items) {
    if (!item || typeof item.quote !== "string" || typeof item.type !== "string") continue;
    if (!VALID_TYPES.has(item.type as OpportunityType)) continue;
    // THE LOAD-BEARING CHECK (§13 "no invention") — a model claim only
    // becomes a nudge if it is an exact, verbatim substring of what the
    // writer actually typed. Anything else is a hallucination and is
    // silently dropped, never shown.
    if (!draft.includes(item.quote)) continue;
    if (item.secondQuote && !draft.includes(item.secondQuote)) continue;
    if (!item.observation || !item.question) continue;
    out.push({
      id: hashId("fallback-" + item.type, item.quote + "|" + (item.secondQuote ?? "")),
      type: item.type as OpportunityType,
      priority: 0.4, // below every heuristic finding — this only ever fills a gap, never outranks the free pass
      paragraphIndex: 0,
      quote: item.quote,
      secondQuote: item.secondQuote,
      observation: item.observation.toUpperCase(),
      question: item.question,
    });
    if (out.length >= 3) break;
  }
  return out;
}
