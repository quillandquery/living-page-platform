/**
 * SLUG DERIVATION (Module 4, PART 3 — URL SLUG).
 *
 * Readable, stable, human, derived from the story. `app/write/actions.ts`
 * already had a working slugifier keyed on `place`; this only changes
 * WHAT it's derived from — the writer's own hook line first, since that
 * *is* the human title here (there is no separate title field, and PART
 * "TITLE" is explicit: a real title, once supplied, is never rewritten).
 *
 * `place` stays the fallback and the disambiguator for a hook that's too
 * generic to stand alone on its own — module's own example:
 *   title "An unexpected week" + place "Gokarna"
 *     → "unexpected-week-in-gokarna", not "an-unexpected-week"
 *
 * Deliberately NOT keyword-stuffed (module: "do not over-engineer this").
 * Uniqueness (the -2, -3 suffix for a second collision) stays exactly
 * where it already lived, in `app/write/actions.ts`'s `uniqueSlug` — this
 * file only picks the BASE it's made unique from.
 */

const LEADING_FILLER = /^(a|an|the)\s+/i;

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/** Everything that isn't a real, specific word — used only to judge
 *  whether a slug candidate is generic, never stripped from the visible
 *  slug itself beyond the leading filler article. */
const GENERIC_WORD_COUNT_MAX = 2;

export function deriveSlugBase(input: { fragment: string; place: string }): string {
  const fragment = (input.fragment || "").trim();
  const place = (input.place || "").trim();
  const placeSlug = slugify(place);

  if (!fragment) return placeSlug || "untitled";

  const candidate = slugify(fragment.replace(LEADING_FILLER, ""));
  if (!candidate) return placeSlug || "untitled";

  const words = candidate.split("-").filter(Boolean);
  const isGeneric = words.length > 0 && words.length <= GENERIC_WORD_COUNT_MAX;

  if (isGeneric && placeSlug && !words.includes(placeSlug)) {
    const blended = `${candidate}-in-${placeSlug}`;
    if (blended.length <= 60) return blended;
  }
  return candidate;
}
