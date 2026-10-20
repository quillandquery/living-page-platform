import "server-only";

/**
 * ONE OPT-IN SUGGESTED LINE — the bounded exception the writer explicitly
 * asked for (see the "asks and suggest, opt-in per line" decision): the
 * nudge questions still ask first, same as always; this only runs when a
 * writer taps "suggest a line" on a specific nudge, and its output never
 * touches the draft on its own.
 *
 * The chain of custody stays intact even here: `suggestLine` only ever
 * pre-fills the SAME response textarea the writer would otherwise type
 * into by hand (see components/living/Nudge.tsx's `NudgeCard`) — it still
 * has to go through the writer's own "add detail" click to reach the
 * draft, exactly like a typed answer would. Nothing is ever inserted
 * silently, and the writer can edit or delete the suggestion before it
 * goes anywhere.
 *
 * Deliberately scoped tiny: one short line, never a paragraph, never a
 * rewrite of the writer's own sentence (except the one narrow exception
 * §8's tightening pass adds — "phrasing" — where the ask IS a rewrite of
 * the exact quoted sentence, not an addition after it; see MODE below) —
 * the gap this fills is a missing gesture/sensory beat/phrase, the same
 * scale a nudge already asks for.
 */
import type { OpportunityType } from "@/lib/writing-opportunities";

const SYSTEM_PROMPT = `You help a writer fill ONE small gap in their own draft, or in one narrow case reword ONE worn phrase — never more than that. You are NOT writing their story — this is an explicit, opt-in suggestion the writer asked to see, which they may use as-is, edit, or throw away entirely.

You will be given the kind of gap (imagery/vague phrasing/an important moment/a tension/telling-not-showing/a generic opening/a worn phrase/a missing physical beat), the writer's own sentence(s) it's attached to, and a MODE:

- MODE=addition (imagery, vague, moment, tension, telling, opening, embodiment): propose ONE short line — a phrase or a single sentence — that could follow the quoted sentence as its next beat. Matches the SCALE of what's missing (a gesture, a sensory detail, a physical reaction), never a paragraph, never generic ("it was beautiful"). For "embodiment" specifically: a concrete, physical, bodily beat (breath, hands, a held muscle, a swallow) — the evidence a reader believes a feeling by, not a restatement of the feeling itself.
- MODE=rewrite (phrasing only): the quoted sentence leans on a worn phrase. Rewrite the WHOLE sentence, keeping its meaning and roughly its length, but replacing the generic phrase with something concrete and specific to what's actually being described — the version only this writer, about this exact moment, would say.

Either way: write it the way a person recalling their own memory would — concrete, specific, plain, in a register close to the sentence given. Never flowery, never a purple rewrite.

Output ONLY the suggested line itself. No quotation marks. No preamble like "Here's a suggestion:". No explanation.`;

export async function suggestLine(input: {
  type: OpportunityType;
  quote: string;
  secondQuote?: string;
  question: string;
}): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const mode = input.type === "phrasing" ? "rewrite" : "addition";
  const userContent = [
    `Gap type: ${input.type}`,
    `Mode: ${mode}`,
    `Sentence: ${input.quote}`,
    input.secondQuote ? `Second sentence: ${input.secondQuote}` : null,
    `Question asked: ${input.question}`,
  ].filter(Boolean).join("\n");

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
        max_tokens: 80, // one short line — this is a suggestion, not a paragraph generator
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((b) => b.type === "text")?.text?.trim();
    if (!text) return null;
    return text.replace(/^["'“‘]+|["'”’]+$/g, "").slice(0, 300); // strip stray quote marks, hard cap length
  } catch {
    return null;
  }
}
