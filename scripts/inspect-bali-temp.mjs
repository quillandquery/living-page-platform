import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// read env directly from .env.local (resolved relative to this script's own
// location, not the cwd it's run from) since this is a one-off inspection script
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(projectRoot, ".env.local"), "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: author, error: authorErr } = await supabase
  .from("profiles").select("*").eq("handle", "reshikaa30").maybeSingle();
if (authorErr) { console.error("author error:", authorErr); process.exit(1); }
console.log("author:", author?.id, author?.handle, author?.display_name);

const { data: story, error: storyErr } = await supabase
  .from("stories").select("*").eq("author_id", author.id).eq("slug", "bali").maybeSingle();
if (storyErr) { console.error("story error:", storyErr); process.exit(1); }

console.log("\n--- story row (bali) ---");
console.log("id:", story.id);
console.log("status:", story.status);
console.log("type:", story.type);
console.log("place:", story.place);
console.log("fragment:", story.fragment);
console.log("accent:", story.accent);
console.log("backdrop:", story.backdrop);
console.log("veil:", story.veil);
console.log("created_at:", story.created_at);
console.log("updated_at:", story.updated_at);
console.log("published_at:", story.published_at);
console.log("\nart_direction:");
console.log(JSON.stringify(story.art_direction, null, 2));
