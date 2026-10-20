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

import { callClaude } from "@/lib/brain/router";
import type { BrainCast } from "@/lib/brain/castWithAI";

const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'">`;

const EXEMPLAR = `<!-- technique exemplar (do NOT copy its content, copy its approach) -->
<style>
 :root{--p:0}
 body{margin:0;background:linear-gradient(180deg,#0a0a1a,#241f40);color:#eae6f4;font-family:Georgia,serif;line-height:1.8}
 .sky{position:fixed;inset:0;z-index:0;opacity:calc(.4+.6*var(--p));background:radial-gradient(60% 40% at 70% 18%,rgba(240,236,214,.5),transparent 60%)}
 .moon{position:fixed;left:72%;top:calc(22% - 8%*var(--p));width:90px;height:90px;border-radius:50%;background:radial-gradient(circle at 38% 36%,#fdfbef,#ccc6b4 72%,transparent)}
 .essay{position:relative;z-index:2;max-width:34rem;margin:0 auto;padding:18vh 1.6rem 40vh}
 .beat{font-size:1.4rem;margin:0 0 11vh}
 .w{display:inline-block;opacity:0;filter:blur(8px);transform:translateY(12px);transition:.6s}
 .beat.seen .w{opacity:1;filter:none;transform:none}
 @media(prefers-reduced-motion:reduce){.w{opacity:1;filter:none;transform:none}}
</style>
<div class="sky"></div><div class="moon"></div>
<article class="essay"><p class="beat">Each sentence is its own beat.</p></article>
<script>
 const r=document.documentElement;addEventListener('scroll',()=>{const h=document.body.scrollHeight-innerHeight;r.style.setProperty('--p',(h>0?scrollY/h:0).toFixed(3))},{passive:true});
 document.querySelectorAll('.beat').forEach(b=>{b.innerHTML=b.textContent.split(/(\\s+)/).map(t=>/^\\s+$/.test(t)||!t?t:'<span class="w">'+t+'</span>').join('')});
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.querySelectorAll('.w').forEach((w,i)=>w.style.transitionDelay=i*26+'ms');e.target.classList.add('seen');io.unobserve(e.target)}}),{threshold:.3,rootMargin:'0px 0px -14% 0px'});
 document.querySelectorAll('.beat').forEach(b=>io.observe(b));
</script>`;

const SYSTEM = `You are a generative visual artist for Living Page. Given a personal story, you author ONE self-contained HTML document that renders it as a LIVING PAGE: a unique, evolving world with a bespoke background, hand-drawn SVG artwork motivated by the story, scroll-driven animation, and per-beat text that unveils as the reader arrives at it.

DESIGN LANGUAGE (hold all of these):
- ONE continuous world that EVOLVES as you scroll (brightens / builds / reacts) — never a static header image.
- WORDS UNVEIL: each sentence assembles on arrival, never flat blog text.
- ARTWORK is co-located with the words or part of the world — never a banner, never an icon-per-paragraph list. Draw it yourself in SVG, motivated by the story's imagery.
- RESTRAINT: mostly quiet, 2-3 earned surprises, one visual grammar per page. Maximalism is dynamic, not cluttered.
- MOTIVATED palette: colours drawn from the story's own imagery. No black-by-default, no neon-by-default.
- READABLE always. Premium craft, never clip-art, never childish.

GO FAR — these are what make it feel alive, use them boldly (but on only the moments that earn it):
- EXPRESSIVE TYPOGRAPHY: treat type as art. Mix typefaces to match tone — a display serif, a monospace, an italic — and change size/weight/style across beats and for key words. Important words can be large, coloured, letter-spaced, or set apart. Do not keep one uniform font down the page.
- WORD BEHAVIOUR tied to MEANING: beyond the unveil, animate specific words to what they mean — "storm" can tremble, "fell"/"dropped" can fall from above, "drifted"/"floated" can rise and sway, a shouted word can slam in huge, "shattered" can scatter, a whispered line can fade. A few of these per page, each earned by the word.
- DRAW THE STORY'S OBJECTS: find the concrete things the writer actually names (an anchor, headphones, a tram, rain, a candle, a phone) and draw each as a small bespoke SVG, co-located with its sentence or woven into the evolving world. These are the story's own objects, not generic icons.
- SURPRISE: no two stories should feel alike. Invent a visual idea specific to THIS piece. Be genuinely creative — while keeping one coherent grammar and staying readable.

TECHNICAL CONTRACT (hard rules):
- Output ONE complete HTML document and NOTHING else (no markdown fence, no commentary). Start at <!doctype html>.
- Fully SELF-CONTAINED: inline all CSS, SVG and JS. NO external resources — no <link>, no web fonts, no CDN, no url(http...), no fetch/import/XHR/WebSocket. Images only as inline SVG or data: URIs. Use system fonts (Georgia, system-ui, "Courier New", etc.).
- Render the writer's EXACT words, in order, split into beats (one per paragraph I give you). Do not rewrite, summarise, or invent text.
- Scroll-driven: the world changes as you scroll (track scroll progress 0..1).
- Words unveil per beat (IntersectionObserver).
- Responsive: must work from ~380px to desktop. Respect prefers-reduced-motion (no motion, full opacity).
- Write COMPACT code: minimal whitespace, no comments, concise CSS/JS. This keeps generation fast — spend your budget on richness, not formatting.

Here is a tiny exemplar of the TECHNIQUE (scroll var, layered fixed scene, word-unveil, reduced-motion). Match this quality bar and go far beyond it in artwork; do not reuse its content:
${EXEMPLAR}`;

export type GenResult =
  | { ok: true; html: string }
  | { ok: false; reason: "no-key" | "api-error" | "invalid"; detail?: string };

function processHtml(raw: string, beats: string[]): GenResult {
  let h = raw.trim();
  // Nothing came back (or only a scrap). Report it honestly rather than wrapping
  // "" into a bare <html> skeleton that then trips the "text missing" check — the
  // router already retries empty streams, so reaching here means both tries were
  // empty. Let the caller fall back to the live engine.
  if (h.length < 40 || !/<[a-z]/i.test(h)) {
    return { ok: false, reason: "api-error", detail: "empty generation" };
  }
  const lower = h.toLowerCase();
  const start = lower.indexOf("<!doctype") >= 0 ? lower.indexOf("<!doctype") : lower.indexOf("<html");
  const end = lower.lastIndexOf("</html>");
  if (start >= 0 && end > start) h = h.slice(start, end + 7);
  else if (!/<html/i.test(h)) h = `<!doctype html><html><head></head><body>${h}</body></html>`;
  if (h.length > 400_000) return { ok: false, reason: "invalid", detail: "too large" };
  // the writer's words must actually appear — but the page wraps words (and
  // sometimes letters) in spans, or injects the text via a JS array. So drop
  // only <style> (CSS noise) and the tags, KEEP script text, then require that
  // at least one of the story's own content words survives somewhere.
  const plain = h
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .toLowerCase();
  const words = [...new Set((beats.join(" ").toLowerCase().match(/[a-z']{5,}/g) ?? []))].slice(0, 40);
  if (words.length >= 4 && !words.some((w) => plain.includes(w))) {
    return { ok: false, reason: "invalid", detail: `text missing (page ${h.length} chars, text ${plain.replace(/\s+/g, " ").trim().length} chars)` };
  }
  // inject CSP (safety net on top of the iframe sandbox)
  if (/<head[^>]*>/i.test(h)) h = h.replace(/<head[^>]*>/i, (m) => m + CSP);
  else h = h.replace(/<html[^>]*>/i, (m) => `${m}<head>${CSP}</head>`);
  return { ok: true, html: h };
}

export async function generatePage(text: string, title: string | undefined, cast?: BrainCast): Promise<GenResult> {
  const beats = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const guide = cast
    ? `\n\nART DIRECTION (from the read — honour it):\nstyle: ${cast.style}\nread: ${JSON.stringify(cast.read)}\npalette: ${JSON.stringify(cast.palette ?? {})}\nnote: ${cast.artNote ?? ""}`
    : "";
  const user = `${title ? `Title: ${title}\n` : ""}Beats (render each verbatim, in order):\n${beats.map((b, i) => `[${i + 1}] ${b}`).join("\n\n")}${guide}`;
  // Default to Sonnet: several times faster than Opus and strong at
  // self-contained creative pages. Set BRAIN_GENERATE_TIER=opus for max quality
  // (and a longer wait). Output capped so it can't run away.
  const tier = (process.env.BRAIN_GENERATE_TIER === "opus" ? "opus" : "sonnet");
  const res = await callClaude(tier, SYSTEM, user, 12000);
  if (!res.ok) return res;
  return processHtml(res.text, beats);
}
