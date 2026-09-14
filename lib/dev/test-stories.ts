/**
 * THE VISUAL-SYSTEM TEST SUITE (§40 of the Story Visual System 2.0 spec).
 * Ten short pieces chosen to exercise every environment/mood/narrative
 * combination the acceptance test cares about. Used only by
 * `app/dev/preview` — never seeded into the database, never shown to a
 * reader.
 */
export type TestStory = { key: string; place: string; fragment: string; text: string };

export const TEST_STORIES: TestStory[] = [
  {
    key: "paris-disappointment",
    place: "Paris",
    fragment: "I spent three weeks in Paris and hated it.",
    text: `I spent three weeks in Paris and hated it.
The cafés were cold and so was I. I dragged my suitcase over cobbled streets in the rain, missed every train I meant to catch, and drank bad coffee alone at a window table.
By the second week the pigeons knew me better than anyone did.
I left without saying goodbye to anyone. I kept the metro ticket anyway. I don't know why.`,
  },
  {
    key: "beach-freedom",
    place: "the coast",
    fragment: "I woke up before sunrise and ran straight into the ocean.",
    text: `I woke up before sunrise and ran straight into the ocean.
The water was colder than I expected and I didn't care. I swam until my arms ached, until the sky went from grey to gold, birds wheeling low over the waves.
I walked back up the beach leaving footprints no one would see by noon.`,
  },
  {
    key: "palace-overdressed",
    place: "the palace",
    fragment: "I walked into the palace and immediately realised I was overdressed.",
    text: `I walked into the palace and immediately realised I was overdressed.
Chandeliers everywhere, curtains the size of sails, and everyone else in something plain and expensive.
A waiter handed me a chair and I sat on it like a throne, laughing at my own ridiculous decision to come at all.`,
  },
  {
    key: "rajasthan-road-trip",
    place: "Rajasthan",
    fragment: "I quit my job and drove across Rajasthan.",
    text: `I quit my job and drove across Rajasthan.
The highway ran straight into heat shimmer, a camel crossing far ahead, dust rising off the dashboard.
I kept driving until the fuel gauge worried me more than my old boss ever had.
Somewhere past a roadside sign for a town I never reached, I felt hopeful for the first time in a year.`,
  },
  {
    key: "breakup",
    place: "the kitchen table",
    fragment: "We stopped fighting. That was somehow worse.",
    text: `We stopped fighting. That was somehow worse.
We sat across the kitchen table not looking at each other, two cups going cold between us.
She left before I said anything.
I kept both chairs anyway, like they'd need to match again.`,
  },
  {
    key: "absurd-birthday",
    place: "two floors down",
    fragment: "I accidentally joined a stranger's birthday party.",
    text: `I accidentally joined a stranger's birthday party.
Someone handed me a party hat and a slice of cake before I could explain I didn't know anyone in the apartment, least of all the birthday boy.
I stayed for three hours. I sang. I have no regrets, and I never learned his name.`,
  },
  {
    key: "childhood-kitchen",
    place: "my grandmother's kitchen",
    fragment: "My grandmother's kitchen smelled like cardamom and rain.",
    text: `My grandmother's kitchen smelled like cardamom and rain.
She kept the good cups on the top shelf and let me hold them anyway, warm-handled and chipped at the rim.
I remember the kettle's whistle more clearly than most of what came after, back when I was small enough to sit on the counter.`,
  },
  {
    key: "night-city",
    place: "the city",
    fragment: "I walked home at 2:13 AM because I didn't want the night to end.",
    text: `I walked home at 2:13 AM because I didn't want the night to end.
Streetlights, a bar still glowing on the corner, headlights sweeping past empty crossings.
My phone buzzed with a message I didn't open.
The city felt like it belonged to no one but the people still awake in it.`,
  },
  {
    key: "underwater",
    place: "the reef",
    fragment: "I saw something enormous moving beneath me.",
    text: `I saw something enormous moving beneath me.
The dive had been ordinary until then — bubbles, light rays slicing down through the blue, my own breathing loud in my ears.
Then a shadow passed under the reef, bigger than the boat I'd come on, and gone before I could be afraid.`,
  },
  {
    key: "home-ordinary",
    place: "home",
    fragment: "I spent Saturday doing absolutely nothing.",
    text: `I spent Saturday doing absolutely nothing.
Tea, a window, the neighbour's radio drifting up through the floor.
I didn't check my phone until it was dark outside.
Nothing happened, and it was the best nothing I'd had in months.`,
  },
];
