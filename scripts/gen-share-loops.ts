/**
 * PRE-GENERATE SHARE LOOPS.
 *
 *   node --env-file=.env.local --import tsx scripts/gen-share-loops.ts --fixture
 *   node --env-file=.env.local --import tsx scripts/gen-share-loops.ts @handle slug [--canvas story|og]
 *   node --env-file=.env.local --import tsx scripts/gen-share-loops.ts --all
 *
 * Renders the story's share frame at a sequence of loop phases (the same
 * <ShareFrame> that draws the still, moving) and encodes an MP4 + animated
 * WebP with ffmpeg into public/share-loops/. Pre-generated on demand — no
 * per-request cost, and the loop is byte-identical in look to the still.
 *
 * Requires ffmpeg on PATH. Published stories are world-readable, so the
 * DB modes use the anon key (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY from env).
 */
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { renderLoopFrames } from "../lib/share-motion";
import type { CanvasKey } from "../lib/share-canvas";

const OUT_DIR = join(process.cwd(), "public", "share-loops");

const FIXTURE = {
  id: "fixture-640-train",
  fragment: "The 6:40 train",
  place: "PLATFORM 2",
  date: "JANUARY",
  source: null,
  backdrop: "monsoon",
  art_direction: { atmosphere: { mood: "cinematic" } },
  author: { handle: "arjun" },
  blocks: [
    { kind: "beat", text: "I took the 6:40 out for the last time.", voice: "listen" },
    { kind: "beat", text: "The platform smelled of rain and someone else's cigarette." },
    { kind: "beat", text: "Everyone looked like they were leaving too." },
    { kind: "beat", text: "I didn't expect to miss this place.", voice: "shout", body: "oversized" },
    { kind: "beat", text: "Not the place — the version of me that only existed here." },
    { kind: "beat", text: "you only love a city on the way out of it.", voice: "whisper" },
  ],
} as unknown as Parameters<typeof renderLoopFrames>[0];

function encode(frames: { png: Buffer[]; w: number; h: number; fps: number }, keyBase: string) {
  mkdirSync(OUT_DIR, { recursive: true });
  const dir = mkdtempSync(join(tmpdir(), "lp-loop-"));
  frames.png.forEach((b, i) => writeFileSync(join(dir, `f${String(i).padStart(3, "0")}.png`), b));
  const inPat = join(dir, "f%03d.png");
  const mp4 = join(OUT_DIR, `${keyBase}.mp4`);
  const webp = join(OUT_DIR, `${keyBase}.webp`);
  const run = (args: string[]) => {
    const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
    if (r.status !== 0) throw new Error(`ffmpeg failed (${r.status}) — is ffmpeg installed?`);
  };
  // MP4 (IG Story / X video) — even dims, faststart, seamless loop via -stream_loop on playback
  run(["-y", "-framerate", String(frames.fps), "-i", inPat,
       "-c:v", "libx264", "-pix_fmt", "yuv420p",
       "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-movflags", "+faststart", mp4]);
  // Animated WebP (previews / web) — loops forever
  run(["-y", "-framerate", String(frames.fps), "-i", inPat,
       "-c:v", "libwebp", "-loop", "0", "-lossless", "0", "-q:v", "72", webp]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`  ✓ ${keyBase}.mp4 + .webp  (${frames.w}×${frames.h}, ${frames.png.length}f @ ${frames.fps}fps)`);
}

async function fetchStory(handle: string, slug: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const h = handle.replace(/^@/, "").toLowerCase();
  const { data: author } = await sb.from("profiles").select("*").eq("handle", h).maybeSingle();
  if (!author) throw new Error(`no profile @${h}`);
  const { data } = await sb.from("stories").select("*, author:profiles(*)")
    .eq("author_id", author.id).eq("slug", slug).eq("status", "published").maybeSingle();
  if (!data) throw new Error(`no published story @${h}/${slug}`);
  return data as unknown as Parameters<typeof renderLoopFrames>[0];
}

async function fetchAll() {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await sb.from("stories").select("*, author:profiles(*)")
    .eq("status", "published").order("published_at", { ascending: false }).limit(200);
  return (data ?? []) as unknown as Parameters<typeof renderLoopFrames>[0][];
}

const keyFor = (s: { author: { handle: string }; slug?: string; id: string }) =>
  `${s.author.handle}__${(s as { slug?: string }).slug ?? s.id}`;

async function main() {
  const args = process.argv.slice(2);
  const canvas: CanvasKey = (args.includes("--canvas") ? args[args.indexOf("--canvas") + 1] : "story") as CanvasKey;
  const positional = args.filter((a) => !a.startsWith("--") && a !== canvas);

  let stories: Parameters<typeof renderLoopFrames>[0][];
  if (args.includes("--fixture")) stories = [FIXTURE];
  else if (args.includes("--all")) stories = await fetchAll();
  else if (positional.length >= 2) stories = [await fetchStory(positional[0], positional[1])];
  else { console.error("usage: --fixture | <@handle> <slug> | --all  [--canvas story|og]"); process.exit(1); }

  console.log(`Rendering ${stories.length} loop(s) at canvas=${canvas} → ${OUT_DIR}`);
  for (const story of stories) {
    const key = keyFor(story as { author: { handle: string }; slug?: string; id: string });
    console.log(`• ${key}`);
    const frames = await renderLoopFrames(story, canvas, { frames: 36, fps: 12 });
    encode(frames, `${key}-${canvas}`);
  }
  console.log("done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
