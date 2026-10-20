# Living Page — Share Feature Prototype

An interactive concept prototype for Living Page's share feature: the share preview rendered as the **living page itself, in miniature** — illustrated moving scenes, an alive-by-default reveal loop, five share surfaces, and a composer that renders **any** story through one engine.

It's a single self-contained `index.html`. No build step, no dependencies, no server required (fonts load from Google Fonts, so keep a network connection for the exact typefaces).

## Run it locally

**Option A — just open it**

Double-click `index.html`, or drag it into a browser.

**Option B — serve it on localhost** (recommended)

```bash
# Python 3 (built in on macOS/Linux)
python3 -m http.server 8000
# then open http://localhost:8000
```

```bash
# or Node, if you prefer
npx serve .
# or:  npx http-server -p 8000
```

## Push it to a repo

```bash
cd livingpage-share
git init
git add .
git commit -m "Living Page share prototype (rev.3)"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

Any static host works too (GitHub Pages, Netlify drop, Vercel) — it's just the one file.

## What to try

- **Pick a page** — Gokarna (warm coast), The 6:40 train (rain city), A kitchen 2am (night).
- **The surface tabs** — WhatsApp, iMessage, Instagram Story, X, The card. WhatsApp is the *still fallback*; the rest animate.
- **Who's sharing** — toggle Writer / Reader; the reader adds a hand-lettered reaction stamp.
- **See the still fallback** — freeze any surface to what a non-animating unfurl would show.
- **＋ Compose** — type your own title, location, handle, reaction, scene, and set each line's type (Body / Emphasis / Hand). Every surface re-renders live. This is the engine — it works for any page, not just the three samples.

## How it's structured

Everything is in `index.html`:

- **The render engine** — `scene(mood)` draws the illustrated moving background (coast / city-rain / night, built as inline SVG + CSS); `card(story, kind)` composes the masthead, typed lines, and byline over it. A story is just data: `{ mood, place, month, handle, title, slug, react, lines: [{ t: 'body'|'emph'|'hand', s }] }`.
- **The loop** — `startLoop()` runs the ~4s cycle: ambient scene motion, body words rising in, the emphasis line landing (blur-to-clear + scale overshoot), a hold, then a dissolve and re-arm.
- **The surfaces** — `rWhatsApp / rIMessage / rInstagram / rX / rCard` wrap the same render in each platform's chrome.
- **The composer** — edits the `custom` story object and re-renders on every keystroke.

## Notes for the real build

This proves the engine client-side. To ship, the same render would run **server-side (headless) per page** to bake the Open Graph image and the ~4-second video loop, re-baking when a page is edited. See the "Open questions · next" section in the prototype.

_Concept prototype · rev.3 · copy is not final._
