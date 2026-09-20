/**
 * EVENT TAXONOMY — the one list of things worth counting.
 *
 * Per CLAUDE.md's core loop ("home → choose mode → write → watch it
 * transform → shape → publish → a reader feels something → they want to
 * make one"), analytics exists to answer three questions:
 *   1. Core loop: where do people drop off between opening /make and
 *      publishing?
 *   2. Reader engagement: does a published page actually get read, and does
 *      it convert a reader into a writer?
 *   3. Engine trust: does Auto get left alone (the intended experience) or
 *      overridden (a signal the heuristic guessed wrong)?
 *
 * Keep this list curated, the same way D6 keeps the world/motion vocabulary
 * curated — a sprawling event list is exactly as much of a smell as a
 * sprawling effect catalogue. Add an event here before firing it anywhere
 * else, so this file stays the single source of truth for what "activity"
 * means on Living Page.
 */

export type AnalyticsEvent =
  // --- core loop -----------------------------------------------------
  | { name: "make_mode_selected"; props: { mode: "story" | "moment" | "thought" | "freeform"; label: string } }
  | { name: "draft_created"; props: { story_id: string; mode: string } }
  | { name: "story_published"; props: { story_id: string; format: string; mood: string; has_imagery: boolean; is_first_publish: boolean } }
  | { name: "story_unpublished"; props: { story_id: string } }
  // --- engine trust ----------------------------------------------------
  | { name: "engine_control_changed"; props: { control: "format" | "mood" | "visuals" | "world"; value: string; story_id: string } }
  // --- reader engagement ------------------------------------------------
  | { name: "story_viewed"; props: { story_id: string; author_handle: string; slug: string; format: string } }
  | { name: "story_scroll_depth"; props: { story_id: string; percent: 25 | 50 | 75 | 100 } }
  | { name: "reader_create_cta_clicked"; props: { story_id: string; placement: string } };

export type AnalyticsEventName = AnalyticsEvent["name"];
export type PropsFor<N extends AnalyticsEventName> = Extract<AnalyticsEvent, { name: N }>["props"];
