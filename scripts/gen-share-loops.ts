/**
 * PRE-GENERATE SHARE LOOPS — a standing capability for every story.
 *
 *   node --env-file=.env.local --import tsx scripts/gen-share-loops.ts --fixture
 *   ... --id <storyId>          # one story (the publish webhook path)
 *   ... @handle slug            # one story by address
 *   ... --missing               # every published story without a loop (sweep)
 *   ... --all [--force]         # every published story (backfill / re-render)
 *
 * Renders the story's share frame at a sequence of loop phases (the same
 * <ShareFrame> that draws the still, moving), encodes an MP4 + animated
 * WebP with ffmpeg, uploads them to the public Supabase Storage bucket
 * `share-loops`, and stamps `art_direction.share = { loopMp4, loopWebp,
 * rev }` on the row so the share sheet can find them (and skip a story
 * whose loop is already current). `--fixture` writes local files only and
 * touches neither Storage nor the DB.
 *
 * Requires ffmpeg on PATH. Uploads/DB writes use SUPABASE_SERVICE_ROLE_KEY.
 */
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { renderLoopFrames } from "../lib/share-motion";
import type { CanvasKey } from "../lib/share-canvas";

const BUCKET = "share-loops";
const CANVAS: CanvasKey = "story";
const FRAMES = 30, FPS = 12;

const FIXTURE = {
  id: "fixture-640-train", fragment: "The 6:40 train", place: "PLATFORM 2", date: "JANUARY",
  source: null, backdrop: "monsoon", art_direction: { atmosphere: { mood: "cinematic" } },
  author: { handle: "arjun" },
  blocks: [
    { kind: "beat", text: "I took the 6:40 out for the last time.", voice: "listen" },
    { kind: "beat", text: "The platform smelled of rain and someone else's cigarette." },
    { kind: "beat", text: "Everyone looked like they were leaving too." },
    { kind: "beat", text: "I didn't expect to miss this place.", voice: "shout", body: "oversized" },
    { kind: "beat", text: "Not the place — the version of me that only existed here." },
    { kind: "beat", text: "you only love a city on the way out of it.", voice: "whisper" },
  ],
} as unknown as StoryRow;

type StoryRow = Parameters<typeof renderLoopFrames>[0] & {
  id: string; slug?: string; updated_at?: string; published_at?: string;
  art_direction?: Record<string, unknown> | null; author: { handle: string };
};

function encodeToFiles(frames: { png: Buffer[]; w: number; h: number; fps: number }) {
  const dir = mkdtempSync(join(tmpdir(), "lp-loop-"));
  frames.png.forEach((b, i) => writeFileSync(join(dir, `f${String(i).padStart(3, "0")}.png`), b));
  const inPat = join(dir, "f%03d.png");
  const mp4 = join(dir, "loop.mp4"), webp = join(dir, "loop.webp");
  const run = (args: string[]) => {
    const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
    if (r.status !== 0) throw new Error(`ffmpeg failed (${r.status}) — is ffmpeg installed?`);
  };
  run(["-y", "-framerate", String(frames.fps), "-i", inPat, "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-movflags", "+faststart", mp4]);
  run(["-y", "-framerate", String(frames.fps), "-i", inPat, "-c:v", "libwebp", "-loop", "0", "-lossless", "0", "-q:v", "76", webp]);
  return { dir, mp4: readFileSync(mp4), webp: readFileSync(webp) };
}

const revOf = (s: StoryRow) => s.updated_at ?? s.published_at ?? s.id;

async function supa() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function ensureBucket(sb: Awaited<ReturnType<typeof supa>>) {
  const { data } = await sb.storage.getBucket(BUCKET);
  if (!data) await sb.storage.createBucket(BUCKET, { public: true });
}

async function generate(sb: Awaited<ReturnType<typeof supa>> | null, story: StoryRow, force = false) {
  const rev = revOf(story);
  const existing = (story.art_direction as { share?: { rev?: string; loopMp4?: string } } | null)?.share;
  if (sb && !force && existing?.rev === rev && existing.loopMp4) {
    console.log(`  · ${story.id} up to date, skipping`); return;
  }
  const frames = await renderLoopFrames(story, CANVAS, { frames: FRAMES, fps: FPS });
  const { dir, mp4, webp } = encodeToFiles(frames);
  try {
    if (!sb) {
      const out = join(process.cwd(), "public", "share-loops"); mkdirSync(out, { recursive: true });
      const key = `${story.author.handle}__${story.slug ?? story.id}-${CANVAS}`;
      writeFileSync(join(out, `${key}.mp4`), mp4); writeFileSync(join(out, `${key}.webp`), webp);
      console.log(`  ✓ public/share-loops/${key}.{mp4,webp}`); return;
    }
    const base = `${story.id}-${CANVAS}`;
    await sb.storage.from(BUCKET).upload(`${base}.mp4`, mp4, { contentType: "video/mp4", upsert: true });
    await sb.storage.from(BUCKET).upload(`${base}.webp`, webp, { contentType: "image/webp", upsert: true });
    const loopMp4 = sb.storage.from(BUCKET).getPublicUrl(`${base}.mp4`).data.publicUrl;
    const loopWebp = sb.storage.from(BUCKET).getPublicUrl(`${base}.webp`).data.publicUrl;
    const ad = { ...(story.art_direction ?? {}), share: { loopMp4, loopWebp, rev } };
    const { error } = await sb.from("stories").update({ art_direction: ad }).eq("id", story.id);
    if (error) throw error;
    console.log(`  ✓ ${story.id} → ${loopMp4}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const has = (f: string) => args.includes(f);
  const force = has("--force");

  if (has("--fixture")) { console.log("fixture → public/share-loops"); await generate(null, FIXTURE, true); return; }

  const sb = await supa();
  await ensureBucket(sb);
  const SEL = "*, author:profiles(*)";
  let stories: StoryRow[] = [];

  if (has("--id")) {
    const id = args[args.indexOf("--id") + 1];
    const { data } = await sb.from("stories").select(SEL).eq("id", id).maybeSingle();
    if (data) stories = [data as StoryRow];
  } else if (has("--all") || has("--missing")) {
    const { data } = await sb.from("stories").select(SEL).eq("status", "published").order("published_at", { ascending: false }).limit(1000);
    stories = (data ?? []) as StoryRow[];
    if (has("--missing")) stories = stories.filter((s) => {
      const sh = (s.art_direction as { share?: { rev?: string; loopMp4?: string } } | null)?.share;
      return !sh?.loopMp4 || sh.rev !== revOf(s);
    });
  } else {
    const positional = args.filter((a) => !a.startsWith("--"));
    if (positional.length < 2) { console.error("usage: --fixture | --id <id> | <@handle> <slug> | --missing | --all [--force]"); process.exit(1); }
    const h = positional[0].replace(/^@/, "").toLowerCase();
    const { data: author } = await sb.from("profiles").select("id").eq("handle", h).maybeSingle();
    if (!author) throw new Error(`no profile @${h}`);
    const { data } = await sb.from("stories").select(SEL).eq("author_id", (author as { id: string }).id).eq("slug", positional[1]).eq("status", "published").maybeSingle();
    if (data) stories = [data as StoryRow];
  }

  console.log(`Generating ${stories.length} loop(s)…`);
  for (const s of stories) { try { await generate(sb, s, force); } catch (e) { console.error(`  ✗ ${s.id}:`, (e as Error).message); } }
  console.log("done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
