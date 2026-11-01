#!/usr/bin/env node
/**
 * Push a pre-generated bespoke living page onto an existing published story,
 * in place (same URL). Reads the HTML from a sibling file. DRY RUN by default.
 *
 *   node --env-file=.env.local scripts/set-bespoke.mjs         # show target
 *   node --env-file=.env.local scripts/set-bespoke.mjs --yes   # write it live
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const HANDLE = "headinclouds";
const SLUG = "i-made-it";
const html = readFileSync(new URL("./bespoke-i-made-it.html", import.meta.url), "utf8");

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });

const { data: prof, error: pErr } = await c.from("profiles").select("id,handle").eq("handle", HANDLE).maybeSingle();
if (pErr || !prof) { console.error("No profile @" + HANDLE + ":", pErr?.message ?? "not found"); process.exit(1); }

const { data: story, error: sErr } = await c.from("stories")
  .select("id,slug,status,fragment,art_direction").eq("author_id", prof.id).eq("slug", SLUG).maybeSingle();
if (sErr || !story) { console.error("No story '" + SLUG + "' for @" + HANDLE + ":", sErr?.message ?? "not found"); process.exit(1); }

console.log(`Target : @${HANDLE}/${story.slug}  [${story.status}]  "${story.fragment}"`);
console.log(`Bespoke: ${html.length} chars`);
console.log(`Existing bespokeHtml: ${story.art_direction && story.art_direction.bespokeHtml ? "yes (will be replaced)" : "none"}`);

if (!process.argv.includes("--yes")) { console.log("\nDry run. Re-run with --yes to push it live."); process.exit(0); }

const ad = { ...(story.art_direction || {}), bespokeHtml: html };
const { error: uErr } = await c.from("stories").update({ art_direction: ad }).eq("id", story.id);
if (uErr) { console.error("Update failed:", uErr.message); process.exit(1); }
console.log(`\nDone. Pushed bespoke to https://www.livingpage.one/@${HANDLE}/${SLUG} — it's live.`);
