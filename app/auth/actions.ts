"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * AUTH, AS SERVER ACTIONS.
 *
 * Every one of these runs on the server with the request's cookies, so
 * signing in or out mutates the session cookie the middleware then keeps
 * fresh. Open signup: anyone with an email can make an account. The only
 * gate on the platform is that publishing needs a handle, which onboarding
 * collects.
 */

export type AuthState = { error?: string; notice?: string };

const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

export async function signInAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Email and password, both." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  // where they were headed before the wall
  const next = String(form.get("next") ?? "") || "/write";
  redirect(next.startsWith("/") ? next : "/write");
}

export async function signUpAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || password.length < 8) return { error: "Use a password of at least 8 characters." };

  const supabase = await supabaseServer();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${site}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: error.message };

  // If the project has email confirmation off, a session already exists and
  // we can go straight to picking a handle. If it's on, there is no session
  // yet — tell them to confirm.
  if (data.session) redirect("/onboarding");
  return { notice: "Check your email to confirm your account, then come back and sign in." };
}

export async function signOutAction() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function createProfileAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const handle = String(form.get("handle") ?? "").trim().toLowerCase();
  const display_name = String(form.get("display_name") ?? "").trim();
  const bio = String(form.get("bio") ?? "").trim();

  if (!HANDLE_RE.test(handle)) {
    return { error: "A handle is 3–30 characters: lowercase letters, numbers and hyphens, not starting or ending on a hyphen." };
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const taken = await supabase.from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (taken.data && taken.data.id !== user.id) return { error: `@${handle} is taken.` };

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    handle,
    display_name: display_name || handle,
    bio,
  });
  if (error) {
    return { error: error.code === "23505" ? `@${handle} is taken.` : error.message };
  }

  redirect("/write");
}

export async function updateProfileAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const display_name = String(form.get("display_name") ?? "").trim();
  const bio = String(form.get("bio") ?? "").trim();

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("profiles").update({ display_name, bio }).eq("id", user.id);
  if (error) return { error: error.message };
  return { notice: "Saved." };
}
