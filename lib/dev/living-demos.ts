import type { WorldKey } from "@/lib/living/worlds";

/** DEV ONLY — sample prose for the /living preview. In the product these come
 *  from the DB; here they prove the renderer end-to-end from raw text. */
export type LivingDemo = { key: string; eyebrow: string; title: string; world?: WorldKey; text: string };

export const LIVING_DEMOS: LivingDemo[] = [
  {
    key: "chiswell",
    eyebrow: "Chiswell Street, London · field notes",
    title: "The smoker's itinerary",
    world: "twilight-street",
    text: `There is a kind of traveler most guidebooks never account for: the smoker landing in a country that has just taken their lighter away.

It happens quietly at Indian airports, where cabin baggage and checked luggage alike get stripped of anything that sparks a flame. No malice in it, just policy.

But the effect is immediate. You land a smoker with nothing to smoke with, and the day rearranges itself around that one small problem.

The airport rarely helps. So the search begins somewhere less official: a cab driver with a lighter in the door pocket, a bus conductor who steps outside for exactly this reason.

A small, specific diplomacy, conducted in gestures and half sentences, that tells you more about a place in ten minutes than a museum would in an afternoon.

The more developed the country, the more this instinct gets funneled into something ordinary. You walk into a supermarket for a lighter and leave with groceries you didn't plan on.

Dinner happens fast, almost by accident. There's a lighter in your pocket now, and somewhere to be.

Sitting on Chiswell Street in London today, the same small ritual played out again.

What I keep coming back to is this: smoking isn't a habit that happens alongside travel — it's a constraint that quietly writes part of the itinerary.

Anyone who smokes and travels seriously has to build room for it, the same way you'd build room for a connecting flight or a visa queue.

What's interesting is what this constraint actually gives you. Most travel advice tells you to seek out the local, the unplanned, the thing that isn't on the itinerary. Smoking does this for free.

It puts you in a cab longer than you meant to be, talking to a driver you'd have otherwise just paid and left. It puts you in a supermarket aisle you never intended to walk down. It puts you outside, on a street corner, at the exact time of day when a city looks most like itself and least like a postcard of itself.

None of this is romantic in the moment. It's mostly minor friction, a small tax paid every few hours. But over a trip, that tax adds up to something.

It forces detours — and detours are where most of the good, unscripted parts of travel actually happen. The plan simply has a gap built into it, and something local rushes in to fill it.

So maybe the honest version isn't that smokers are unusually curious travelers. It's that the habit itself keeps nudging you off the straight line between hotel and landmark — toward the parts of a place that were never going to be on the map anyway.`,
  },
  {
    key: "quiet-sea",
    eyebrow: "The coast · before dawn",
    title: "Silver",
    world: "dawn-coast",
    text: `We drove to the coast before dawn.

The sea was flat and silver and went all the way to the horizon, further than I could hold in my eyes.

We left footprints in the wet sand and the tide took them almost at once.

Neither of us said anything.

The sky opened slowly over the water, pink and then gold.

I have never felt so small and so calm at the same time.`,
  },
  {
    key: "nightline",
    eyebrow: "Thriller",
    title: "Nightline",
    world: "noir-room",
    text: `The first missed call she ignored.

The second she silenced.

The third was ringing before the second had stopped — the same number, the one with too many digits, the one she didn't know.

She was reaching to turn the phone face-down when she noticed the front door.

Open. A hand's width. The cold coming in. She had not opened it.

Somewhere in the flat, a floorboard remembered someone's weight.

She did not breathe. She counted the doors between herself and the street — three — and the seconds between herself and whatever stood in the hall — fewer.

The phone lit again. No number this time. A single word. BEHIND.

She ran.`,
  },
  {
    key: "the-receipt",
    eyebrow: "Romance",
    title: "The Receipt",
    world: "ember-interior",
    text: `I kept the receipt from the night we met.

Two coffees, one shared slice of something, 11:47 p.m., a café that has since closed.

I don't know why I kept it. I am not a keeper of things.

But I slipped it into the book I was reading and forgot it there, and found it years later — pressed flat, gone the colour of weak tea, the ink almost nothing.

You were asleep beside me when I found it.

I held it to the lamp. The hour we didn't yet know was the hour everything began.

I lay there with the little paper ghost of our beginning, and listened to you breathe, and thought: I would keep this one too.`,
  },
  {
    key: "cartographer",
    eyebrow: "Fantasy",
    title: "The Cartographer's Complaint",
    world: "dream",
    text: `The map had one more country than it did yesterday.

I counted them twice. Thirty-one. There had been thirty.

The new one sat between the mountains and the sea, where before there was only a crease in the paper. Its borders were still deciding where to go.

It had no name. The space where the name should be shimmered, waiting, the way a bell waits to be rung.

I did what any mapmaker would do. I dipped my pen. I leaned close.

And the country held its breath, because whatever I wrote next was the thing it would have to be, forever.

I am still deciding. The ink is drying on the nib.`,
  },
  {
    key: "mondays",
    eyebrow: "Children's",
    title: "The Boy Who Collected Mondays",
    world: "paper",
    text: `Milo collected Mondays.

Other children collected stamps, or shells, or small round stones with holes worn through them. Milo collected the days nobody wanted.

He kept them in a jar under his bed, and on Saturdays, when the week was bright and loud, Milo would open the jar just a little.

And a small grey breeze would come out. And things would slow down. And he could hear himself think.

His sister said it was a jar of nothing. His father said it was a jar of air.

But Milo knew. Some things are precious only because nobody else can see them.

On his birthday he gave his grandmother a Tuesday — a warm one, the kind with pancakes in it — because she had been sad.

She kept it on her windowsill. It is still there.`,
  },
];

export function getLivingDemo(key: string): LivingDemo | undefined {
  return LIVING_DEMOS.find((d) => d.key === key);
}
