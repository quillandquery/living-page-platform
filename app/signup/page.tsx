"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type AuthState } from "@/app/auth/actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, {});

  return (
    <main className="gate">
      <div className="gate-card">
        <Link href="/" className="back">places</Link>
        <h1 className="gate-title">Somewhere to put it.</h1>
        <p className="gate-sub">A living page is a place you write, not a template you fill. Make one.</p>
        <form action={action} className="gate-form">
          <label className="lab">email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="lab">password
            <input name="password" type="password" autoComplete="new-password" minLength={8} required />
            <span className="hint">At least 8 characters.</span>
          </label>
          {state.error ? <p className="say say-bad">{state.error}</p> : null}
          {state.notice ? <p className="say say-ok">{state.notice}</p> : null}
          <button className="act" disabled={pending}>{pending ? "…" : "make an account"}</button>
        </form>
        <p className="gate-alt">Already have one? <Link href="/login">Sign in.</Link></p>
      </div>
    </main>
  );
}
