"use client";

import { useActionState } from "react";
import { createProfileAction, type AuthState } from "@/app/auth/actions";

export function OnboardingForm({ suggestion, next }: { suggestion: string; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(createProfileAction, {});

  return (
    <form action={action} className="gate-form">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="lab">handle
        <span className="handle-field">
          <span className="handle-at">@</span>
          <input name="handle" defaultValue={suggestion} pattern="[a-z0-9-]{3,30}" autoCapitalize="none" required />
        </span>
      </label>
      <label className="lab">display name
        <input name="display_name" placeholder="what should readers call you" />
      </label>
      <label className="lab">a line about you
        <input name="bio" placeholder="optional" maxLength={160} />
      </label>
      {state.error ? <p className="say say-bad">{state.error}</p> : null}
      <button className="act" disabled={pending}>{pending ? "…" : "claim it"}</button>
    </form>
  );
}
