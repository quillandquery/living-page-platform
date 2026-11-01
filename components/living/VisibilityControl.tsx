"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVisibilityAction } from "@/app/write/actions";
import type { StoryVisibility } from "@/lib/types";
import { MAKE_PRIVATE_WARNING, VISIBILITY_COPY } from "@/lib/visibility";
import { VisibilityIcon } from "./VisibilityPicker";

/**
 * CHANGE ONE STORY'S VISIBILITY AFTER IT'S PUBLISHED — no republish, no new
 * URL, nothing recreated. A quiet badge ("Private" / "Public") with a single
 * action beside it; the action asks once, in place, before it does anything
 * (going private pulls the story from everyone else immediately; going
 * public exposes it), then saves, confirms in words, and refreshes the page's
 * server data so every list reflects it.
 *
 * Only ever rendered for the story's own author (the pages decide that), and
 * the server action re-checks ownership regardless — RLS has the last word.
 *
 * variant "inline"  — author page / editor, sits in the page's own ink.
 * variant "pill"    — floats over the immersive reader, self-coloured.
 */
type Note = { tone: "ok" | "bad"; text: string } | null;

export function VisibilityControl({
  storyId, value, variant = "inline", onChange,
}: {
  storyId: string;
  value: StoryVisibility;
  /** "bar" = compact chip for the editor's top bar (confirm opens as a popover). */
  variant?: "inline" | "pill" | "bar";
  onChange?: (v: StoryVisibility) => void;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<StoryVisibility>(value);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // follow the server after a refresh; the confirmation note must survive
  // that refresh, so it only resets when the parent switches to another story
  useEffect(() => { setCurrent(value); }, [value]);
  useEffect(() => { setAsking(false); setNote(null); }, [storyId]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const target: StoryVisibility = current === "public" ? "private" : "public";

  const commit = () =>
    start(async () => {
      let res;
      try { res = await setVisibilityAction(storyId, target); }
      catch { res = { ok: false as const, message: "Couldn't change that. Check your connection and try again." }; }
      if (!res.ok) { setNote({ tone: "bad", text: res.message }); return; }
      setCurrent(res.visibility);
      setAsking(false);
      setNote({
        tone: "ok",
        text: res.visibility === "private" ? "Now private. Only you can read it." : "Now public. It's on your page.",
      });
      onChange?.(res.visibility);
      // the pill unmounts when the story turns public (server stops rendering
      // it) — hold the refresh a beat so the confirmation is actually read.
      if (variant === "pill") timer.current = setTimeout(() => router.refresh(), 1400);
      else router.refresh();
    });

  return (
    <div className={`vis-ctl vis-ctl-${variant === "bar" ? "inline is-bar" : variant}${asking ? " is-asking" : ""}`}>
      <div className="vis-ctl-row">
        <span className={`vis-badge is-${current}`}>
          <VisibilityIcon kind={current} />
          {current === "private" ? "Private" : "Public"}
        </span>
        {!asking ? (
          <button type="button" className="vis-act" disabled={pending} onClick={() => { setNote(null); setAsking(true); }}>
            {target === "private" ? "Make private" : "Make public"}
          </button>
        ) : null}
      </div>

      {asking ? (
        <div className="vis-confirm" role="alertdialog" aria-label={`Make this story ${target}?`}>
          <p className="vis-confirm-text">
            {target === "private" ? MAKE_PRIVATE_WARNING : `Anyone will be able to read this. ${VISIBILITY_COPY.public.blurb}`}
          </p>
          <div className="vis-confirm-row">
            <button type="button" className="vis-go" disabled={pending} onClick={commit} autoFocus>
              {pending ? "Saving…" : target === "private" ? "Make private" : "Make public"}
            </button>
            <button type="button" className="vis-cancel" disabled={pending} onClick={() => setAsking(false)}>Cancel</button>
          </div>
        </div>
      ) : null}

      <p className={`vis-note${note ? ` is-${note.tone}` : ""}`} role="status" aria-live="polite">{note?.text ?? ""}</p>
    </div>
  );
}

export default VisibilityControl;
