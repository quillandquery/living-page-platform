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

const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'">`;

// Watchdog injected into every generated page. If, a few seconds after load, the
// page HAS text but almost none is actually rendered visible (the model's unveil
// script didn't fire), force every element visible so the reader never faces a
// blank page. Guarded so it only acts on a genuinely broken page.
const FAILSAFE = `<script>/*__lpFailsafe*/(function(){function check(){try{var b=document.body;if(!b)return;var total=((b.innerText||'').replace(/\\s+/g,'')).length;if(total<120)return;var els=b.querySelectorAll('p,span,h1,h2,h3,h4,li,blockquote,em,strong,div,a');var shown=0;for(var i=0;i<els.length;i++){var e=els[i];var t=(e.textContent||'').trim();if(!t)continue;var cs=getComputedStyle(e);if(cs.visibility!=='hidden'&&cs.display!=='none'&&parseFloat(cs.opacity)>0.05)shown+=t.length;}if(shown<total*0.15){var s=document.createElement('style');s.textContent='*{opacity:1!important;filter:none!important;transform:none!important;visibility:visible!important}';document.head.appendChild(s);}}catch(e){}}setTimeout(check,3800);})();</script>`;

const EXEMPLAR = `<!-- technique exemplar: a FULL-BLEED world the words live INSIDE. Copy the approach (fixed layered scene that fills the screen and evolves with scroll; big varied type set into it; word-unveil; reveal-on-load), NOT the content. Your scene must be invented for the actual story. -->
<style>
 :root{--p:0}*{margin:0;box-sizing:border-box}
 body{background:#0b1026;color:#f3efe7;font-family:Georgia,serif;overflow-x:hidden}
 .world{position:fixed;inset:0;z-index:0;overflow:hidden}
 .sky{position:absolute;inset:0;background:linear-gradient(180deg,#0b1026 0%,#30406f 55%,#b56a4e 100%);filter:brightness(calc(.55+.75*var(--p)))}
 .sun{position:absolute;left:58%;width:min(42vw,340px);aspect-ratio:1;border-radius:50%;top:calc(88% - 74%*var(--p));background:radial-gradient(circle at 44% 42%,#ffe9c6,#ff9a5a 62%,transparent 70%);filter:blur(1px)}
 .ridge{position:absolute;left:0;right:0;bottom:0;height:46vh;background:linear-gradient(180deg,#152442,#0b1026);clip-path:polygon(0 38%,18% 20%,40% 44%,62% 16%,82% 40%,100% 24%,100% 100%,0 100%)}
 .sea{position:absolute;left:0;right:0;bottom:0;height:22vh;background:linear-gradient(180deg,#1d3f63,#0d2033)}
 .story{position:relative;z-index:2;max-width:52rem;margin:0 auto;padding:22vh 7vw 60vh}
 .beat{font-size:clamp(1.35rem,3.4vw,2.2rem);line-height:1.45;margin:0 0 16vh;max-width:28ch}
 .beat:nth-child(even){margin-left:auto;text-align:right}
 .beat.lead{font-size:clamp(2.6rem,8vw,5.2rem);font-weight:700;line-height:1.02;letter-spacing:-.02em;max-width:16ch}
 .w{display:inline-block;opacity:0;transform:translateY(16px);filter:blur(7px);transition:.7s cubic-bezier(.2,.7,.2,1)}
 .seen .w{opacity:1;transform:none;filter:none}
 @media(prefers-reduced-motion:reduce){.w{opacity:1;transform:none;filter:none}}
</style>
<div class="world"><div class="sky"></div><div class="sun"></div><div class="ridge"></div><div class="sea"></div></div>
<article class="story">
 <p class="beat lead">The world fills the screen; the words live inside it.</p>
 <p class="beat">Each beat its own block, placed with intent — not a centred column of equal lines.</p>
</article>
<script>
 const r=document.documentElement;const set=()=>{const h=document.body.scrollHeight-innerHeight;r.style.setProperty('--p',(h>0?Math.min(1,scrollY/h):0).toFixed(3))};addEventListener('scroll',set,{passive:true});set();
 document.querySelectorAll('.beat').forEach(b=>{b.innerHTML=b.textContent.split(/(\\s+)/).map(t=>/^\\s+$/.test(t)||!t?t:'<span class="w">'+t+'</span>').join('')});
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.querySelectorAll('.w').forEach((w,i)=>w.style.transitionDelay=i*22+'ms');e.target.classList.add('seen');io.unobserve(e.target)}}),{threshold:.2,rootMargin:'0px 0px -12% 0px'});
 document.querySelectorAll('.beat').forEach(b=>io.observe(b));
 addEventListener('load',()=>document.querySelectorAll('.beat').forEach(b=>{if(b.getBoundingClientRect().top<innerHeight*.92)b.classList.add('seen')}));
</script>`;

const SYSTEM = `You are a generative visual artist for Living Page. Given a personal story, you author ONE self-contained HTML document that renders it as a LIVING PAGE: a unique, evolving world with a bespoke background, hand-drawn SVG artwork motivated by the story, scroll-driven animation, and per-beat text that unveils as the reader arrives at it.

THE BAR — aim for EXTRAORDINARY, not competent. Picture the most breathtaking piece of interactive storytelling you have ever seen: an award-winning scrollytelling feature, a film's title sequence, an immersive gallery installation. That is the ceiling you are reaching for — for ONE person's small, true story. The reader should scroll with their breath held and think "I did not know a story could look like this." Competent is a FAILURE. Build something that feels authored by a world-class interactive designer who fell in love with THIS story — then sweated every pixel, every easing curve, every shift of light.

THE ONE THING THAT MATTERS MOST: build a single FULL-BLEED WORLD that fills the whole viewport and that the words live INSIDE — a layered, atmospheric scene (sky, light, horizon, weather, interior, texture — whatever the story's setting is), fixed behind the text, that EVOLVES as the reader scrolls (dawn breaks, a room warms, rain clears, a city passes). The text is set into that world. This is the opposite of a blog post with decorations.

DEADLY ANTI-PATTERNS — if you do any of these the page has FAILED:
- A plain/flat/dark background with a centred column of equal-sized paragraphs. (This is a blog. Forbidden.)
- A little clip-art icon, emoji or small SVG object sitting next to each paragraph (an anchor by the "anchor" line, a bowl by the "meal" line). NEVER draw a small object beside a sentence. Artwork is the WORLD, at full scale — not a glyph per beat.
- A single header image with text below it.

DESIGN LANGUAGE (hold all of these):
- ONE continuous full-bleed world that EVOLVES as you scroll — never a static header, never a flat ground.
- WORDS UNVEIL: each sentence assembles on arrival, never flat blog text.
- COMPOSE the type: vary size, weight, alignment and placement beat to beat. One or two beats are huge display lines; others are smaller and set off-centre or to one side. Never one uniform centred column.
- RESTRAINT: mostly quiet, 2-3 earned surprises, one visual grammar per page. Maximalism is dynamic, not cluttered.
- MOTIVATED palette: colours drawn from the story's own setting and mood. No black-by-default, no neon-by-default.
- READABLE always. Premium, filmic, hand-crafted — never clip-art, never childish, never an icon set.

HOW THE EXTRAORDINARY IS MADE — reach for SEVERAL of these, but never all at once; restraint is what makes the loud moments land:
- DEPTH / PARALLAX: build the world in layers that move at different rates as you scroll, so the scene has real space — a near foreground, a midground, a deep horizon. Flat is forgettable.
- LIGHT IS A CHARACTER: a glow that tracks the emotion, a sun or lamp that rises or sets with the scroll, shadows that lengthen, a colour-temperature that warms or cools as the story turns.
- ATMOSPHERE IN MOTION: a fine living layer — drifting rain, slow snow, dust in a sunbeam, embers, fog, grain — tuned LOW so it breathes under the words, never busy.
- ONE BREATHTAKING MOMENT: engineer a single hero beat, on the story's turn, where everything crescendos — a full-screen transformation, a reveal, the whole world shifting. Earn it, land it, then return to quiet.
- AN EMOTIONAL COLOUR ARC: the palette travels with the feeling. The end must not look like the beginning — open heavy/cold and resolve warm, or the reverse.
- EXPRESSIVE TYPOGRAPHY: treat type as art. Mix typefaces to tone — a display serif, a monospace, an italic — and change size/weight/style across beats and for key words. One or two beats are poster-scale. Never a uniform font down the page.
- WORD BEHAVIOUR tied to MEANING: beyond the unveil, animate specific words to what they mean — "storm" trembles, "fell"/"dropped" falls from above, "drifted" rises and sways, a shouted word slams in huge, "shattered" scatters, a whisper fades. A few per page, each earned by the word.
- CRAFT YOU CAN FEEL: soft vignettes, a whisper of noise/grain texture, considered easing (never linear), generous negative space, type kerned and set like a poster. The difference between competent and extraordinary lives in these details.
- SURPRISE: no two stories feel alike. Invent one visual idea that could ONLY belong to THIS piece.

TECHNICAL CONTRACT (hard rules):
- Output ONE complete HTML document and NOTHING else (no markdown fence, no commentary). Start at <!doctype html>.
- Fully SELF-CONTAINED: inline all CSS, SVG and JS. NO external resources — no <link>, no web fonts, no CDN, no url(http...), no fetch/import/XHR/WebSocket. Images only as inline SVG or data: URIs. Use system fonts (Georgia, system-ui, "Courier New", etc.).
- Render the writer's EXACT words, in order, split into beats (one per paragraph I give you). Do not rewrite, summarise, or invent text. Include EVERY word of every beat — numbers too (e.g. "5", "1000"). Dropping or paraphrasing any word is a failure.
- The words must live DIRECTLY in the HTML as readable text inside the beat elements. If you animate per word, wrap words that are ALREADY in the markup in <span>s — do NOT build sentences in JavaScript or inject text from a JS array or data-attribute. The full story must be readable even if the JS never runs.
- Scroll-driven: the world changes as you scroll (track scroll progress 0..1).
- Words unveil per beat (IntersectionObserver).
- Responsive: must work from ~380px to desktop. Respect prefers-reduced-motion (no motion, full opacity).
- NEVER leave text permanently invisible. If words start hidden and animate in, reveal them on LOAD as well as on scroll, so a reader who never scrolls still sees everything — nothing may stay at opacity:0. The page must be fully readable within one second.
- ALWAYS draw real artwork: at least 2-3 distinct pieces of hand-made SVG (the story's own objects and/or a built, layered world), not a single shape and not just a flat background. Ensure strong contrast — never text the same tone as its background.
- Write COMPACT code: minimal whitespace, no comments, concise CSS/JS. This keeps generation fast — spend your budget on richness, not formatting.

Here is a tiny exemplar of the TECHNIQUE (scroll var, layered fixed scene, word-unveil, reduced-motion). Match this quality bar and go far beyond it in artwork; do not reuse its content:
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

CRUCIAL DIFFERENCE: you do NOT draw the artwork yourself. Wherever the page needs a drawn picture (the full-bleed background world, a key object, a scene), you place an EMPTY slot and describe what belongs there, and it will be drawn and inserted for you:
<div class="art" data-art="a vivid, specific description of exactly what to draw here AND its role — e.g. 'full-bleed background: a rain-soaked night city skyline under a heavy sky that breaks into warm dawn toward the end'" data-fit="cover"></div>
- Use 1 to 4 slots. ONE should be the full-bleed background world (position:fixed;inset:0, behind the text). Others can be placed in the layout (a mid-ground object, a scene).
- Size/position each slot with your own CSS. The drawing will fill its slot.
- Make the data-art descriptions concrete and motivated by THIS story's setting and mood.

FREE ATMOSPHERE GENERATORS: for texture and atmospheric LAYERS — rain, grain, a mesh-gradient sky, waves/sea/hills, fog/mist, stars — do NOT describe an art slot. Instead drop a generator slot, which is filled instantly and perfectly for free:
<div class="art" data-gen="rain" data-colors="#cfd8e6" data-angle="12"></div>
Available data-gen values: ${ART_PRIMITIVES.join(", ")}. Pass data-colors (comma-separated, from your palette) and any generator hints (data-angle, data-speed, data-opacity, data-layers, data-count). Use these for the sky/gradient background, rain, grain overlay, fog, stars, waves — layer several (e.g. a mesh sky UNDER a rain overlay UNDER a grain overlay). Reserve the described data-art slots ONLY for the story's bespoke focal SUBJECTS (a lone figure, a specific building, an object). Prefer generators for anything atmospheric.

You STILL build everything else, fully and well:
- The complete layout and all CSS; a composed, varied typographic treatment (some beats poster-scale, placed with intent — never a uniform centred column).
- The beats as REAL text directly in the markup (every word, numbers too), split into their own blocks. Never inject text from JS.
- The word-unveil: wrap each word in <span class="w"> (use exactly that class name) and reveal on scroll via IntersectionObserver AND on load; nothing stays invisible.
- A scroll-progress CSS var (0..1) that your slots and styles can react to, so the world evolves.
- prefers-reduced-motion handling. Fully self-contained (no external resources). Start at <!doctype html>, output ONLY the HTML.`;

/** Draw ONE self-contained SVG for a slot — the SVG-ORA move: focused, bounded,
 *  parameterised, clean-extracted. */
async function generateSvgPiece(tier: Tier, desc: string, fit: string, palette: string): Promise<string> {
  const sys = `You are a world-class SVG artist. Draw ONE high-quality, self-contained SVG for a slot in an immersive, cinematic story page.
RULES:
- Return ONLY raw SVG code (<svg ...>...</svg>). No markdown, no commentary.
- Give it a viewBox and preserveAspectRatio="xMidYMid slice" so it fills a "${fit}" slot edge to edge, minimal empty margin.
- Premium, atmospheric, hand-crafted — layered paths, rich gradients, real depth and light. NEVER clip-art, flat icons, or childish shapes.
- Palette/mood: ${palette}. Strong but motivated colour.
- Fully self-contained: inline everything, no <image>, no external refs, no web fonts. Subtle inline CSS/SMIL animation is welcome if it suits the subject.`;
  const res = await callClaude(tier, sys, `Draw this: ${desc}`, 5000, 60_000);
  if (!res.ok) return "";
  const t = res.text; const a = t.search(/<svg/i); const b = t.toLowerCase().lastIndexOf("</svg>");
  return a >= 0 && b > a ? t.slice(a, b + 6) : "";
}

const SLOT_RE = /<div\b([^>]*\bdata-art=(?:"([^"]*)"|'([^']*)')[^>]*)>\s*<\/div>/gi;
const GEN_RE = /<div\b([^>]*\bdata-gen=(?:"[^"]*"|'[^']*')[^>]*)>\s*<\/div>/gi;

/** The decomposed generation: shell → parse slots → draw each SVG in parallel → assemble. */
async function runDecomposed(beats: string[], title: string | undefined, palette: string, tier: Tier): Promise<GenResult> {
  const shellUser = `${title ? `Title: ${title}\n` : ""}Beats (render each verbatim, in order):\n${beats.map((b, i) => `[${i + 1}] ${b}`).join("\n\n")}`;
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
  // 2. real artwork — SVG shapes, or a built, layered CSS scene (gradients)
  const svgShapes = (lower.match(/<(path|circle|rect|line|polygon|polyline|ellipse)\b/g) ?? []).length;
  const gradients = (lower.match(/(linear|radial|conic)-gradient/g) ?? []).length;
  const noArt = svgShapes < 3 && gradients < 2;
  if (noArt) reasons.push("no real artwork (draw the story's objects in SVG, build a layered background)");
  // 2b. a FULL-BLEED world, fixed behind the text and filling the viewport — the
  // single thing that separates a living page from a dark blog with icons.
  const fullBleed = /position\s*:\s*fixed/.test(lower) && (/inset\s*:\s*0/.test(lower) || /100vh/.test(lower) || /100vw/.test(lower) || (/top\s*:\s*0/.test(lower) && /bottom\s*:\s*0/.test(lower)));
  if (!fullBleed) reasons.push("no full-bleed world — the scene must fill the viewport, fixed behind the words, not a flat background under a text column");
  // 3. it must MOVE — unveil / scroll-reactive world / animation
  const motion = /intersectionobserver/.test(lower) || /addeventlistener\(['"]scroll/.test(lower) || /@keyframes/.test(lower) || /transition\s*:/.test(lower) || /requestanimationframe/.test(lower);
  if (!motion) reasons.push("nothing moves (no unveil, no scroll reaction, no animation)");
  // 4. the beats are broken into their own blocks, not one wall (div counts —
  // many pages wrap each beat in a styled div rather than a <p>)
  const blocks = (lower.match(/<(p|h1|h2|h3|h4|section|article|blockquote|li|div)\b/g) ?? []).length;
  if (blocks < Math.max(3, Math.ceil(beats.length * 0.6))) reasons.push("the beats aren't broken into their own blocks");
  if (html.length < 1800) reasons.push("far too sparse");
  // fatal = the page isn't a living page at all: no words, or no art. Those get a
  // second shot. Thin-on-one-axis is a soft flaw; the page still ships.
  const fatal = textMissing || noArt || html.length < 1800;
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

export async function generatePage(
  text: string,
  title: string | undefined,
  cast?: BrainCast,
  opts?: { tier?: Tier; mode?: "single" | "decomposed" },
): Promise<GenResult> {
  const beats = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  // Decomposed path: shell designs the page + art slots, focused SVG calls fill them.
  if (opts?.mode === "decomposed") {
    const dTier: Tier = opts.tier && (["haiku", "sonnet", "opus"] as const).includes(opts.tier) ? opts.tier : "sonnet";
    const palette = cast?.palette ? JSON.stringify(cast.palette) : "drawn from the story's own setting and mood; no black-by-default, no neon-by-default";
    return runDecomposed(beats, title, palette, dTier);
  }
  const guide = cast
    ? `\n\nART DIRECTION (from the read — honour it):\nstyle: ${cast.style}\nread: ${JSON.stringify(cast.read)}\npalette: ${JSON.stringify(cast.palette ?? {})}\nnote: ${cast.artNote ?? ""}`
    : "";
  const baseUser = `${title ? `Title: ${title}\n` : ""}Beats (render each verbatim, in order):\n${beats.map((b, i) => `[${i + 1}] ${b}`).join("\n\n")}${guide}`;

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
      : `\n\nYour previous attempt was rejected for: ${best.grade.reasons.join("; ")}. Fix every one of these. Draw real SVG artwork of the story's own objects, give the page a built, evolving background, animate the words in, and break each beat into its own block. Return the full corrected HTML document only.`;
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
