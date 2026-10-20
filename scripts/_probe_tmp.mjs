import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error("NO_CREDS", !!url, !!key); process.exit(1); }
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: author, error: e1 } = await sb.from("profiles").select("*").eq("handle", "reshikaa30").maybeSingle();
if (e1) { console.error("ERR_AUTHOR", e1.message); process.exit(1); }
console.log("AUTHOR", JSON.stringify(author));
const { data: stories, error: e2 } = await sb.from("stories").select("slug,fragment,place,status,published_at").eq("author_id", author?.id).order("published_at", { ascending: false });
if (e2) { console.error("ERR_STORIES", e2.message); process.exit(1); }
console.log("STORIES", JSON.stringify(stories, null, 2));
