// ONE-OFF, SURGICAL FIX — restore the @reshikaa30/bali story's dark background.
//
// What happened: this story's `backdrop` column is "monsoon" (a dark-scheme
// world, lib/backdrops.ts), but `art_direction.palette` is currently "postcard"
// (a light-scheme palette, lib/art-direction/palettes.ts) — the two disagree,
// and the stored palette is what the reader actually renders. The mismatch
// lines up with `app/dev/backfill-art` having run today: that route calls
// `generateArtDirection(raw, profile, { environmentOverride: row.backdrop })`
// with no lookOverride, so the engine auto-picked a *look* for this story —
// and lib/art-direction/looks.ts has a rule (by design, Story Visual System
// 3.0): "a dark world can never render a reflective/bright piece" (scoreLooks,
// `if (ctx.lightOnly && PALETTES[look.palette]?.scheme === "dark") s = -1`).
// This story's quiet, reflective register tripped that rule, so every dark
// look (including "noir" and "diving", which both list "monsoon" in their own
// affinity) was scored out, leaving a light look ("postcard") to win — even
// though the backdrop itself is a dark storm.
//
// This script reruns the SAME engine (no engine code changed) with an explicit
// `lookOverride` that skips that scoring step entirely (generate.ts:
// `getLook(opts.lookOverride) ?? autoLook(...)`), forcing a dark, monsoon-
// appropriate look back onto this one row. Nothing else on the row is
// touched — additive, single-row, per D4.
//
// UPDATE: the real fix turned out to be simpler than a lookOverride. This
// story was published 2026-09-07 — 10 days BEFORE the Look/Palette engine
// (lib/art-direction/looks.ts + palettes.ts) existed at all (introduced
// 2026-09-17). Its original dark/blue look never came from a "palette" —
// it came from the OLDER path: `story.backdrop = "monsoon"` rendered
// directly via lib/backdrops.ts + components/living/Backdrop.tsx, with no
// art_direction object involved. Today's `/dev/backfill-art` run gave it an
// art_direction for the first time, and the current engine's "a dark world
// can never render a reflective/bright piece" rule picked a light look for
// it — something that was never a concern before this row had an
// art_direction at all.
//
// The current renderer (components/living/StoryView.tsx) still has the
// fallback for exactly this case: `isCompleteArtDirection(artDirection)`
// is false for `{}`, so it falls through to `worldVars(getBackdrop(backdrop),
// accent)` and renders the backdrop's own world colors directly — the same
// path this story used from day one. So the real restoration is to clear
// `art_direction` back to `{}`, not to pick a different look.
//
// Usage (run on your own machine, where Supabase is reachable):
//   node --env-file=.env.local --import tsx scripts/restore-bali-dark.ts --clear
//     → dry run: shows that art_direction would be reset to {}, writes nothing
//   node --env-file=.env.local --import tsx scripts/restore-bali-dark.ts --clear --write
//     → commits it: the story falls back to its original backdrop-driven look
//       (one side effect: the share-preview loop video/webp URLs stored in the
//       old art_direction.share are dropped along with everything else — the
//       share card will just regenerate plain, nothing breaks)
//
// (The --look=<key> engine-regeneration path below is kept in case a
// Look/Palette-based look is ever wanted instead, but --clear is the correct
// fix for "restore what this story originally looked like.")

import { createClient } from "@supabase/supabase-js";
import { extractStoryProfile } from "../lib/semantic-profile";
import { generateArtDirection } from "../lib/art-direction/generate";
import type { LookKey } from "../lib/art-direction/looks";

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const CLEAR = args.includes("--clear");
const lookArg = args.find((a) => a.startsWith("--look="));
const lookOverride = (lookArg ? lookArg.split("=")[1] : "noir") as LookKey;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data: author, error: authorErr } = await supabase
    .from("profiles").select("*").eq("handle", "reshikaa30").maybeSingle();
  if (authorErr || !author) { console.error("author lookup failed:", authorErr); process.exit(1); }

  const { data: row, error: storyErr } = await supabase
    .from("stories").select("*").eq("author_id", author.id).eq("slug", "bali").maybeSingle();
  if (storyErr || !row) { console.error("story lookup failed:", storyErr); process.exit(1); }

  console.log("--- before ---");
  console.log("backdrop column:", row.backdrop);
  console.log("art_direction.environment.key:", row.art_direction?.environment?.key);
  console.log("art_direction.look:", row.art_direction?.look);
  console.log("art_direction.palette:", row.art_direction?.palette?.key, `(${row.art_direction?.palette?.scheme})`);

  let ad: Record<string, unknown>;

  if (CLEAR) {
    ad = {};
    console.log("\n--- proposed after (--clear) ---");
    console.log("art_direction: {}  (falls back to backdrop-driven rendering: story.backdrop =", row.backdrop, "+ story.accent =", row.accent, ")");
  } else {
    const raw = (row.source ?? "").trim() || row.fragment || "";
    if (!raw) { console.error("no raw text on this row (source/fragment both empty) — can't regenerate"); process.exit(1); }

    const profile = extractStoryProfile(raw);
    const generated = generateArtDirection(raw, profile, {
      environmentOverride: row.backdrop ?? undefined,
      lookOverride,
    });
    ad = generated;

    console.log("\n--- proposed after (lookOverride:", lookOverride, ") ---");
    console.log("environment:", generated.environment.key);
    console.log("mood:", generated.atmosphere.mood);
    console.log("look:", generated.look);
    console.log("palette:", generated.palette?.key, `(${generated.palette?.scheme})`);
    console.log("material:", generated.material.key);
    console.log("composition:", generated.composition.key);
  }

  if (!WRITE) {
    console.log("\n(dry run — nothing written. Re-run with --write to commit this change.)");
    return;
  }

  const { error: upErr } = await supabase
    .from("stories")
    .update({ art_direction: ad })
    .eq("id", row.id);

  if (upErr) { console.error("write failed:", upErr); process.exit(1); }
  console.log("\nwritten —", CLEAR ? "@reshikaa30/bali reset to its original backdrop-driven look." : `@reshikaa30/bali now has a dark ${lookOverride} look.`, "Refresh the page to see it.");
}

main();
