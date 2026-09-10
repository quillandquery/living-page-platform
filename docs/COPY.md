# Living Page — Final Copy (Phase 1, locked)

Every user-facing string in Phase 1. **This is finalized product copy — Claude
Code implements it verbatim and does NOT improvise wording.** Tickets reference
strings by their `[KEY]`. British/neutral spelling; sentence case except where
noted.

---

## Global / nav
- `[NAV.LOGO]` Living Page
- `[NAV.MAKE]` Make something
- `[NAV.EXPLORE]` Explore stories
- `[NAV.SIGNIN]` Sign in
- `[NAV.DESK]` Your desk   *(returning writer, replaces Sign in)*

## Homepage — hero (PRD §6)
- `[HERO.EYEBROW]` A new way to tell a story
- `[HERO.H1]` You have a story. It shouldn't look like a blog post.
  *(two lines: "You have a story." / "It shouldn't look like a blog post.")*
- `[HERO.SUB]` Write it normally. We'll make it come alive.
- `[HERO.CTA_PRIMARY]` Make something
- `[HERO.CTA_SECONDARY]` Explore stories
- `[HERO.DEMO_RAW]` *(the text that transforms live in the hero — use exactly)*
  ```
  I got to the beach just before sunset.
  The water was colder than I expected.
  I stayed anyway.
  ```

## Homepage — section headlines (Phase 1 uses these as section markers even
where the full interaction is Phase 2)
- `[SEC.WORDS]` Words don't have to sit still.
- `[SEC.PERSONALITIES]` One sentence. Many personalities.
- `[SEC.WORLDS]` Your story chooses its world.
- `[SEC.MARGIN]` Sometimes the words need a second narrator.
- `[SEC.MODES]` You don't have to write a whole thing.
- `[SEC.READ]` Or just read something.

## Homepage — "one sentence" demo string (PRD §7.3)
- `[DEMO.SENTENCE]` I didn't expect to miss this place.

## Homepage — closing CTA (PRD §7.8)
- `[CLOSE.KICKER]` Got a story?
- `[CLOSE.HEADLINE]` Tell it.
- `[CLOSE.CTA]` Make your first page →
- `[CLOSE.ALT]` Read something beautiful →

## Writer entry — the four modes (PRD §11)
Route `/make`. Four cards. Copy is exact.

**Story**
- `[MODE.STORY.LABEL]` Something happened.
- `[MODE.STORY.PROMPT]` Tell me about a trip, a person, a strange night, a day you still remember.
- `[MODE.STORY.CTA]` Start a story

**Moment**
- `[MODE.MOMENT.LABEL]` Something tiny you can't forget.
- `[MODE.MOMENT.PROMPT]` A look. A sentence. A smell. Five minutes that stayed with you.
- `[MODE.MOMENT.CTA]` Capture a moment

**Thought**
- `[MODE.THOUGHT.LABEL]` Something that's been sitting in your head.
- `[MODE.THOUGHT.PROMPT]` An observation, a feeling, a question, a tiny rant.
- `[MODE.THOUGHT.CTA]` Put it somewhere

**Just start**
- `[MODE.FREE.LABEL]` Don't know yet? That's fine.
- `[MODE.FREE.PROMPT]` Type whatever is in your head.
- `[MODE.FREE.CTA]` Just start

## Editor — in-canvas prompts (rotating, PRD §12)
Show one prompt, faint, in/above the empty canvas; rotate on each new blank
draft. The writer can always ignore it and type.

`[PROMPT.STORY.*]`
- Tell me what happened.
- Start with the part you remember most.
- Tell it like you were telling a friend.
- Where were you?
- What changed?
- What do you still think about?

`[PROMPT.MOMENT.*]`
- Tell me the little thing you keep remembering.
- What happened in five minutes?
- What detail won't leave you alone?
- What did someone say?

`[PROMPT.THOUGHT.*]`
- What's been sitting in your head lately?
- What have you changed your mind about?
- What are you trying to understand?
- Give me the thought before you make it neat.

`[PROMPT.FREE]`
- Start anywhere. Don't worry about the beginning.

## Editor — screen-state microcopy (PRD §13)
- `[EDIT.EMPTY.PLACEHOLDER]` Start anywhere. Don't worry about the beginning.
- `[EDIT.STATE_B]` Your page is taking shape.
- `[EDIT.STATE_C]` Keep going. We'll handle the rest.
- `[EDIT.STATE_D.PROMPT]` Want to see what this became?
- `[EDIT.STATE_D.CTA]` See my page →
- `[EDIT.AUTOSAVE.SAVED]` Saved
- `[EDIT.AUTOSAVE.SAVING]` Saving…

## Editor — the three shape controls (PRD §14)
Label row: `[SHAPE.TITLE]` Shape it *(optional — the page already chose)*
- `[SHAPE.MOOD]` Mood — Auto · Quiet · Dreamy · Raw · Playful · Cinematic · Strange · Warm · Restless · Romantic · Chaotic
- `[SHAPE.VISUALS]` Visuals — Auto · Illustrated · Minimal · Collage · Maximal
- `[SHAPE.MOTION]` Motion — Auto · Still · Gentle · Alive · Wild
- `[SHAPE.ADVANCED]` Advanced
- `[SHAPE.FINE_TUNE]` Fine tune this line
- `[SHAPE.RESET]` Reset to auto

## Publishing (PRD §27)
- `[PUB.TITLE_LABEL]` Title
- `[PUB.AUTHOR_LABEL]` By
- `[PUB.DESC_LABEL]` A line to draw people in *(optional)*
- `[PUB.VISIBILITY]` Who can see this — Anyone with the link · Just me
- `[PUB.CTA]` Publish
- `[PUB.DONE]` It's live.
- `[PUB.COPY_LINK]` Copy link
- `[PUB.VIEW]` View your page →

## Reader — end-of-story loop (PRD §26)
- `[READ.LOOP.KICKER]` Have one of your own?
- `[READ.LOOP.CTA]` Tell it →

## Dashboard (returning writer)
- `[DESK.TITLE]` Your desk
- `[DESK.NEW]` Make something
- `[DESK.EMPTY]` Nothing here yet. Every page starts with a rough first line — that's the whole idea.
- `[DESK.SECTION.DRAFTS]` Drafts
- `[DESK.SECTION.LIVE]` Published

## Discovery / explore
- `[EXPLORE.TITLE]` Stories worth experiencing
- `[EXPLORE.SUB]` Real stories, told the way they felt.
- `[EXPLORE.EMPTY]` Nothing here yet. Be the first to make one.

## Auth (light-restyle, keep flows)
- `[AUTH.SIGNUP.TITLE]` Somewhere to put it.
- `[AUTH.SIGNUP.SUB]` Make an account. Write your first page in a minute.
- `[AUTH.LOGIN.TITLE]` Welcome back.
- `[AUTH.ONBOARD.TITLE]` Pick a name to write under.
- `[AUTH.ONBOARD.SUB]` It becomes your address — livingpage.app/@you. Choose one you'd sign.

---

### Copy principles (for any string not listed)
- Talk to someone with a story, not a "user" or "creator".
- Never say "blog", "newsletter", "CMS", "publish your content", "AI writing".
- Short, warm, a little playful. No feature lists. The magic before the
  explanation (PRD §35.10).
