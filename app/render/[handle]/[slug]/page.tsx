import { notFound } from "next/navigation";
import { publishedStory } from "@/lib/db";
import { lifeLabel, pageMark } from "@/lib/share-layout";
import { seedFromId } from "@/lib/og-render";
import { BRAND_HOST } from "@/lib/site";
import { CANVASES, isCanvasKey, type CanvasKey } from "@/lib/share-canvas";
import { getBackdrop, worldVars } from "@/lib/backdrops";
import { isCompleteArtDirection } from "@/lib/art-direction/types";
import { Backdrop } from "@/components/living/Backdrop";
import { Artwork } from "@/components/living/Artwork";
import { Signature as ArtSignature } from "@/components/living/Signature";
import { Beat } from "@/components/living/Beat";
import { deriveStoryContext } from "@/lib/story-context";
import { pickSetupTurn, scoreStrip } from "@/lib/share-beats";
import { deriveHeroDirection } from "@/lib/story-hero";
import { TransformStage, type Phase } from "@/components/render/TransformStage";
import type { Block } from "@/lib/story-blocks.mjs";

/**
 * THE RENDER TARGET.
 *
 *   /render/@handle/slug?canvas=og|feed|story[&phase=0|1|2][&loop=1]
 *
 * An unchromed page at an exact pixel size, for the capture worker to
 * screenshot and record — and, because it is a real page in the real
 * app, it renders the REAL type, REAL backdrop worlds, REAL palette and
 * the REAL beats the reader gets. A share artifact is a genuine frame of
 * the product, not a Satori re-implementation that drifts.
 *
 * It SHOWS rather than explains, the way the homepage does (app/page.tsx
 * `.hero-page` / `ph-0…ph-2`): one set of the writer's own words,
 * restyled in place from plain typed text into the living page, with the
 * world drawing itself in behind them. No "before / after" labels, no
 * split panes, no captions. The gesture is the argument.
 *
 * `?phase=2` pins the finished state for the still image. Without it the
 * gesture plays on load, which is what the video records.
 *
 * Only published stories resolve (`publishedStory` is RLS-filtered), so
 * this exposes nothing a reader could not already see.
 */

export const dynamic = "force-dynamic";

const clean = (h: string) => decodeURIComponent(h).replace(/^@/, "").toLowerCase();

/** THE ONE LINE.
 *
 *  A share artifact is an opening, not an excerpt. Rendering the story's
 *  first N blocks gave a six-line body paragraph of throat-clearing prose
 *  at reader scale — which is a crop of a page built for a 7000px scroll,
 *  not a composition for a 1200x630 frame. We take the single strongest
 *  sentence instead (the same one `lib/share-caption.ts` picks for the
 *  static frames and the caption, so every surface agrees), and give it
 *  the whole canvas.
 */

export default async function ShareRenderPage({
  params, searchParams,
}: {
  params: Promise<{ handle: string; slug: string }>;
  searchParams: Promise<{ canvas?: string; phase?: string; loop?: string }>;
}) {
  const { handle, slug } = await params;
  const sp = await searchParams;
  const story = await publishedStory(clean(handle), slug);
  if (!story) notFound();

  const canvasKey: CanvasKey = isCanvasKey(sp.canvas) ? sp.canvas : "og";
  const c = CANVASES[canvasKey];
  const s = (n: number) => Math.round(n * c.scale);

  /** POSTER SCALE. The reader sizes type for a 7000px scroll read at
   *  arm's length; a share artifact is read at thumbnail size in a feed,
   *  so the one line has to carry the whole canvas. Derived from the
   *  line's own length so a short hook goes enormous and a long one
   *  stays legible — never inherited from the reading stylesheet. */
  const posterSize = (t: string) => {
    if (!t) return 0;
    const n = t.length;
    const base = n > 150 ? 46 : n > 110 ? 56 : n > 80 ? 70 : n > 55 ? 88 : n > 30 ? 112 : 140;
    return Math.round(base * c.scale);
  };

  const fixed: Phase | undefined =
    sp.phase === "0" ? 0 : sp.phase === "1" ? 1 : sp.phase === "2" ? 2 : undefined;
  const loopMs = sp.loop ? 6600 : undefined;

  const ad = isCompleteArtDirection(story.art_direction) ? story.art_direction : null;
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(story.accent) ? story.accent : "#2B3ED0";
  const world = getBackdrop(ad?.environment.key ?? story.backdrop ?? undefined);
  const vars = ad?.palette?.vars ?? worldVars(world, accent);
  const seed = seedFromId(story.id);

  const context = deriveStoryContext({
    fragment: story.fragment, place: story.place, date: story.date,
    source: story.source, blocks: story.blocks, backdrop: story.backdrop,
    artDirection: story.art_direction,
  });
  // SETUP + TURN, read off the engine's own annotations rather than a
  // third bespoke scorer. See lib/share-beats.ts for why markedness
  // beats both semantic-density scoring and "take the first line".
  const { setup, turn } = pickSetupTurn(story.fragment, story.blocks);
  const strip = scoreStrip(story.blocks, canvasKey === "og" ? 56 : 44);
  const hero = deriveHeroDirection({ title: turn || setup, mood: ad?.atmosphere.mood });

  const label = lifeLabel(story.place, story.date);
  const mark = pageMark(seed);

  const shellClass = [
    "render-shell", `render-${canvasKey}`,
    ad ? `material-${ad.material.key}` : "",
    ad ? `comp-${ad.composition.key}` : "",
    ad?.typography.handwrittenBias ? "typo-handwritten" : "",
    ad?.typography.framed ? "typo-framed" : "",
    ad?.look ? `look-${ad.look}` : "",
    ad?.palette ? `palette-${ad.palette.key}` : "",
    ad?.palette ? `scheme-${ad.palette.scheme}` : "",
  ].filter(Boolean).join(" ");

  const materialVars = ad
    ? `--material-grain:${ad.material.grain};--material-contrast:${ad.material.contrast};--art-rotate:${ad.typography.rotateBias}deg;`
    : "";

  return (
    <>
      <style>{`
        html,body{margin:0;padding:0;overflow:hidden;background:#000;}
        .render-shell{
          ${vars}${materialVars}
          position:relative; overflow:hidden; box-sizing:border-box;
          width:${c.w}px; height:${c.h}px;
          background:var(--paper,#F5F0E4); color:var(--ink,#141210);
          display:flex; flex-direction:column;
          padding:${(c.safeTop || s(56))}px ${s(76)}px ${(c.safeBottom || s(48))}px;
        }

        /* ── the world draws itself in ──────────────────────────────
           Backdrop, material grain and signature fade up with the
           gesture. Artwork does not fade — it draws (below): a doodle
           arriving as a block of pixels going opaque reads as a sticker
           dropped onto the page; arriving stroke by stroke reads as the
           thing it actually is, a mark being made. */
        .render-shell .backdrop,
        .render-shell .material-layer,
        .render-shell .signature{
          opacity:0; transition:opacity 1.15s ease .3s;
        }
        .render-shell:has(.lp-stage.ph-2) .backdrop,
        .render-shell:has(.lp-stage.ph-2) .material-layer,
        .render-shell:has(.lp-stage.ph-2) .signature{ opacity:1; }

        /* ── THE DOODLE DRAWS ITSELF IN ─────────────────────────────
           Same mechanism as the reader page's '.beat.arrived .doodle
           .stk' ('lp-draw', using the '--len'/'--s' vars Doodle.tsx
           already computes per stroke) — applied against this page's
           own phase class, since the artwork layer here isn't nested
           inside a '.beat'. This is the story's own real artwork
           ('ad.artwork', the same pieces the reader sees), not a
           decorative flourish invented for the share frame. */
        /* RE-HOMED FOR THIS FRAME.
           '.art-margin'/'.art-corner' are position:fixed and placed off
           the reading page's own '--frame'/'--depth' vars — neither
           exists on this unchromed page, so without this the artwork is
           not faint, it's literally not there. A global media query
           also hides margin placements under 1100px, which both the
           feed and story canvases are. Anchored to the render-shell's
           own box instead, at coordinates sized for a card, not a
           7000px scroll. */
        .render-shell .artwork-layer{ position:absolute; inset:0; z-index:0; }
        .render-shell .artwork-layer .art-margin,
        .render-shell .artwork-layer .art-corner{
          position:absolute !important; display:block !important; opacity:.5;
        }
        .render-shell .artwork-layer .art-margin-left{
          left:${s(36)}px; top:20%; right:auto; bottom:auto;
        }
        .render-shell .artwork-layer .art-margin-right{
          right:${s(36)}px; top:56%; left:auto; bottom:auto;
        }
        .render-shell .artwork-layer .art-corner-tl{ left:${s(30)}px; top:${s(110)}px; right:auto; bottom:auto; }
        .render-shell .artwork-layer .art-corner-tr{ right:${s(30)}px; top:${s(110)}px; left:auto; bottom:auto; }
        .render-shell .artwork-layer .art-corner-bl{ left:${s(30)}px; bottom:${s(140)}px; right:auto; top:auto; }
        .render-shell .artwork-layer .art-corner-br{ right:${s(30)}px; bottom:${s(140)}px; left:auto; top:auto; }

        .render-shell .artwork-layer .doodle .stk{ stroke-dashoffset: var(--len); }
        .render-shell .artwork-layer .doodle-filled .stk{ opacity: 0; }
        .render-shell:has(.lp-stage.ph-2) .artwork-layer .doodle .stk{
          animation: lp-draw 1.3s cubic-bezier(.35,.6,.3,1) both;
          animation-delay: calc(var(--s) * 160ms + 160ms);
        }
        .render-shell:has(.lp-stage.ph-2) .artwork-layer .doodle-filled .stk{
          animation: lp-fillreveal .9s cubic-bezier(.3,.7,.3,1) both;
          animation-delay: calc(var(--s) * 120ms + 190ms);
        }

        /* CHROME-READING LAYERS.
           The 'window' world draws a rounded rectangle with a vertical
           mullion. In the reader, scrolled through at full height, it
           reads as a window. Cropped into a 1200x630 card it reads as a
           browser frame or an embedded iframe — the one thing a share
           artifact must never look like. The world still carries through
           its palette, its rain and its signature; only the frame goes. */
        .render-shell .bd-l-window{ display:none !important; }

        /* the recurring page-edge motif — present from the first frame,
           so the mark is the one constant the gesture happens inside */
        .render-edge{ position:absolute; top:0; bottom:0; left:${s(34)}px; width:1px; background:var(--rule); z-index:2; }
        .render-mark{
          position:absolute; left:${s(34)}px; top:50%; z-index:2;
          transform:translate(-50%,-50%) rotate(-90deg); transform-origin:center;
          font-size:${s(12)}px; letter-spacing:.42em; text-transform:uppercase;
          color:var(--muted); white-space:nowrap; opacity:.7;
        }

        .render-head{ position:relative; z-index:3; flex:0 0 auto; display:flex; align-items:center; gap:${s(12)}px;
          opacity:0; transition:opacity .7s ease .15s; }
        .render-shell:has(.lp-stage.ph-2) .render-head,
        .render-shell:has(.lp-stage.ph-1) .render-head{ opacity:1; }
        .render-dot{ width:${s(10)}px; height:${s(10)}px; border-radius:999px; background:var(--accent); }
        .render-label{ font-size:${s(17)}px; letter-spacing:.34em; text-transform:uppercase;
          color:var(--accent); font-weight:700; }

        /* ── THE STAGE ──────────────────────────────────────────────
           ONE line of the writer's words, composed for this canvas. At
           ph-0 it is held flat — plain typed monospace, drained of
           colour, no voice, no scatter, no rotation — the thing they
           actually typed. Lifting that override IS the transformation;
           the transition does the showing. Same mechanism as
           '.hero-line' on the homepage, applied to the real Beat atom. */
        .lp-stage{ position:relative; z-index:3; flex:1 1 0; min-height:0; overflow:hidden;
          display:flex; flex-direction:column; justify-content:center; }

        /* ── SETUP ──────────────────────────────────────────────── */
        .lp-setup{
          margin:0 0 ${s(22)}px; padding:0;
          font-size:${s(26)}px; line-height:1.2; font-weight:600;
          letter-spacing:.16em; text-transform:uppercase;
          color:color-mix(in oklab, var(--ink) 62%, transparent);
        }

        /* ── TURN ───────────────────────────────────────────────────
           Set to BREACH the frame. Fitting everything politely inside
           the rectangle is the forgettable choice; type that runs past
           the edge is the most reliable scroll-stop there is, and the
           part you cannot read is what buys the click. */
        .lp-turn{
          position:relative;
          margin-right:${s(-120)}px;  /* deliberate overflow, right edge */
        }
        .lp-turn .beat{
          display:block !important;
          margin:0 !important; padding:0 !important;
          max-width:none !important; width:auto !important;
        }
        .lp-turn .beat > *{ max-width:none !important; margin:0 !important; }
        .lp-turn .beat, .lp-turn .beat .word{
          font-size:${posterSize(turn)}px !important;
          line-height:1.02 !important;
          letter-spacing:-0.025em !important;
        }
        .lp-turn .beat .word{ transform:none !important; margin-inline:0 .2em !important; }
        .lp-turn .beat .words{ word-spacing:.02em; }

        /* SETUP — a caption, not a decision: one smooth blend. */
        .lp-setup{
          transition:font-size .8s cubic-bezier(.2,.8,.3,1),
                     font-family .8s cubic-bezier(.2,.8,.3,1),
                     letter-spacing .8s cubic-bezier(.2,.8,.3,1),
                     color .8s ease, margin .8s cubic-bezier(.2,.8,.3,1);
        }

        /* TURN — two speeds, on purpose. Identity (which voice, which
           weight, which case) is a verdict: it cuts, it doesn't blend
           ('steps(1,end)'). Everything that follows is a *consequence*
           of that verdict, and consequences take time and overshoot
           their mark: scale grows past its resting size before settling
           ('cubic-bezier(.16,1.08,.3,1)', the same overshoot family as
           the reader page's 'lp-grow'), and the overflow breach — the
           line actually punching past the frame — is the last thing to
           land, a beat behind the rest. */
        .lp-stage .beat, .lp-stage .beat *{
          transition:font-family .16s steps(1,end),
                     font-style .16s steps(1,end),
                     font-weight .16s steps(1,end),
                     text-transform .16s steps(1,end),
                     letter-spacing .6s cubic-bezier(.16,1.08,.3,1),
                     font-size .68s cubic-bezier(.16,1.08,.3,1),
                     transform .68s cubic-bezier(.16,1.08,.3,1),
                     color 1.05s ease .08s,
                     opacity .9s ease;
        }
        .lp-turn{ transition:margin 1.05s cubic-bezier(.2,.8,.3,1) .12s; }

        /* ph-0 — AS TYPED. No composition, no world, no hierarchy: setup
           and turn are the same undifferentiated monospace, held back
           inside the frame. This is what the writer actually typed. */
        .lp-stage.ph-0 .lp-setup{
          font-size:${s(19)}px !important; line-height:1.7 !important;
          letter-spacing:0 !important; text-transform:none !important;
          font-weight:400 !important; margin-bottom:0 !important;
          font-family:ui-monospace,SFMono-Regular,Menlo,monospace !important;
          color:color-mix(in oklab, var(--ink) 46%, transparent) !important;
        }
        .lp-stage.ph-0 .lp-turn,
        .lp-stage.ph-1 .lp-turn{ margin-right:0 !important; }
        .lp-stage.ph-0 .beat, .lp-stage.ph-0 .beat *{
          font-family:ui-monospace,SFMono-Regular,Menlo,monospace !important;
          font-size:${s(19)}px !important; line-height:1.7 !important;
          font-style:normal !important; font-weight:400 !important;
          letter-spacing:0 !important; text-transform:none !important;
          color:color-mix(in oklab, var(--ink) 46%, transparent) !important;
          transform:none !important; text-align:left !important; opacity:1 !important;
        }
        .lp-stage.ph-0 .beat svg, .lp-stage.ph-0 .beat .mark,
        .lp-stage.ph-1 .beat svg, .lp-stage.ph-1 .beat .mark{ opacity:0 !important; }
        .lp-stage .beat svg, .lp-stage .beat .mark{ transition:opacity .9s ease .3s; }

        /* ph-1 — THE DECISION. Only scale is still held back (that's the
           consequence, not the verdict); the voice's real family,
           weight, case and colour take over here, on the hard cut
           defined above. A quick flash marks the instant, so the eye
           catches that *something was decided* even in the beat before
           anything visibly grows. */
        .lp-stage.ph-1 .beat, .lp-stage.ph-1 .beat *{
          font-size:${s(19)}px !important; line-height:1.7 !important;
        }
        .lp-verdict{
          position:absolute; left:${s(-10)}px; top:50%; z-index:4;
          width:${s(9)}px; height:${s(9)}px; border-radius:999px;
          background:var(--accent); pointer-events:none; opacity:0;
          transform:translateY(-50%) scale(.6);
        }
        .lp-stage.ph-1 .lp-verdict{
          animation:lp-verdict-flash .55s cubic-bezier(.2,.8,.3,1) both;
        }
        @keyframes lp-verdict-flash{
          0%{ opacity:0; transform:translateY(-50%) scale(.5); }
          40%{ opacity:.9; transform:translateY(-50%) scale(1.6); }
          100%{ opacity:0; transform:translateY(-50%) scale(2.4); }
        }

        .lp-stage{ position:relative; z-index:3; flex:1 1 0; min-height:0;
          display:flex; flex-direction:column; justify-content:center; }

        /* ── THE SCORE ──────────────────────────────────────────── */
        .lp-score{
          position:relative; z-index:3; display:flex; align-items:flex-end; gap:${s(3)}px;
          height:${s(26)}px; margin-bottom:${s(12)}px; opacity:0;
          transition:opacity .9s ease .45s;
        }
        .render-shell:has(.lp-stage.ph-2) .lp-score{ opacity:.55; }
        .lp-score-mark{ flex:1 1 0; background:var(--accent); border-radius:1px; min-width:1px; }

        /* ── SPECIMEN CHROME ────────────────────────────────────── */
        .render-index{
          margin-left:auto; font-size:${s(14)}px; letter-spacing:.3em;
          text-transform:uppercase; color:var(--muted); font-weight:500;
        }

        /* POSTER GRADE — a reading palette is tuned for sustained
           comfort and reads washed out at thumbnail size. */
        .render-shell{ --ink: color-mix(in oklab, var(--ink) 88%, #000); }
        .render-shell::after{
          content:""; position:absolute; inset:0; pointer-events:none; z-index:1;
          background:radial-gradient(120% 80% at 50% 0%, transparent 40%, color-mix(in oklab, var(--ink) 16%, transparent) 100%);
        }

        /* the typed caret, only while it still looks typed */
        .lp-caret{ display:inline-block; width:.5em; height:1.05em; margin-left:.12em;
          background:var(--muted); vertical-align:-.16em; animation:lp-blink 1s steps(1) infinite; }
        .lp-stage.ph-1 .lp-caret, .lp-stage.ph-2 .lp-caret{ display:none; }
        @keyframes lp-blink{ 50%{ opacity:0; } }

        .render-foot{ position:relative; z-index:3; flex:0 0 auto; display:flex; align-items:center; gap:${s(14)}px;
          padding-top:${s(16)}px; border-top:1px solid var(--rule);
          font-size:${s(16)}px; letter-spacing:.12em; color:var(--muted); }
        .render-sig{ margin-left:auto; display:flex; align-items:center; gap:${s(6)}px; }
        .render-sig-arrow{ color:var(--accent); }

        @media (prefers-reduced-motion: reduce){
          .lp-stage .beat, .lp-stage .beat *, .render-shell .backdrop,
          .render-shell .artwork, .render-shell .signature, .render-head{ transition:none !important; }
          .lp-caret{ animation:none !important; }
        }
      `}</style>

      <main className={shellClass}>
        <Backdrop
          name={ad?.environment.key ?? (story.backdrop ?? undefined)}
          seed={story.id}
          ambient={ad?.ambientMotion}
          scheme={ad?.palette?.scheme}
        />
        {ad ? <div className="material-layer" /> : null}
        {ad ? <Artwork pieces={ad.artwork} seed={story.id} /> : null}
        {ad ? (
          <ArtSignature
            signature={ad.signature}
            seed={world?.scheme === "dark" ? 11 : 5}
            treatment={ad.artStyle.artworkTreatment}
            side="right"
          />
        ) : null}

        <div className="render-edge" />
        <div className="render-mark">{mark}</div>

        <header className="render-head">
          <span className="render-dot" />
          <span className="render-label">{label}</span>
          <span className="render-index">{mark.replace("LIVING PAGE / ", "NO. ")}</span>
        </header>

        <TransformStage fixed={fixed} loopMs={loopMs}>
          {/* SETUP — the premise, quiet, small caps. */}
          {setup ? <p className="lp-setup">{setup}<span className="lp-caret" /></p> : null}
          {/* TURN — the line the piece turns on. ph-1 is the engine's
              voice/body verdict landing (marked by the flash); ph-2 is
              everything that follows as its consequence: scale, the
              frame-breaching overflow, the doodle drawing in. */}
          {turn ? (
            <div className="lp-turn">
              <span className="lp-verdict" aria-hidden="true" />
              <Beat voice={hero.voice} body={hero.body} seed={seed}>{turn}</Beat>
            </div>
          ) : null}
        </TransformStage>

        {/* THE SCORE — one mark per beat, height by salience. Not
            information: evidence that the piece was composed. */}
        {strip.length ? (
          <div className="lp-score" aria-hidden="true">
            {strip.map((h, i) => (
              <span key={i} className="lp-score-mark" style={{ height: `${Math.round(h * 100)}%` }} />
            ))}
          </div>
        ) : null}

        <footer className="render-foot">
          <span>@{story.author.handle}</span>
          <span className="render-sig">
            {BRAND_HOST}
            <span className="render-sig-arrow">↗</span>
          </span>
        </footer>
      </main>
    </>
  );
}
