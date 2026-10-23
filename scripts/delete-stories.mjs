#!/usr/bin/env node
/**
 * Delete stories from the DB by title (fragment or place). DRY RUN by default.
 *
 *   node --env-file=.env.local scripts/delete-stories.mjs            # list matches
 *   node --env-file=.env.local scripts/delete-stories.mjs --yes      # actually delete
 */
import { createClient } from "@supabase/supabase-js";

const TITLES = [
  "i'm always the last one to leave", "somewhere", "parked car", "highway",
  "thought i wanted to leave", "640 train", "pretrip anxiety", "roadside dhaba",
  "andaman", "sabbatical", "hostek dorm", "hostel dorm", "3 cities later",
  "three cities later", "mace & croisant", "mace & croissant", "new apartment", "1am again",
];
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const wanted = TITLES.map(norm);

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await c.from("stories").select("id,slug,place,fragment,status");
if (error) { console.error(error.message); process.exit(1); }

// match on place or fragment, whole-phrase or contained (e.g. "A PARKED CAR" ~ "parked car")
const hit = (s) => [s.place, s.fragment].map(norm).some((t) => t && wanted.some((w) => t === w || t.includes(w)));
const matches = data.filter(hit);
console.log(`${data.length} stories in DB, ${matches.length} match:\n`);
for (const s of matches) console.log(`  ${s.status.padEnd(9)} ${s.id}  [${s.place}] ${s.fragment.slice(0, 60)}`);

if (!process.argv.includes("--yes")) { console.log("\nDry run. Re-run with --yes to delete."); process.exit(0); }
const { error: dErr } = await c.from("stories").delete().in("id", matches.map((s) => s.id));
if (dErr) { console.error(dErr.message); process.exit(1); }
console.log(`\nDeleted ${matches.length}.`);
