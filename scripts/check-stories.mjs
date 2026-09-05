#!/usr/bin/env node
/**
 * The quality bar, mechanical half (§22).
 *
 * Reads content/stories/*.mdx and reports on pacing: how much of the piece
 * is just sentences, whether there are silences, how long it runs without
 * one, and whether the margin is doing anything.
 *
 *   node scripts/check-stories.mjs            report everything
 *   node scripts/check-stories.mjs --quiet    only speak up when something is off
 *   node scripts/check-stories.mjs --strict   exit 1 on any warning (CI, pre-commit)
 *   node scripts/check-stories.mjs --hook     read a Claude Code hook payload on
 *                                             stdin and skip unless a story changed
 *
 * The reading itself lives in lib/story-blocks.mjs, which the studio and the
 * emitter also use — this file used to keep its own regexes and they were
 * always going to drift away from the ones in the app.
 *
 * It counts blocks, not sentences, so treat the numbers as a reading of the
 * shape rather than a measurement. Arguing with it is the point.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { analyse } from "../lib/story-blocks.mjs";
import { missingMeta, parseStory } from "../lib/story-file.mjs";

const STORIES = "content/stories";
const args = new Set(process.argv.slice(2));
const quiet = args.has("--quiet");
const strict = args.has("--strict");

async function stdinPayload() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const payload = args.has("--hook") ? await stdinPayload() : null;
if (args.has("--hook")) {
  const f = payload?.tool_input?.file_path ?? payload?.tool_input?.path ?? "";
  if (!/content[\\/]stories[\\/].+\.mdx$/.test(f)) process.exit(0);
}

let files = [];
try {
  files = (await readdir(STORIES)).filter((f) => f.endsWith(".mdx")).sort();
} catch {
  console.error(`no ${STORIES} directory`);
  process.exit(0);
}

let warned = false;
for (const file of files) {
  const src = await readFile(path.join(STORIES, file), "utf8");
  const { meta, blocks } = parseStory(src);

  // frontmatter is how a story gets onto the site at all now: a piece
  // missing any of it is invisible rather than broken, which is worse
  const missing = missingMeta(meta);
  if (missing.length) {
    warned = true;
    console.log(`\n${file}`);
    console.log(`  ! frontmatter is missing: ${missing.join(", ")} — this story will not appear on the site`);
    continue;
  }

  const r = analyse(blocks);
  const kept = blocks.filter((b) => b.kind === "raw").length;
  if (quiet && !r.notes.length) continue;

  console.log(`\n${file}`);
  console.log(
    `  ${r.total} beats · ${Math.round(r.speakShare * 100)}% plain · ` +
    `${r.holds} pauses · longest run ${r.longestRunWithoutHold} · margin on ${r.interactions}`,
  );
  console.log(`  voices: ${r.voicesUsed.join(", ")}${kept ? ` · ${kept} blocks the studio would keep as written` : ""}`);

  const real = r.notes.filter((n) => !n.startsWith("Pacing looks right"));
  if (real.length) { warned = true; for (const n of real) console.log(`  ! ${n}`); }
  else console.log("  · pacing looks right. Read it out loud before you believe me.");
}
if (!quiet) console.log("");

process.exit(strict && warned ? 1 : 0);
