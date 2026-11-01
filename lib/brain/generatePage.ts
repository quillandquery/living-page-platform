import "server-only";

/**
 * STAGE 4 (Opus) — generate a bespoke living page.  (docs/BRAIN-API.md, D11)
 *
 * The gated, expensive step: Opus authors ONE self-contained HTML document that
 * renders THIS story as a unique living page — bespoke background, SVG artwork,
 * scroll-driven animation, per-beat text that unveils. Rendered in a sandboxed
 * iframe (allow-scripts, no same-origin) + a strict CSP, so the generated code
 * is fully creative yet cannot touch the app, the key, or the network. Falls
 * back to the deterministic renderer on any failure.
 */

import { callClaude, type Tier } from "@/lib/brain/router";
import type { BrainCast } from "@/lib/brain/castWithAI";
import { renderPrimitive, ART_PRIMITIVES } from "@/lib/brain/artPrimitives";

/**
 * Split the writer's text into SHORT, readable beats. Paragraph breaks are
 * honoured first; then any paragraph that's still a long run of sentences is
 * broken down to ~1-2 sentences (~160 chars) per beat, so the page never renders
 * a dense four-sentence wall. The words are never changed, only grouped.
 */
function splitBeats(text: string): string[] {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of paras) {
    if (p.length <= 240) { out.push(p); continue; } // only split a genuine wall, not every sentence
    const sentences = p.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [p];
    let buf = "";
    for (const s of sentences) {
      if (buf && (buf + s).length > 240) { out.push(buf.trim()); buf = s; }
      else buf += s;
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out.length ? out : paras;
}

// AESTHETIC SEED — a deterministic per-story nudge that pushes the model off its
// defaults in each design dimension, so two different stories can't land on the
// same serif-on-dark-gradient page. Derived from the text (stable per story), it
// is a STARTING POINT the prompt lets the model override when the story demands.
const TYPE_SEEDS = ["editorial serif (Georgia/Palatino)", "clean humanist sans (Helvetica Neue/Arial/system-ui)", "condensed impact display + sans body (Arial Narrow/Impact)", "typewriter monospace (Courier New)", "rounded soft sans (Trebuchet MS/Verdana)", "old-style classic (Garamond/Palatino) with mono labels"];
const LAYOUT_SEEDS = ["cinematic full-bleed scene", "typographic poster / editorial", "split / asymmetric composition", "quiet reading column in a drifting world", "fragmented / scattered beats", "document / archival on a material ground"];
const TEMP_SEEDS = ["warm (ambers, rust, gold)", "cool (indigo, slate, teal)", "high-contrast monochrome", "duotone (two colours only)", "bright paper / bleached daylight", "sun-faded warmth"];
function hashStr(s: string): number { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; }
function aestheticSeed(text: string): string {
  const h = hashStr(text);
  // unsigned shifts — a signed >> on a large hash yields a negative index (→ undefined)
  const t = TYPE_SEEDS[h % TYPE_SEEDS.length];
  const l = LAYOUT_SEEDS[(h >>> 5) % LAYOUT_SEEDS.length];
  const c = TEMP_SEEDS[(h >>> 11) % TEMP_SEEDS.length];
  return `AESTHETIC SEED — your STARTING POINT in each dimension (push OFF your defaults; override only if the story clearly calls for another):\n  typeface system = ${t}\n  layout archetype = ${l}\n  colour temperature = ${c}\nThis page must be unmistakably different from a default serif-on-dark-gradient page.`;
}

const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'">`;

// Watchdog injected into every generated page. If, a few seconds after load, the
// page HAS text but almost none is actually rendered visible (the model's unveil
// script didn't fire), force every element visible so the reader never faces a
// blank page. Guarded so it only acts on a genuinely broken page.
const FAILSAFE = `<script>/*__lpFailsafe*/(function(){function check(){try{var b=document.body;if(!b)return;var total=((b.innerText||'').replace(/\\s+/g,'')).length;if(total<120)return;var els=b.querySelectorAll('p,span,h1,h2,h3,h4,li,blockquote,em,strong,div,a');var shown=0;for(var i=0;i<els.length;i++){var e=els[i];var t=(e.textContent||'').trim();if(!t)continue;var cs=getComputedStyle(e);if(cs.visibility!=='hidden'&&cs.display!=='none'&&parseFloat(cs.opacity)>0.05)shown+=t.length;}if(shown<total*0.15){var s=document.createElement('style');s.textContent='*{opacity:1!important;filter:none!important;transform:none!important;visibility:visible!important}';document.head.appendChild(s);}}catch(e){}}setTimeout(check,3800);})();</script>`;

// PLUMBING ONLY. This shows the mechanics every page needs — a scroll-progress
// var, per-word unveil spans, reveal on scroll AND load, reduced-motion — in
// DELIBERATELY NEUTRAL styling (no real typeface, no scene, no colour world) so
// the model copies the TECHNIQUE and invents its own look. An earlier, fully
// art-directed exemplar here was the cause of every page looking identical
// (Georgia serif, a sky/ridge/sea scene, a giant centred lead) — the model just
// echoed it. Keep this skeleton styleless.
const EXEMPLAR = `<!-- PLUMBING ONLY — copy these mechanics, NOT any look. Invent your own typeface system, layout, colour world and scene for the actual story. -->
<style>
 :root{--p:0}*{margin:0;box-sizing:border-box}
 /* unveil mechanic (style the rest yourself) */
 .w{display:inline-block;opacity:0;transform:translateY(14px);transition:.7s cubic-bezier(.2,.7,.2,1)}
 .seen .w{opacity:1;transform:none}
 @media(prefers-reduced-motion:reduce){.w{opacity:1;transform:none}}
</style>
<!-- your own fixed world layers go here -->
<article><!-- each beat its own block, laid out and typeset however THIS story wants -->
 <p class="beat">A beat is a block of the writer's real words.</p>
</article>
<script>
 const r=document.documentElement;const set=()=>{const h=document.body.scrollHeight-innerHeight;r.style.setProperty('--p',(h>0?Math.min(1,scrollY/h):0).toFixed(3))};addEventListener('scroll',set,{passive:true});set();
 /* SAFE per-word wrap (DOM nodes, never innerHTML from text) */
 document.querySelectorAll('.beat').forEach(b=>{const parts=b.textContent.split(/(\\s+)/);b.textContent='';parts.forEach(t=>{if(!t)return;if(/^\\s+$/.test(t)){b.appendChild(document.createTextNode(t))}else{const s=document.createElement('span');s.className='w';s.textContent=t;b.appendChild(s)}})});
 /* reveal on arrival — stagger CAPPED so a long beat is fully in within ~1s */
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.querySelectorAll('.w').forEach((w,i)=>w.style.transitionDelay=Math.min(i*20,360)+'ms');e.target.classList.add('seen');io.unobserve(e.target)}}),{threshold:.15,rootMargin:'0px 0px -10% 0px'});
 document.querySelectorAll('.beat').forEach(b=>io.observe(b));
 addEventListener('load',()=>document.querySelectorAll('.beat').forEach(b=>{if(b.getBoundingClientRect().top<innerHeight*.95)b.classList.add('seen')}));
</script>`;

const SYSTEM = `You are the creative director, visual artist and interaction designer behind Living Page. You transform a personal story into an original, immersive digital experience authored as ONE self-contained HTML document. You are not designing a website; you are interpreting a human experience and translating it into a visual world that belongs to THIS story alone. Every story deserves its own artistic interpretation.

You are given a CREATIVE BRIEF for this story. Your job is to REALISE it in HTML — literally, not loosely. The brief hands you concrete living-page decisions you MUST implement:
- PAGE BEHAVIOUR — the one central thing the whole page does as the reader scrolls (e.g. the text is sketched in line by line, a diary is inked, the screen darkens and closes in, a grid fractures). Build exactly this; it is the spine of the page.
- REVEAL — how each line/word physically arrives for the reader (sketched stroke by stroke, inked letter by letter, faded up from black, assembled from fragments, typed with a cursor). Implement this specific reading experience, not a generic fade.
- WORD BEHAVIOURS — the specific words to animate to their meaning ("collide" → the words collide; "shattered" → it breaks apart; "gone" → it fades out). Wire up each one named.
- ARTWORK/ATMOSPHERE BEHAVIOUR, TRANSFORMATION, TYPE & PALETTE — honour them too.
Build the brief; do not restate it, and never fall back on a generic template.

METAPHOR OVER ILLUSTRATION. Do not automatically illustrate the objects, places or events named in the story (a bus, a temple, a battery, a lone walker). Look for the underlying emotional experience — the contradiction, the tension, the thing that transforms — and represent THAT, through abstract form, spatial relationship, scale, light, texture, typography and movement. Literal illustration is an option of last resort, never the default. A page that simply draws the nouns in the story has failed. This does NOT mean draw nothing — it means the drawn artwork should be abstract, symbolic or atmospheric (a line that deviates, a stain that spreads, forms that assemble or fracture, a horizon, a mark) rather than a labelled picture of each object. There must still be real, animated drawn work on the page.

INTERACTION IS THE NARRATIVE. The reader must not merely scroll past a sequence of animated paragraphs. Scroll is the mechanism through which the story physically PROGRESSES: the visual world changes STATE as the reader moves — appearing, deviating, losing information, dissolving, stilling, resolving — and every change must mean something in the story (the world changes because something in the story changes). Reveal-on-arrival is an entrance, not storytelling; go further and let the composition itself transform with the narrative. Not every story needs dramatic motion — stillness, silence and restraint can be the most powerful choice.

INTENSITY IS DICTATED BY THE STORY — not by a rule. Read the story's mood and energy and MATCH it. A hushed, tender or grieving piece → spare, elegant, lots of air, slow. An ecstatic, chaotic, furious or euphoric piece → go BIG: bold scale, strong motion, a world that surges, maximal if the story earns it. Do not default to either pole — let THIS story set how loud or quiet the page is. Use as much or as little as it warrants; one exceptional idea or many, whatever serves the feeling.

READABILITY & PACING (independent of intensity — this is craft, not restraint). However loud the register, the writer's prose must READ as prose: most beats are normal, comfortably readable lines or short paragraphs at a sensible measure (~32–46rem). NEVER set the whole page one word per line, and never fragment every sentence — a tower of single stacked words is exhausting and unreadable, NOT dramatic, and it defeats the point (people are here to READ the story). Reserve poster-scale type, stacking, scatter or a full-screen beat for the FEW pivotal words or lines the story truly earns, and let quiet, readable passages surround them so those peaks actually land. Intensity is about how FAR the peaks go — not about making every line a peak.

LIVING BASELINE — always required, at any intensity: the page must be ALIVE, never a plain text column on a flat white/cream background (a blog / Substack post — a FAILURE), and never a page whose ONLY motion is the background. That means ALL of:
- A motivated COLOUR WORLD / atmosphere with a sense of place and LIGHT that EVOLVES as the reader scrolls (warm→cold, bright→dusk, clear→clouded) — faint for a quiet story, dramatic for a loud one, but it changes.
- DRAWN, ANIMATED ELEMENTS — real hand-made SVG artwork, doodles, marks or objects that ARRIVE and ANIMATE as the story progresses: a line that draws itself (stroke-dash), a form that assembles, an object that enters / drifts / transforms, a mark that's struck, a shape that reacts to a beat. This is the part that's currently missing — a moving gradient behind text is NOT enough. Motivated by the story's metaphor, premium in craft (ink, pencil, painterly, geometric, collage) — NEVER clip-art, never a cute icon sitting beside each sentence, never juvenile. Give the page genuine drawn things that behave.
- The brief's REVEAL, built as a real, story-specific reading experience (sketched, inked, faded from dark, assembled) — not a generic fade.
- The brief's WORD BEHAVIOURS, wired up on those exact words.

THE CRAFT — think like a master designer; these are PRINCIPLES, not recipes. Clunky pages come from skipping this judgement (even type on a gradient, everything the same size, marks dropped in at random). Apply the SKILL and invent the specifics for THIS story:
- HIERARCHY & FOCAL POINT: decide the ONE thing the eye lands on first, then build real contrast of scale, weight and colour so attention is led through the page. A page where everything is the same size is the clunky default.
- CONTRAST & TENSION: pair opposites — huge against tiny, dense against empty, sharp against soft, one loud accent against a restrained field. Tension is what makes a composition feel designed rather than typed out.
- NEGATIVE SPACE is a material: emptiness is a deliberate choice; give the key moments room to breathe. Crowding reads as amateur.
- THE HUMAN HAND: a hand-made feeling comes from intentional imperfection — a mark slightly off-true, a considered rotation, optical (not mechanical) spacing. Motivated irregularity, never sloppiness. A rigid grid feels machine-made; a page with a hand feels alive.
- COHESION: one visual logic per page — a limited palette and a small type system used consistently, so every element belongs to the same world. A few fonts with a reason beat many by accident.
- MOTION HAS PHYSICS: things move as if they have mass — anticipation, weight, a settle; eased, never linear; choreographed, never everything at once. Motion should feel felt, not switched on.
- REDUCTION: every element must earn its place; cut whatever doesn't serve the feeling. Craft is as much what you remove as what you add.
- FINISH: the last 10% — alignment, optical kerning, a considered edge, a whisper of texture, the right easing curve — is the gap between competent and crafted. Sweat it.
- MARKS CARRY THE MOOD: anything you draw should feel made by THIS story's hand — frantic, delicate, precise, trembling — not a generic icon dropped in.
Living Page's own hand-built pages reach this bar in completely different registers. Reach the same level of judgement and finish — then invent a wholly different world for THIS story.

YOUR PALETTE — the materials to compose from (NOT a checklist and NOT a template; pick what THIS story needs and invent beyond them). You command the full range of HTML/SVG/CSS/JS:
- TYPE AS IMAGE: scale from poster-huge words to tiny captions; outlined/stroked letters, letters that overlap, run off the edge, stack or follow a path; mixed faces (a display, a hand/script, a mono) for voice.
- DRAWN ARTWORK: inline SVG you author — lines, strokes, forms, silhouettes, textures, abstract shapes — drawn with intent; a line that draws itself (stroke-dash), a form that assembles, a shape that reacts to a beat. Hand-quality, premium.
- BUILT SCENES & ATMOSPHERE: layered backgrounds tied to scroll — gradients, a glow/bloom, light that shifts, particles (rain, dust, stars, embers), fog, grain, parallax depth.
- EMPHASIS: brush-strokes or shapes behind words, underlines, a circled word, colour accents pulled from the palette.
- MOTION: a scroll-progress var (0..1) driving state, reveals with real easing, elements that enter / transform / drift, a hero moment that crescendos.
Compose SEVERAL of these into ONE coherent idea for the story — enough that the page is unmistakably crafted and alive. A bare column of text on a flat ground is a FAILURE: there must be authored artwork and a built, evolving scene, every time.

NO TEMPLATES. There is no prescribed layout, aesthetic, illustration style, colour palette or animation. A Living Page could be a typographic experiment, an architectural composition, an abstract moving painting, a surreal landscape, a visual diary, a cinematic sequence, an interactive map, or a world of geometry and light. These are possibilities, not templates — invent the one this story needs.

TWO TESTS your page MUST pass:
1. If the same visual concept could be dropped onto an unrelated story without substantial change, it is too generic — discard it and go deeper into THIS story.
2. Every major visual element must have a narrative reason to exist. Cut anything whose only purpose is to make the page look more sophisticated.

THE ONE HARD AESTHETIC LINE: never juvenile — no cartoon characters, faces, mascots, storefronts, readable logos, candy colours, clip-art icons, or an emoji/glyph sitting beside each sentence. Premium, intentional and emotionally true, always. Readable always — never text the same tone as its ground.

TECHNICAL CONTRACT (hard rules):
- Output ONE complete HTML document and NOTHING else (no markdown fence, no commentary). Start at <!doctype html>.
- Fully SELF-CONTAINED: inline all CSS, SVG and JS. No external resources — no <link>, no web fonts, no CDN, no url(http...), no fetch/import/XHR/WebSocket. Images only as inline SVG or data: URIs. System fonts only — a wide range is available, choose to fit the voice: Georgia, Palatino, "Times New Roman"; "Helvetica Neue", Arial, system-ui; "Arial Narrow", Impact; "Courier New", ui-monospace; "Trebuchet MS", Verdana, Tahoma.
- Render the writer's EXACT words, in order, split into the beats I give you (one per paragraph). Never rewrite, summarise, reorder or drop a word — numbers included.
- The words live DIRECTLY in the HTML as readable text inside the beat elements; the full story must read even if the JS never runs. If you animate per word, wrap words ALREADY in the markup, and wrap them SAFELY with DOM text nodes (createElement + textContent) — never rebuild innerHTML from story text (it may contain <, > or &), never inject sentences from JS or data-attributes.
- Scroll drives STATE, not just entrances: read scroll progress (0..1) and let the world's state follow it. Reveal each beat on arrival AND on load; CAP any per-word stagger so a long paragraph is fully revealed within ~1s; nothing may remain at opacity:0.
- Responsive ~380px → desktop. Respect prefers-reduced-motion (no motion, full opacity, full legibility). Keep it smooth on a phone — favour transform/opacity, avoid heavy continuous work.
- COMPACT code: minimal whitespace, concise CSS/JS — spend the budget on the idea, not formatting.

Below is a PLUMBING skeleton — copy ONLY its mechanics (scroll-progress var, SAFE per-word wrapping, capped reveal on scroll + load, reduced-motion). It is deliberately styleless — no typeface, no scene, no colour, no layout. Invent all of that from the brief:
${EXEMPLAR}`;

// DETERMINISTIC WORD BEHAVIOUR. Like the art primitives, meaning-tied word
// motion shouldn't depend on the LLM remembering to do it. We inject a tiny
// dictionary (meaning → motion) that tags matching word-spans after they're
// wrapped — "storm"/"shaking" tremble, "drifted"/"floating" sway, "gold"/"glow"
// warm-glow, "whisper"/"faded" breathe, "heart"/"love" pulse, "rise"/"stars"
// lift. Subtle, looping, reduced-motion-safe. Applied to the decomposed page.
const WORD_FX = `<style>
@keyframes fxTremble{0%,100%{transform:translateX(0)}25%{transform:translateX(-1.5px) rotate(-.5deg)}75%{transform:translateX(1.5px) rotate(.5deg)}}
@keyframes fxSway{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-4px) rotate(2.5deg)}}
@keyframes fxGlow{0%,100%{text-shadow:0 0 6px rgba(255,210,140,.3)}50%{text-shadow:0 0 16px rgba(255,210,140,.85)}}
@keyframes fxFade{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes fxPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.13)}}
@keyframes fxRise{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.fx-tremble{display:inline-block;animation:fxTremble .35s ease-in-out infinite}
.fx-sway{display:inline-block;animation:fxSway 4s ease-in-out infinite}
.fx-glow{animation:fxGlow 3.5s ease-in-out infinite;color:#ffd9a0}
.fx-fade{display:inline-block;animation:fxFade 4.5s ease-in-out infinite}
.fx-pulse{display:inline-block;animation:fxPulse 1.7s ease-in-out infinite;color:#ff9a9a}
.fx-rise{display:inline-block;animation:fxRise 4.5s ease-in-out infinite}
@media(prefers-reduced-motion:reduce){[class*=fx-]{animation:none!important}}
</style>
<script>/*__lpWordFx*/(function(){var M={tremble:['shaking','shaky','trembling','tremble','storm','stormy','afraid','scared','nervous','shook','shiver','quiver','trembled'],sway:['drifted','drift','drifting','floating','float','floated','sway','adrift','wander','wandering','swaying'],glow:['gold','golden','warm','warmth','glow','glowing','sun','sunlight','fire','ember','embers','shine','shining','shimmer','bright','radiant'],fade:['fade','faded','fading','whisper','whispered','gone','vanish','vanished','disappear','disappeared','quiet','silence','silent','dissolve'],pulse:['heart','heartbeat','love','loved','beating','pulse','alive'],rise:['rise','rose','rising','soar','soaring','soared','lift','lifted','upward','sky','stars','starlight']};var map={};for(var k in M){M[k].forEach(function(w){map[w]='fx-'+k})}function tag(){try{var ws=document.querySelectorAll('span.w');for(var i=0;i<ws.length;i++){var s=ws[i];if(s.querySelector('*'))continue;var t=(s.textContent||'').toLowerCase().replace(/[^a-z']/g,'');var c=map[t];if(c&&!/fx-/.test(s.className))s.classList.add(c)}}catch(e){}}tag();setTimeout(tag,1400);})();</script>`;

// ── DECOMPOSED PIPELINE (SVG-ORA inspired) ──────────────────────────────────
// Instead of one model drawing the whole page, a SHELL call designs the full
// bespoke page — layout, CSS, text, motion — but leaves EMPTY art slots; then
// each slot's artwork is drawn by a focused, parameterised SVG call (in
// parallel). Bespoke layout + clean, controllable, parallel art.

const SHELL_SYSTEM = `You are a generative interactive designer for Living Page. Given a personal story, author ONE self-contained HTML document that renders it as an immersive LIVING PAGE: a single FULL-BLEED world the words live inside, that EVOLVES as the reader scrolls, with the beats unveiling on arrival. Aim for extraordinary — the quality of an award-winning scrollytelling piece.

THE CRAFT BAR (hold this ALWAYS, whatever the story's intensity) — reference piece "rained out": a deep indigo night melting into a warm amber glow-bloom on the horizon, elegant minimal palm silhouettes, fine grain, a calm readable serif with a few key words tinted a muted lavender. What makes it the bar is the CRAFT, not the calmness:
- LIGHT & COLOUR done beautifully: a cohesive, tonal, motivated palette with real gradient range and a focal glow/light. Never garish, never a flat dark void, never pure-white-on-everything. Text colour pulled from the palette so it belongs to the world.
- SOPHISTICATED, not juvenile: elegant abstract/atmospheric forms and minimal graceful silhouettes. NEVER cartoon characters, faces, mascots, storefronts, readable logos, hard-outlined clip-art, candy colours, or cute props. That is the one hard line.
- REFINED TYPOGRAPHY and INTENTIONAL composition — every choice deliberate, nothing amateur or accidental. Emphasis can be a subtle colour tint on key words, or scale — but it must feel considered, never jarring-for-its-own-sake.

INTENSITY COMES FROM THE STORY (this is NOT always minimal):
- READ the story's mood and energy and match it. A quiet, reflective, melancholy piece → restrained and elegant like "rained out" (calm even body, subtle colour emphasis, lots of negative space). A chaotic, intense, ecstatic, angry or loud piece → go BIGGER and more maximalist — bolder type, more motion, more drama, a world that surges — but with the SAME craft and taste (still no cartoon, still harmonised colour, still intentional). Maximalism here means sophisticated and dynamic, never busy or childish.
- So decide the register FROM the story, then execute it at the "rained out" level of craft.

CRUCIAL DIFFERENCE: you do NOT draw the artwork yourself. Wherever the page needs a drawn picture (the full-bleed background world, an atmospheric scene), you place an EMPTY slot and describe what belongs there, and it will be drawn and inserted for you:
<div class="art" data-art="a vivid, specific, GROWN-UP description — atmospheric and abstract, not a literal cartoon — e.g. 'full-bleed background: a rain-blurred night street reduced to pools of bokeh light and wet reflection, deep indigo warming to amber at the horizon; impressionistic, filmic, no literal figures or signage'" data-fit="cover"></div>
- Describe ATMOSPHERE, PLACE and LIGHT with a FOCAL GLOW — e.g. "a deep indigo night sky melting into a soft warm amber glow-bloom on the horizon, with a couple of elegant minimal palm silhouettes and a fine grain". ELEGANT MINIMAL SILHOUETTES are welcome and encouraged (palms, a horizon, hills, rooftops, a lone distant figure) — simple, graceful, flat dark shapes. What's forbidden is DETAILED cartoon figures/faces, storefronts, readable logos, cute props.
- Use 1 to 3 slots. ONE is the full-bleed background world (position:fixed;inset:0): a rich gradient atmosphere + glow-bloom + silhouettes, never a flat near-black void. A second can be a subtle accent.
- Size/position each slot with your own CSS. Motivated by THIS story's setting and mood; premium/editorial in tone.

FREE ATMOSPHERE GENERATORS: for texture and atmospheric LAYERS — rain, grain, a mesh-gradient sky, waves/sea/hills, fog/mist, stars — do NOT describe an art slot. Instead drop a generator slot, which is filled instantly and perfectly for free:
<div class="art" data-gen="rain" data-colors="#cfd8e6" data-angle="12"></div>
Available data-gen values: ${ART_PRIMITIVES.join(", ")}. Pass data-colors (comma-separated, from your palette) and any generator hints (data-angle, data-speed, data-opacity, data-layers, data-count). Use these for the sky/gradient background, rain, grain overlay, fog, stars, waves — layer several (e.g. a mesh sky UNDER a rain overlay UNDER a grain overlay). PREFER these generators to carry most of the atmosphere — a page can be gorgeous from generators + typography alone. Use a described data-art slot only for ONE bespoke atmospheric background, and keep it abstract/editorial.

PACING & READING (match it to the story's register):
- READABILITY always holds: body text at a comfortable measure (~34-44rem) and a readable size, generous line-height, clear gaps between paragraphs, in short paragraphs. The reader must be able to actually READ it, however dramatic the page is.
- For a QUIET piece: a calm, mostly consistent, left-aligned reading column over the slowly-shifting world — like a gorgeous long-form essay. Emphasis is the subtle colour tint on key words.
- For an INTENSE piece: you may pull pivotal lines to larger scale, shift weight, let a key line break alone, let the world react harder — as the story earns it. But keep it readable and keep it tasteful; don't fragment every sentence or ping-pong alignment without reason.
- Either way: do NOT force every beat onto its own full screen (no exhausting 15-screen scroll). Let paragraphs flow; the fixed gradient/glow evolves underneath as you read.
- If a beat arrives as one long UNBROKEN block, break it into short paragraphs yourself (add breaks and spacing, never change or drop a word).

You STILL build everything else, fully and well:
- The complete layout and all CSS; the typographic treatment described above (calm consistent reading column for quiet stories, bolder for intense ones) — always intentional and tasteful.
- The beats as REAL text directly in the markup (every word, numbers too), split into their own blocks. Never inject text from JS.
- The word-unveil: wrap each word in <span class="w"> (use exactly that class name) and reveal on scroll via IntersectionObserver AND on load; nothing stays invisible.
- A scroll-progress CSS var (0..1) that your slots and styles can react to, so the world evolves.
- prefers-reduced-motion handling. Fully self-contained (no external resources). Start at <!doctype html>, output ONLY the HTML.`;

/** Draw ONE self-contained SVG for a slot — the SVG-ORA move: focused, bounded,
 *  parameterised, clean-extracted. */
async function generateSvgPiece(tier: Tier, desc: string, fit: string, palette: string): Promise<string> {
  const sys = `You are a fine-art SVG artist producing a GALLERY-GRADE, filmic background for an editorial story page. Think moody abstraction, atmospheric painting, light and shadow — the opposite of a cartoon.
RULES:
- Return ONLY raw SVG code (<svg ...>...</svg>). No markdown, no commentary.
- viewBox + preserveAspectRatio="xMidYMid slice" so it fills a "${fit}" slot edge to edge, minimal margin.
- STYLE: painterly and atmospheric — soft layered gradients, blurred depth (feGaussianBlur), grain/texture (feTurbulence), bloom and light, impressionistic forms. Suggest the scene through light, colour and shape, not literal detail.
- STRICTLY FORBIDDEN (these look juvenile): cartoon people or characters, faces, mascots, storefronts, readable signage or logos, flat clip-art icons, hard outlines, bright primary/candy colours, cute rounded props. If a human presence is wanted, imply it with at most a soft distant silhouette or an empty-feeling space — never a detailed figure.
- Palette/mood: ${palette}. Muted, tonal, cohesive — never garish.
- Fully self-contained: inline everything, no <image>, no external refs, no web fonts. Subtle inline CSS/SMIL animation welcome if it suits the mood.`;
  const res = await callClaude(tier, sys, `Draw this: ${desc}`, 5000, 60_000);
  if (!res.ok) return "";
  const t = res.text; const a = t.search(/<svg/i); const b = t.toLowerCase().lastIndexOf("</svg>");
  return a >= 0 && b > a ? t.slice(a, b + 6) : "";
}

const SLOT_RE = /<div\b([^>]*\bdata-art=(?:"([^"]*)"|'([^']*)')[^>]*)>\s*<\/div>/gi;
const GEN_RE = /<div\b([^>]*\bdata-gen=(?:"[^"]*"|'[^']*')[^>]*)>\s*<\/div>/gi;

/** The decomposed generation: shell → parse slots → draw each SVG in parallel → assemble. */
async function runDecomposed(beats: string[], title: string | undefined, palette: string, tier: Tier): Promise<GenResult> {
  const shellUser = `${title ? `Title: ${title}\n` : ""}${aestheticSeed(beats.join("\n\n"))}\n\nBeats (render each verbatim, in order):\n${beats.map((b, i) => `[${i + 1}] ${b}`).join("\n\n")}`;
  const sres = await callClaude(tier, SHELL_SYSTEM, shellUser, 12000, 90_000);
  if (!sres.ok) return sres;
  const doc = extractDoc(sres.text);
  if (!doc.ok) return doc;
  let html = doc.html;

  // 0. FREE: fill every generator slot deterministically (no model call).
  html = html.replace(GEN_RE, (whole: string, attrs: string) => {
    const raw: Record<string, string> = {};
    for (const a of attrs.matchAll(/data-([a-z]+)=(?:"([^"]*)"|'([^']*)')/gi)) raw[a[1].toLowerCase()] = a[2] ?? a[3] ?? "";
    const svg = renderPrimitive(raw["gen"] ?? "", raw);
    return svg ? `<div${attrs}>${svg}</div>` : whole;
  });

  // collect the bespoke-subject slots the shell declared (these go to the LLM)
  const slots: { desc: string; fit: string }[] = [];
  for (const m of html.matchAll(SLOT_RE)) {
    const attrs = m[1]; const desc = (m[2] ?? m[3] ?? "").trim();
    const fit = (attrs.match(/data-fit=(?:"([^"]*)"|'([^']*)')/)?.[1] ?? "cover");
    if (desc) slots.push({ desc, fit });
  }
  // draw them all at once
  const svgs = await Promise.all(slots.map((s) => generateSvgPiece(tier, s.desc, s.fit, palette)));
  // inject each drawn SVG back into its slot, in order
  let i = 0;
  html = html.replace(SLOT_RE, (whole, attrs) => {
    const svg = svgs[i++];
    return svg ? `<div${attrs}>${svg}</div>` : whole;
  });
  // make every slot's SVG fill its box
  const fillCss = `<style>.art{overflow:hidden}.art>svg{width:100%;height:100%;display:block}</style>`;
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${fillCss}</head>`) : fillCss + html;

  // deterministic meaning-tied word motion
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${WORD_FX}</body>`) : html + WORD_FX;

  const grade = gradePage(html, beats);
  if (grade.fatal) return { ok: false, reason: "invalid", detail: `decomposed low quality: ${grade.reasons.join("; ")} (${slots.length} slots)` };
  return { ok: true, html: finalize(html) };
}

export type GenResult =
  | { ok: true; html: string }
  | { ok: false; reason: "no-key" | "api-error" | "invalid"; detail?: string };

/** Pull the HTML document out of the model's reply. No judgement of quality
 *  here — that's the gate's job. Returns the raw document or an error. */
function extractDoc(raw: string): { ok: true; html: string } | { ok: false; reason: "api-error" | "invalid"; detail: string } {
  let h = raw.trim();
  if (h.length < 40 || !/<[a-z]/i.test(h)) return { ok: false, reason: "api-error", detail: "empty generation" };
  const lower = h.toLowerCase();
  const start = lower.indexOf("<!doctype") >= 0 ? lower.indexOf("<!doctype") : lower.indexOf("<html");
  const end = lower.lastIndexOf("</html>");
  if (start >= 0 && end > start) h = h.slice(start, end + 7);
  else if (!/<html/i.test(h)) h = `<!doctype html><html><head></head><body>${h}</body></html>`;
  if (h.length > 400_000) return { ok: false, reason: "invalid", detail: "too large" };
  return { ok: true, html: h };
}

type Grade = { pass: boolean; fatal: boolean; reasons: string[] };
/**
 * THE QUALITY GATE. A bespoke page is one LLM shot and quality swings run to
 * run, so we grade the output on the things that make it a *living page* (not a
 * blank or a plain article) and reject the duds. "fatal" flaws (no text, no art)
 * earn a regeneration with feedback; "soft" ones (one axis thin) are tolerated.
 */
function gradePage(html: string, beats: string[]): Grade {
  const reasons: string[] = [];
  const lower = html.toLowerCase();
  const noTags = html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ");
  // Two strips: one keeps word gaps (tags → space), one is DENSE (tags → "") so
  // that per-letter or per-word animation spans — <span>t</span><span>r</span> —
  // rejoin into findable words instead of becoming "t r a v". A word counts if it
  // survives in EITHER. This stopped the gate from rejecting perfectly good pages.
  const spaced = (" " + noTags.replace(/<[^>]+>/g, " ") + " ").replace(/\s+/g, " ").toLowerCase();
  const dense = noTags.replace(/<[^>]+>/g, "").toLowerCase();
  // 1. the writer's own words actually render
  const words = [...new Set((beats.join(" ").toLowerCase().match(/[a-z']{5,}/g) ?? []))].slice(0, 40);
  const present = words.filter((w) => spaced.includes(w) || dense.includes(w)).length;
  const textMissing = words.length >= 5 && present < Math.ceil(words.length * 0.35);
  if (textMissing) reasons.push("most of the story's words don't render");
  // 2. a composed VISUAL IDEA — SVG shapes, a built CSS scene (gradients), OR a
  //    strong typographic/architectural composition (big display sizes, letter-
  //    spacing, mix-blend, clip-path, masks). Artwork is NOT mandatory now — a
  //    typography-only page is valid — so this is a SOFT signal, never fatal.
  const svgShapes = (lower.match(/<(path|circle|rect|line|polygon|polyline|ellipse)\b/g) ?? []).length;
  const gradients = (lower.match(/(linear|radial|conic)-gradient/g) ?? []).length;
  const bigType = (lower.match(/font-size\s*:\s*(clamp\([^)]*\)|[6-9]\d*vw|[4-9]rem|\d{3,}px)/g) ?? []).length;
  const compositional = /clip-path|mix-blend-mode|-webkit-background-clip|mask\s*:|letter-spacing/.test(lower);
  const thinVisual = svgShapes < 3 && gradients < 2 && bigType < 2 && !compositional;
  if (thinVisual) reasons.push("thin visual idea — no artwork, built scene, or strong typographic composition");
  // a LIVING BASELINE: a motivated atmosphere/colour world, not a plain page under
  // a text column (the Substack failure). A gradient OR a fixed full-bleed layer.
  const atmosphere = gradients >= 1 || (/position\s*:\s*fixed/.test(lower) && (/inset\s*:\s*0/.test(lower) || /100v[hw]/.test(lower) || (/top\s*:\s*0/.test(lower) && /bottom\s*:\s*0/.test(lower))));
  if (!atmosphere) reasons.push("flat ground — needs a motivated, evolving colour world/atmosphere with light, not a plain page under text");
  // DRAWN, ANIMATED ELEMENTS (not just a moving background) — the thing most
  // often missing: real SVG artwork/doodles that arrive and move.
  if (svgShapes < 2) reasons.push("no drawn artwork/doodles — needs crafted SVG elements that arrive and animate, not only a background");
  const foregroundMotion = /@keyframes/.test(lower) || /animation\s*:/.test(lower) || /stroke-dash/.test(lower) || /requestanimationframe/.test(lower);
  if (!foregroundMotion) reasons.push("nothing in the foreground animates — only the background moves; add drawn elements that draw in / enter / transform");
  // 3. it must EVOLVE — unveil / scroll-reactive world / animation (soft)
  const motion = /intersectionobserver/.test(lower) || /addeventlistener\(['"]scroll/.test(lower) || /@keyframes/.test(lower) || /transition\s*:/.test(lower) || /requestanimationframe/.test(lower);
  if (!motion) reasons.push("nothing changes as you read (no reveal, no scroll-driven state, no transition)");
  // 4. the beats are broken into their own blocks, not one wall
  const blocks = (lower.match(/<(p|h1|h2|h3|h4|section|article|blockquote|li|div)\b/g) ?? []).length;
  if (blocks < Math.max(3, Math.ceil(beats.length * 0.6))) reasons.push("the beats aren't broken into their own blocks");
  if (html.length < 1800) reasons.push("far too sparse");
  // fatal = not a living page AT ALL: the words don't render; it's basically
  // empty; OR it's BARE — no drawn artwork AND no built scene (a plain column of
  // text on a flat ground), which is the clunky regression we must reject. A bare
  // page earns a regeneration with feedback rather than shipping.
  const bare = svgShapes < 2 && !atmosphere;
  const fatal = textMissing || html.length < 1800 || bare;
  return { pass: reasons.length === 0, fatal, reasons };
}

/** Inject the CSP + the reveal failsafe, producing the final shippable page. */
function finalize(html: string): string {
  let h = html;
  if (/<head[^>]*>/i.test(h)) h = h.replace(/<head[^>]*>/i, (m) => m + CSP);
  else h = h.replace(/<html[^>]*>/i, (m) => `${m}<head>${CSP}</head>`);
  h = /<\/body>/i.test(h) ? h.replace(/<\/body>/i, `${FAILSAFE}</body>`) : h + FAILSAFE;
  return h;
}

// ── CREATIVE BRIEF STAGE (interpretation BEFORE design) ──────────────────────
// Raw story → HTML is too big a leap and makes the model decorate paragraphs. A
// fast call first INTERPRETS the story and commits to a singular artistic
// direction (metaphor, transformation, interaction) — then the Opus build
// realises that concept. The direction's "signature" is remembered so the next
// few pages are actively pushed to differ: the real mechanism behind "no two
// alike" (a model can't self-compare pages it never sees).
const recentDirections: string[] = [];
function rememberDirection(sig: string) {
  if (!sig) return;
  recentDirections.unshift(sig);
  while (recentDirections.length > 6) recentDirections.pop();
}

const BRIEF_SYSTEM = `You are the creative director for Living Page. A Living Page is NOT a styled article — it is an ANIMATED READING EXPERIENCE where the words behave, the artwork behaves, the whole page behaves, and text ARRIVES in a way that means something. Before any code exists, you interpret ONE personal story and commit to a concrete, executable living-page direction: not abstract art-speak, but specific behaviours a developer can build.

First, read the whole story and find: its emotional centre (the real feeling under the events); its mood/tone (tender, creepy, ecstatic, grieving, anxious, wry, numb…); its central tension or contradiction; what CHANGES from first line to last; the feeling the reader should carry away. Reach for a visual metaphor that is NOT a literal picture of the story's objects (a bus, a temple, a battery) — a bus story might be a transit map that deviates and loses its logic; a draining phone might be the page itself losing information.

Then commit to these CONCRETE living-page decisions:

1. PAGE BEHAVIOUR — the ONE central thing the whole page DOES as the reader moves through it. Make it specific and buildable. For example (invent your own, don't pick from this list): the story is sketched in pencil, line by line, as you scroll · a diary handwritten in ink, each entry appearing as if written · the screen slowly darkens and closes in as dread builds · a bright room whose light dies to dusk by the end · a clean grid that fractures and drifts apart · a photograph developing from blank paper · everything bleached whiter and emptier until almost nothing is left.

2. REVEAL — HOW the lines and words physically ARRIVE (the actual reading UX; be specific). e.g. each line is sketched stroke by stroke · ink handwriting appears letter by letter with a nib · words fade up out of black · letters assemble from scattered fragments · typed with a blinking cursor · lines rise and settle like breath. Say what the reader literally sees as each beat comes in.

3. WORD BEHAVIOURS — choose 2–5 SPECIFIC words or short phrases FROM THE STORY and say exactly how each behaves, tied to its meaning. e.g. "collide" → the two words slam together and jolt · "shattered" → the word breaks into falling shards · "drifted" → it floats loose and sways · "gone" → it fades to nothing · "louder" → it grows with each repetition · a shouted line → slams in huge. These are the small surprises; pick ones the story earns.

4. ARTWORK / ATMOSPHERE BEHAVIOUR — propose at least ONE real DRAWN element that ANIMATES as the reader scrolls (not just a moving background): a line that draws itself, a form that assembles or fractures, an object that enters/drifts/transforms, marks or doodles that are struck. Say what it is and what it DOES. e.g. a single ink line draws itself across the page · a stain spreads · a route deviates stroke by stroke · stars come out as it darkens. Abstract/symbolic and premium (ink, pencil, painterly, geometric) — never clip-art or a cute icon per line. A quiet story can have one spare drawn gesture; a loud one more.

5. REGISTER — how loud or quiet the page should be, dictated by the story's own energy (hushed · restrained · lively · bold · maximal). A tender/grieving story is spare and slow; an ecstatic/chaotic/furious one goes big and surging. Do not default — let the story decide.

6. TRANSFORMATION, TYPE & PALETTE — the world's state at the start vs the end and why it changes; the typographic voice (serif/sans/condensed/mono/handwritten — motivated by mood); the colour/material world (need not be dark).

TWO TESTS: (1) if this direction could be dropped on an unrelated story unchanged, it's too generic — go deeper; (2) every behaviour must have a narrative reason — cut anything that's only decoration.

AVOID REPEATING these recent directions — yours must be meaningfully different in page behaviour, reveal AND metaphor:
{avoid}

Respond with ONLY compact JSON, no prose:
{"mood":"...","register":"hushed|restrained|lively|bold|maximal — from the story","emotional_centre":"...","contradiction":"...","metaphor":"...","page_behaviour":"the one central mechanic, specific","reveal":"how lines/words arrive","word_behaviours":[{"word":"...","behaviour":"..."}],"artwork_behaviour":"the drawn element(s) and exactly what they DO as you read (must animate, not static)","transformation":"start state → end state, and why","type_palette":"typographic voice + colour/material world","signature":"6-10 words naming this direction"}`;

type Brief = { brief: string; signature: string };
async function creativeBrief(text: string, title: string | undefined, tier: Tier): Promise<Brief | null> {
  const avoid = recentDirections.length
    ? recentDirections.map((d, i) => `${i + 1}. ${d}`).join("\n")
    : "(none yet — you are free, but still make a bold, specific choice)";
  const sys = BRIEF_SYSTEM.replace("{avoid}", avoid);
  const user = `${title ? `Title: ${title}\n` : ""}Story:\n${text.slice(0, 6000)}`;
  const res = await callClaude(tier, sys, user, 1400, 45_000, "medium");
  if (!res.ok || !res.text.trim()) return null;
  try {
    const a = res.text.indexOf("{"), b = res.text.lastIndexOf("}");
    if (a < 0 || b <= a) return null;
    const j = JSON.parse(res.text.slice(a, b + 1)) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    // word behaviours arrive as [{word, behaviour}] — render as a concrete list
    let wb = "";
    if (Array.isArray(j.word_behaviours)) {
      wb = j.word_behaviours
        .map((w) => { const o = (w ?? {}) as Record<string, unknown>; const word = str(o.word); const beh = str(o.behaviour); return word && beh ? `   • "${word}" → ${beh}` : ""; })
        .filter(Boolean).join("\n");
    }
    const brief = [
      str(j.mood) && `Mood: ${str(j.mood)}`,
      str(j.register) && `Register (how loud/quiet — dictated by the story, match it): ${str(j.register)}`,
      str(j.emotional_centre) && `Emotional centre: ${str(j.emotional_centre)}`,
      str(j.contradiction) && `Central tension: ${str(j.contradiction)}`,
      str(j.metaphor) && `Visual metaphor — BUILD THIS, do not illustrate the nouns: ${str(j.metaphor)}`,
      str(j.page_behaviour) && `PAGE BEHAVIOUR — the central thing the whole page does as you scroll (build this): ${str(j.page_behaviour)}`,
      str(j.reveal) && `REVEAL — how each line/word must physically arrive for the reader: ${str(j.reveal)}`,
      wb && `WORD BEHAVIOURS — animate these specific words to their meaning:\n${wb}`,
      str(j.artwork_behaviour) && `Artwork/atmosphere behaviour (what it does as you read): ${str(j.artwork_behaviour)}`,
      str(j.transformation) && `Transformation (start → end, and why): ${str(j.transformation)}`,
      str(j.type_palette) && `Type & palette: ${str(j.type_palette)}`,
    ].filter(Boolean).join("\n");
    return brief ? { brief, signature: str(j.signature) } : null;
  } catch { return null; }
}

export async function generatePage(
  text: string,
  title: string | undefined,
  cast?: BrainCast,
  opts?: { tier?: Tier; mode?: "single" | "decomposed" },
): Promise<GenResult> {
  const beats = splitBeats(text);

  // Decomposed path: shell designs the page + art slots, focused SVG calls fill them.
  if (opts?.mode === "decomposed") {
    const dTier: Tier = opts.tier && (["haiku", "sonnet", "opus"] as const).includes(opts.tier) ? opts.tier : "sonnet";
    const palette = cast?.palette ? JSON.stringify(cast.palette) : "drawn from the story's own setting and mood; no black-by-default, no neon-by-default";
    return runDecomposed(beats, title, palette, dTier);
  }
  // STAGE A — interpret the story and commit to a direction (fast, cheap).
  const brief = await creativeBrief(text, title, "sonnet");
  if (brief) rememberDirection(brief.signature);
  const briefBlock = brief
    ? `\n\nCREATIVE BRIEF for this story — REALISE it (build it; do not restate it, do not fall back on a template):\n${brief.brief}`
    : `\n\n${aestheticSeed(text)}`; // brief unavailable → fall back to the deterministic anti-default nudge
  const avoidBlock = recentDirections.length > 1
    ? `\n\nRecent pages went in these directions — make THIS one meaningfully different: ${recentDirections.slice(1).join(" · ")}.`
    : "";
  const baseUser = `${title ? `Title: ${title}\n` : ""}Beats (render each verbatim, in order):\n${beats.map((b, i) => `[${i + 1}] ${b}`).join("\n\n")}${briefBlock}${avoidBlock}`;

  // ART IS OPUS. The page is the one place quality must not bend, and the cheaper
  // models drop words and draw generic clip-art — so the artwork pass is Opus.
  // "Least expensive Opus": ONE Opus call in the normal case (prompt-cached, output
  // capped). A SECOND Opus call happens ONLY when the first FATALLY fails the gate
  // (no text / no art), which with Opus is rare — so we almost never pay twice.
  // The cheap tiers (haiku/sonnet) stay on the story-refinement side (suggest/cast).
  // Env can still pin the run (BRAIN_GENERATE_TIER = haiku | sonnet | opus).
  const pin = (opts?.tier ?? (process.env.BRAIN_GENERATE_TIER as Tier | undefined));
  const ladder: Tier[] = pin && (["haiku", "sonnet", "opus"] as const).includes(pin)
    ? [pin, pin] : ["opus", "opus"];
  const maxTokens = 16000;

  // Up to two shots, gated. The first is plain; if it comes back a dud (no words,
  // no art), the second steps up a model AND is told EXACTLY what was wrong. We keep
  // the best page seen so a soft-flawed one still ships rather than falling to Auto.
  let best: { html: string; grade: Grade } | null = null;
  let lastErr: GenResult = { ok: false, reason: "api-error", detail: "no generation" };
  // Hard wall: Vercel kills the function at 300s. An Opus page is ~150-200s, so a
  // SECOND Opus pass would blow the ceiling and 504 (the client's "couldn't reach").
  // So we only start a regeneration while there's budget left for it to finish.
  const started = Date.now();
  const REGEN_BUDGET_MS = 90_000;
  for (let shot = 0; shot < 2; shot++) {
    if (shot > 0 && Date.now() - started > REGEN_BUDGET_MS) break; // no time for another pass — ship best / fall back
    const fix = shot === 0 || !best
      ? ""
      : `\n\nYour previous attempt was rejected for: ${best.grade.reasons.join("; ")}. Fix every one of these while staying true to the creative brief — realise the metaphor and the transformation, make the words render as real text, let the world change as the reader scrolls, and break each beat into its own block. Return the full corrected HTML document only.`;
    // 90s idle window: a big page can take a while to START emitting; the default
    // 45s was firing on that first-token latency and aborting good generations.
    const res = await callClaude(ladder[shot], SYSTEM, baseUser + fix, maxTokens, 90_000);
    if (!res.ok) { lastErr = res; if (best) break; else continue; }
    const doc = extractDoc(res.text);
    if (!doc.ok) { lastErr = doc; if (best) break; else continue; }
    const grade = gradePage(doc.html, beats);
    if (grade.pass) return { ok: true, html: finalize(doc.html) };
    // keep the strongest attempt (fewest reasons)
    if (!best || grade.reasons.length < best.grade.reasons.length) best = { html: doc.html, grade };
    if (!grade.fatal) break; // soft flaw only — ship the best we have
  }
  // Ship the best non-fatal page; otherwise reject so the client keeps Auto.
  if (best && !best.grade.fatal) return { ok: true, html: finalize(best.html) };
  if (best) return { ok: false, reason: "invalid", detail: `low quality: ${best.grade.reasons.join("; ")}` };
  return lastErr;
}
