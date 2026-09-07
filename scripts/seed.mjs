#!/usr/bin/env node
/**
 * SEED — carry the file-based stories into the database.
 *
 * The single-author site kept its writing in content/stories/*.mdx. This
 * reads those files, creates a demo writer to hang them on, and inserts each
 * one as a published story so a freshly provisioned platform isn't empty.
 *
 * Needs, in the environment (a .env.local is read automatically by `node
 * --env-file`):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY      (server-only — bypasses RLS, so this is a
 *                                   script you run, never anything shipped)
 *
 *   node --env-file=.env.local scripts/seed.mjs [handle] [email] [password]
 *
 * Defaults: handle "reshika", a demo email, a random password (printed once).
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseStory, missingMeta } from "../lib/story-file.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (try: node --env-file=.env.local scripts/seed.mjs)");
  process.exit(1);
}

const handle = (process.argv[2] || "reshika").toLowerCase();
const email = process.argv[3] || `${handle}@living.page`;
const password = process.argv[4] || `lp-${Math.random().toString(36).slice(2, 12)}`;

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function ensureUser() {
  // find an existing user with this email, else create one
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = list?.users?.find((u) => u.email === email);
  if (found) return found.id;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  console.log(`\n  created writer ${email}\n  password: ${password}  (save this — shown once)\n`);
  return data.user.id;
}

async function main() {
  const userId = await ensureUser();

  await admin.from("profiles").upsert({
    id: userId,
    handle,
    display_name: "Reshika",
    bio: "Solo travel, told the way it felt.",
  });

  const dir = path.join(process.cwd(), "content", "stories");
  let files = [];
  try { files = (await readdir(dir)).filter((f) => f.endsWith(".mdx")); } catch { /* none */ }

  for (const file of files) {
    const slug = file.slice(0, -4);
    const source = await readFile(path.join(dir, file), "utf8");
    const { meta, blocks } = parseStory(source);
    const missing = missingMeta(meta);
    if (missing.length) { console.warn(`  skip ${file} — missing ${missing.join(", ")}`); continue; }

    const { error } = await admin.from("stories").upsert({
      author_id: userId,
      slug,
      place: String(meta.place),
      date: String(meta.date),
      fragment: String(meta.fragment),
      accent: String(meta.accent),
      backdrop: typeof meta.backdrop === "string" ? meta.backdrop : null,
      veil: meta.veil === false ? false : true,
      source: "",
      blocks,
      status: "published",
      published_at: new Date().toISOString(),
    }, { onConflict: "author_id,slug" });
    if (error) console.error(`  ${slug}: ${error.message}`);
    else console.log(`  seeded @${handle}/${slug}`);
  }
  console.log("\nDone.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
