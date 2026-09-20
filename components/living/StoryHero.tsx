import { Beat } from "./Beat";
import type { HeroDirection } from "@/lib/story-hero";

/**
 * THE STORY HERO — the writer's own hook line (`fragment`), shown as the
 * first thing a reader sees. Before this, `fragment` was computed for
 * `<title>` and the OG card but never actually rendered in the standard
 * reading shell's frontispiece — a reader had to scroll into the body to
 * find the line that was already doing the work of a headline everywhere
 * else (search results, link previews, the poster/gallery/film formats).
 *
 * Rendered through the existing `Beat` — the same atom every line of the
 * story is made of — so the hero is a beat of the story, not a second,
 * bespoke "title card" component. That's what keeps it from looking like a
 * generic hero template: it reads as the story's own first line, just the
 * one the writer chose to open with.
 */
export function StoryHero({ hero }: { hero: HeroDirection }) {
  if (!hero.headline) return null;
  return (
    <Beat voice={hero.voice} body={hero.body} className="story-hero-headline">
      {hero.headline}
    </Beat>
  );
}

export default StoryHero;
