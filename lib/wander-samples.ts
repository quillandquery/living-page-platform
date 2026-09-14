import { annotate, toBlocks } from "./annotate";
import type { Profile, StoryWithAuthor } from "./types";

/**
 * SEED STORIES FOR WANDER
 *
 * Wander is a field, and a field needs bodies in it. Until enough people
 * have published, these curated pieces give the discovery surface real
 * density — but nothing here is faked into existence: each one is authored
 * the exact way a writer's story is, as plain prose run through the same
 * annotate()+toBlocks() emitter the studio uses, so its voices, doodles,
 * world and themes are derived, not hand-set. They read through the same
 * StoryView the real reader uses (see app/wander/s/[slug]/page.tsx).
 *
 * They are clearly authored by "Living Page" and addressed under /wander/s/,
 * never under a real @handle, so they never impersonate a person.
 */

const AUTHOR: Profile = {
  id: "livingpage-seed",
  handle: "livingpage",
  display_name: "Living Page",
  bio: "Seed stories, so you always have something to fall into.",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00Z",
};

type SampleInput = {
  slug: string;
  place: string;
  date: string;
  accent: string;
  backdrop: string | null;
  /** the hook shown in Wander */
  hook: string;
  /** the full piece, plain prose — the same thing a writer types */
  body: string;
};

const SAMPLES: SampleInput[] = [
  {
    slug: "ask-me-to-stay",
    place: "GOKARNA",
    date: "March",
    accent: "#2D6BF0",
    backdrop: "nightroad",
    hook: "i thought i wanted to leave. turns out i just wanted someone to ask me to stay.",
    body: `I thought I wanted to leave.
The night bus was already idling outside, headlights on the wall.
I had my bag packed for three days. I kept checking the ticket.
Turns out I just wanted someone to ask me to stay.
Nobody did. So I left. And then I missed it the whole way down the coast.`,
  },
  {
    slug: "the-suitcase",
    place: "A NEW APARTMENT",
    date: "still",
    accent: "#C77D3A",
    backdrop: "cafe",
    hook: "three months later, i still haven't unpacked the suitcase.",
    body: `Three months later, I still haven't unpacked the suitcase.
It lives by the door like it's waiting for me to change my mind.
Everyone keeps asking when I'll settle in.
I tell them soon. I've been telling them soon since summer.
Maybe I'm not unpacking because unpacking makes it true.`,
  },
  {
    slug: "the-fish",
    place: "THE ANDAMANS",
    date: "last dive",
    accent: "#00A6D6",
    backdrop: "coast",
    hook: "the fish was bigger than me. which is not technically difficult.",
    body: `The fish was bigger than me.
Which is not technically difficult, I am aware.
But underwater, with the light coming down in columns, it felt enormous.
It looked at me the way strangers look at you on a train.
Then it turned, unbothered, and the whole blue swallowed it.`,
  },
  {
    slug: "chargers",
    place: "SOMEWHERE, 2AM",
    date: "a Tuesday",
    accent: "#9B7EDE",
    backdrop: "nightsky",
    hook: "maybe adulthood is just moving houses and losing chargers.",
    body: `Maybe adulthood is just moving houses and losing chargers.
Every box is labelled KITCHEN and contains one fork and a phone cable.
I have owned nine chargers. I currently have none.
Nobody warns you that growing up is mostly logistics.
And the occasional 2am where you sit on the floor and feel the size of it.`,
  },
  {
    slug: "the-best-night",
    place: "THE 6:40 TRAIN",
    date: "monsoon",
    accent: "#3E9BAB",
    backdrop: "monsoon",
    hook: "we missed the train. then we missed another one. then somehow that became the best night.",
    body: `We missed the train.
Then, incredibly, we missed another one.
We stood under the platform roof and watched the rain come sideways.
There was chai in a paper cup and a dog that had chosen us.
Then somehow that became the best night. We never did get where we were going.`,
  },
  {
    slug: "should-i-quit",
    place: "THE OFFICE, LATE",
    date: "October",
    accent: "#F0492E",
    backdrop: "city",
    hook: "should i quit",
    body: `Should I quit.
I typed it into the search bar like the internet knew my manager.
The building had emptied hours ago. Just me and the vending machine hum.
Everyone says you'll know when it's time.
I know. I've known for a while. That's the part I keep not saying out loud.`,
  },
  {
    slug: "rained-out",
    place: "A ROOFTOP",
    date: "June",
    accent: "#5B7C99",
    backdrop: "window",
    hook: "rained out",
    body: `Rained out.
The whole thing, planned for weeks, gone in twenty minutes of weather.
We sat inside and watched it come down on the fairy lights.
Somebody made bad tea. Somebody else told the truth for once.
It was better than the party would have been. It usually is.`,
  },
  {
    slug: "definition-of-success",
    place: "A KITCHEN TABLE",
    date: "New Year",
    accent: "#1F9E5A",
    backdrop: "meadow",
    hook: "definition of success?",
    body: `Definition of success?
My father would have said a house and a title and a quiet street.
I have a rented room and a plant that refuses to die.
Some mornings that feels like failure. Some mornings it feels like enough.
I'm starting to think the definition was never mine to inherit.`,
  },
  {
    slug: "mace-and-croissants",
    place: "PARIS",
    date: "a grey week",
    accent: "#7A6CE0",
    backdrop: "dreamscape",
    hook: "mace & croissants",
    body: `Mace and croissants.
That was the whole itinerary, according to the note in my pocket.
I had carried it across two airports without remembering writing it.
The city did not care about my plan. It rained on it beautifully.
I ate the croissant on a wet bench and forgot what the mace was for.`,
  },
  {
    slug: "why-bother",
    place: "A TATTOO CHAIR",
    date: "impulsively",
    accent: "#FF7A1A",
    backdrop: "heat",
    hook: "why bother",
    body: `Why bother, he said, when I told him it would be hidden.
Under the sleeve, over the ribs, somewhere only I would ever see.
That's exactly why, I said. It isn't for the looking.
Some things you keep because you were there when they were made.
The needle started. I stopped explaining.`,
  },
  {
    slug: "people-you-almost-knew",
    place: "A HOSTEL DORM",
    date: "years ago",
    accent: "#E8734F",
    backdrop: "dawn",
    hook: "the people you almost knew are their own kind of ghost.",
    body: `The people you almost knew are their own kind of ghost.
The Dutch guy who taught me to cook one dish I still make.
The woman on the ferry whose name I never got and never forgot.
You share three days and a lifetime's worth of the wrong details.
Then the road forks and you become a story each other tells.`,
  },
  {
    slug: "the-long-way",
    place: "A HIGHWAY",
    date: "4am",
    accent: "#2B3ED0",
    backdrop: "nightroad",
    hook: "we took the long way home on purpose.",
    body: `We took the long way home on purpose.
The straight road would have had us back in an hour, and we didn't want the hour.
The radio only got one station and it was playing for us specifically.
Nobody spoke for a long time and it wasn't uncomfortable.
Some drives you take to arrive. This one we took to stay a little longer.`,
  },
];

function build(input: SampleInput): StoryWithAuthor {
  const blocks = toBlocks(annotate(input.body, { seed: hashSeed(input.slug) }));
  return {
    id: `sample-${input.slug}`,
    author_id: AUTHOR.id,
    slug: input.slug,
    place: input.place,
    date: input.date,
    fragment: input.hook,
    accent: input.accent,
    backdrop: input.backdrop,
    veil: false,
    source: input.body,
    blocks,
    status: "published",
    published_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    author: AUTHOR,
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** The seed stories, ready for the field and the reader. Built once. */
export const SAMPLE_STORIES: StoryWithAuthor[] = SAMPLES.map(build);

export const isSampleId = (id: string) => id.startsWith("sample-");

export function sampleBySlug(slug: string): StoryWithAuthor | null {
  return SAMPLE_STORIES.find((s) => s.slug === slug) ?? null;
}

export function otherSamples(excludeSlug: string): StoryWithAuthor[] {
  return SAMPLE_STORIES.filter((s) => s.slug !== excludeSlug);
}
