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
 * It counts blocks, not sentences, so treat the numbers as a reading of the
 * shape rather than a measurement. Arguing with it is the point.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const STORIES = "content/stories";
const VOICES = ["Speak", "Whisper", "Shout", "Thought", "Drift", "Echo", "Listen"];
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

function analyse(src) {
  // drop the meta export; everything after it is the piece
  const body = src.replace(/export\s+const\s+meta\s*=\s*\{[\s\S]*?\n\};?/, "");
  const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  let beats = 0, plain = 0, pauses = 0, run = 0, longestRun = 0;
  const voicesUsed = new Set();

  for (const block of blocks) {
    if (/^<\/?Scene\b/.test(block) || /^#{1,6}\s/.test(block)) continue;

    if (/^<Hold\b/.test(block) || block === "---") {
      longestRun = Math.max(longestRun, run);
      run = 0;
      pauses++;
      continue;
    }

    if (/^<Margin\b/.test(block)) continue; // a doodle beat, not a line

    const tags = [...block.matchAll(new RegExp(`<(${VOICES.join("|")})\\b`, "g"))].map((m) => m[1]);
    const n = Math.max(1, tags.length);
    beats += n;
    run += n;
    if (tags.length === 0) {
      plain += 1;
      voicesUsed.add("speak");
    } else {
      for (const t of tags) {
        voicesUsed.add(t.toLowerCase());
        if (t === "Speak") plain += 1;
      }
    }
  }
  longestRun = Math.max(longestRun, run);

  const margin =
    (body.match(/doodle="/g) ?? []).length +
    (body.match(/<Press\b/g) ?? []).length +
    (body.match(/<Drag\b/g) ?? []).length;

  const total = beats || 1;
  return {
    beats, plain, pauses, longestRun, margin,
    plainShare: plain / total,
    voices: [...voicesUsed],
  };
}

function notes(r) {
  const out = [];
  if (r.plainShare < 0.6)
    out.push(`${Math.round((1 - r.plainShare) * 100)}% of the piece is doing something. Let some lines just be sentences.`);
  if (r.pauses === 0)
    out.push("No pauses. Silence is an element — put a <Hold /> where the reader should stop.");
  if (r.longestRun > 9)
    out.push(`${r.longestRun} beats run without a pause. That is a paragraph wearing a costume.`);
  if (r.margin === 0)
    out.push("The margin is empty. The doodle is a second narrator — give it one line to answer.");
  if (r.margin / (r.beats || 1) > 0.35)
    out.push("The margin is crowded. A doodle on every other line stops being a surprise.");
  if (!r.voices.includes("shout") && !r.voices.includes("listen"))
    out.push("Nothing lands. No shout, no listen — is there a moment the piece turns?");
  return out;
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
  const r = analyse(src);
  const ns = notes(r);
  if (ns.length) warned = true;
  if (quiet && !ns.length) continue;

  console.log(`\n${file}`);
  console.log(
    `  ${r.beats} beats · ${Math.round(r.plainShare * 100)}% plain · ` +
    `${r.pauses} pauses · longest run ${r.longestRun} · margin on ${r.margin}`,
  );
  console.log(`  voices: ${r.voices.join(", ")}`);
  if (ns.length) for (const n of ns) console.log(`  ! ${n}`);
  else console.log("  · pacing looks right. Read it out loud before you believe me.");
}
if (!quiet) console.log("");

process.exit(strict && warned ? 1 : 0);
