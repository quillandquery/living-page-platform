"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction, type AuthState } from "@/app/auth/actions";
import { GoogleButton } from "@/app/auth/google-button";

const CALLBACK_ERRORS: Record<string, string> = {
  oauth: "Google sign-in didn’t complete. Try again.",
  confirm: "That link has expired. Sign in, or ask for a new one.",
};

function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, {});
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const callbackError = CALLBACK_ERRORS[params.get("error") ?? ""];

  return (
    <div className="gate-card">
      <Link href="/" className="back">places</Link>
      <h1 className="gate-title">Come back in.</h1>
      {callbackError ? <p className="say say-bad">{callbackError}</p> : null}
      <GoogleButton next={next} />
      <p className="gate-or"><span>or</span></p>
      <form action={action} className="gate-form">
        <input type="hidden" name="next" value={next} />
        <label className="lab">email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="lab">password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {state.error ? <p className="say say-bad">{state.error}</p> : null}
        <button className="act" disabled={pending}>{pending ? "…" : "sign in"}</button>
      </form>
      <p className="gate-alt">No account yet? <Link href="/signup">Start one.</Link></p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="gate">
      <Suspense fallback={<div className="gate-card"><p className="hint">…</p></div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
