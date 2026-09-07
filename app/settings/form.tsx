"use client";

import { useActionState } from "react";
import { updateProfileAction, type AuthState } from "@/app/auth/actions";

export function SettingsForm({ displayName, bio }: { displayName: string; bio: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(updateProfileAction, {});

  return (
    <form action={action} className="gate-form">
      <label className="lab">display name
        <input name="display_name" defaultValue={displayName} />
      </label>
      <label className="lab">a line about you
        <input name="bio" defaultValue={bio} maxLength={160} />
      </label>
      {state.error ? <p className="say say-bad">{state.error}</p> : null}
      {state.notice ? <p className="say say-ok">{state.notice}</p> : null}
      <button className="act" disabled={pending}>{pending ? "…" : "save"}</button>
    </form>
  );
}
