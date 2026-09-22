/**
 * SHARE CAPTIONS (Module 4, PARTS 27-28).
 *
 *   StoryContext + canonical URL → a lightweight caption the user can copy
 *   into Instagram, or share via native share sheet text.
 *
 * NO INVENTION (PART 28 / PART 41): every field here is either the
 * writer's own words or the canonical URL. No hashtags, no marketing
 * copy, no fabricated locations or emotions. If the story didn't give
 * us enough, the caption stays short — a short honest caption beats a
 * long invented one.
 */
import type { StoryContext } from "./story-context";

export type ShareCaptionInput = {
  context: StoryContext;
  canonicalUrl: string;
  authorHandle?: string | null;
};

/** Instagram-style caption: title, a summary line if we have one, the link.
 *  Never adds hashtags (PART 27); never invents (PART 28). */
export function instagramCaption({ context, canonicalUrl, authorHandle }: ShareCaptionInput): string {
  const parts: string[] = [];
  parts.push(context.title.trim());

  // Only include the summary when it's genuinely different from the title
  // (the extractive summary can fall back to the fragment when the body
  // is thin — repeating the title verbatim is noise, not signal).
  const summary = context.summary.trim();
  if (summary && summary.toLowerCase() !== context.title.trim().toLowerCase()) {
    parts.push("");
    parts.push(summary);
  }

  parts.push("");
  parts.push(`Read the whole story: ${canonicalUrl}`);
  if (authorHandle) parts.push(`by @${authorHandle} on Living Page`);
  return parts.join("\n");
}

/** The short version for native share sheet `text` field (title + summary,
 *  no URL — navigator.share puts the URL in its own `url` slot). */
export function shortShareText({ context }: { context: StoryContext }): string {
  const summary = context.summary.trim();
  if (summary && summary.toLowerCase() !== context.title.trim().toLowerCase()) {
    return summary;
  }
  return context.title.trim();
}

/** WhatsApp fallback: title + optional summary + URL on new lines, so it
 *  wraps nicely in a chat bubble (Module 4 PART 18). */
export function whatsappMessage({ context, canonicalUrl }: ShareCaptionInput): string {
  const lines: string[] = [context.title.trim()];
  const summary = context.summary.trim();
  if (summary && summary.toLowerCase() !== context.title.trim().toLowerCase()) lines.push(summary);
  lines.push(canonicalUrl);
  return lines.join("\n\n");
}

/** Email body (PART 20). */
export function emailBody({ context, canonicalUrl }: ShareCaptionInput): { subject: string; body: string } {
  const subject = context.title.trim();
  const summary = context.summary.trim();
  const lines = [context.title.trim()];
  if (summary && summary.toLowerCase() !== context.title.trim().toLowerCase()) {
    lines.push("");
    lines.push(summary);
  }
  lines.push("");
  lines.push(canonicalUrl);
  return { subject, body: lines.join("\n") };
}

/**
 * PULL-QUOTE — a single evocative line from the writer's OWN sentences,
 * for the share hero. Reuses `StoryContext.summary` (which already
 * scored every sentence and picked the best-signal one) and trims it to
 * a single-sentence, ≤120 char hook. Never invents; returns "" when the
 * extraction would just duplicate the title (headline + pull-quote of
 * the same words is worse than headline alone).
 */
const norm = (s: string) => s.trim().toLowerCase().replace(/[."'“”‘’,;:!?…\-\s]+$/g, "");

export function pullQuote(context: StoryContext, maxChars = 120): string {
  const summary = context.summary.trim();
  if (!summary) return "";

  // Take the first sentence only. StoryContext.summary can hold up to
  // two neighbouring sentences (~170 chars) — a share card wants one.
  const first = (summary.split(/(?<=[.!?…])\s+/)[0] || summary).trim();

  // If it just repeats the title, the second sentence beats a duplicate.
  const title = norm(context.title);
  const isDup = norm(first) === title || (first.length >= 12 && title.startsWith(norm(first))) || (title.length >= 12 && norm(first).startsWith(title));
  let chosen = first;
  if (isDup) {
    const rest = summary.slice(first.length).trim();
    const second = (rest.split(/(?<=[.!?…])\s+/)[0] || "").trim();
    if (second && norm(second) !== title) chosen = second;
    else return ""; // nothing to add — let the frame breathe with title-only
  }

  if (chosen.length <= maxChars) return chosen;
  // trim on a word boundary and add an ellipsis, so a long sentence still
  // reads as a line, not a truncated string.
  const cut = chosen.slice(0, maxChars - 1).replace(/\s+\S*$/, "");
  return (cut || chosen.slice(0, maxChars - 1)) + "…";
}

/**
 * THE HERO LINE — what a share artifact actually leads with.
 *
 * `pullQuote` scores sentences by semantic signal density, which is the
 * right measure for a meta description and the WRONG one for a poster: a
 * sentence stuffed with nouns outscores one that makes a reader feel
 * something. On a real story it chose "However, while i was compelled to
 * land in Paris by circumstances of Visa, flight itinerary which was too
 * expensive to change…" — bureaucratic travel logistics — over the
 * writer's own opening line, "Almost missed on a weekend in Paris..
 * because of Social Media".
 *
 * Writers put their hook first. So when the title itself is a cryptic
 * fragment ("mace & croissants", "why bother"), the source's own opening
 * line is a better lead than anything scoring can find — it is the
 * sentence the writer chose to open with. Scored extraction stays as the
 * fallback for stories whose first line is throat-clearing.
 *
 * No invention: every branch returns the writer's own words verbatim.
 */
export function heroLine(
  context: StoryContext,
  source: string | null | undefined,
  maxChars = 110,
): string {
  const title = context.title.trim();

  const first = (source ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !/^[#>\-*|]/.test(l));

  if (first) {
    const sameAsTitle = first.toLowerCase() === title.toLowerCase();
    // Long enough to be a real line, short enough to set at display scale,
    // and not just the title repeated back.
    if (!sameAsTitle && first.length >= 15 && first.length <= maxChars + 40) {
      return first.length <= maxChars
        ? first
        : first.slice(0, maxChars - 1).replace(/\s+\S*$/, "") + "…";
    }
  }

  return pullQuote(context, maxChars) || title;
}
