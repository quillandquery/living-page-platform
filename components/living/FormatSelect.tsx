"use client";

import { useEffect } from "react";
import { FORMATS, type FormatKey } from "@/lib/formats";
import { FormatTurntable } from "@/components/living/FormatTurntable";
import type { StoryViewData } from "@/components/living/StoryView";
import type { StoryVisibility } from "@/lib/types";
import { MAKE_PRIVATE_WARNING } from "@/lib/visibility";
import { VisibilityPicker } from "@/components/living/VisibilityPicker";

/**
 * CHARACTER-SELECT — the preview/publish moment. The story is the avatar,
 * the formats are the costumes: a rail of live mini-previews (each its own
 * iframe of the real draft) beside a big live preview of the chosen one.
 * Picking one sets the story's format; Publish keeps it.
 *
 * The same moment decides who can read it: Public or Private, chosen right
 * under the bar. Optional — callers without a visibility concept (the demo)
 * simply don't pass it and no picker is drawn.
 */
export function FormatSelect({
  data, formats, value, autoKey, onSelect, onClose, onPublish, publishing, published,
  visibility, liveVisibility, onVisibilityChange, notice,
}: {
  data: StoryViewData;
  formats: FormatKey[];
  value: FormatKey;
  autoKey: FormatKey;
  onSelect: (k: FormatKey) => void;
  onClose: () => void;
  onPublish: () => void;
  publishing: boolean;
  published: boolean;
  /** the choice currently selected in the picker */
  visibility?: StoryVisibility;
  /** what the story is RIGHT NOW (only meaningful when `published`) */
  liveVisibility?: StoryVisibility;
  onVisibilityChange?: (v: StoryVisibility) => void;
  /** the editor's latest save/publish result — the overlay covers the editor
   *  bar, so the confirmation (or error) has to be shown here too. */
  notice?: { tone: "ok" | "bad"; text: string } | null;
}) {
  // keep the draft the tiles read in sync
  useEffect(() => {
    try { sessionStorage.setItem("lp-preview", JSON.stringify(data)); } catch { /* no-op */ }
  }, [data]);

  // arrow-key flipping, like a console select
  useEffect(() => {
    const i = formats.indexOf(value);
    const onKey = (e: KeyboardEvent) => {
      // arrow keys inside the visibility radios belong to the radios
      if ((e.target as HTMLElement | null)?.closest?.("[data-no-flip]")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); onSelect(formats[(i + 1) % formats.length]); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); onSelect(formats[(i - 1 + formats.length) % formats.length]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formats, value, onSelect]);

  const src = (k: FormatKey, chrome?: boolean) => `/preview-tile?as=${k}${chrome ? "&chrome=1" : ""}`;

  const hasPicker = visibility !== undefined && !!onVisibilityChange;
  // a LIVE public story about to be made private: say so before the click,
  // and name the button for what it will do.
  const goingPrivate = hasPicker && published && liveVisibility === "public" && visibility === "private";
  const goingPublic = hasPicker && published && liveVisibility === "private" && visibility === "public";
  const pubLabel = goingPrivate
    ? "Update and make private"
    : goingPublic
    ? "Update and make public"
    : published
    ? "Update"
    : visibility === "private"
    ? "Publish privately"
    : "Publish";

  return (
    <div className="fs-wrap">
      <div className="fs-bar">
        <button className="fs-back" onClick={onClose}>← keep editing</button>
        <span className="fs-title">Choose how this is told</span>
        <button className="fs-pub" onClick={onPublish} disabled={publishing}>{publishing ? "Publishing…" : pubLabel}</button>
      </div>
      {hasPicker ? (
        <div className="fs-vis">
          <div className="fs-vis-inner">
            <VisibilityPicker value={visibility} onChange={onVisibilityChange} disabled={publishing} />
            {goingPrivate ? <p className="fs-vis-warn" role="status">{MAKE_PRIVATE_WARNING}</p> : null}
          </div>
        </div>
      ) : null}
      {notice ? <p className={`fs-notice is-${notice.tone}`} role="status" aria-live="polite">{notice.text}</p> : null}
      <div className="fs-body">
        <div className="fs-wheelpane">
          <FormatTurntable formats={formats} value={value} autoKey={autoKey} onSelect={onSelect} />
        </div>
        <div className="fs-stage">
          <div className="fs-screen" key={value}>
            <iframe className="fs-stage-if" src={src(value, true)} title="Preview" />
          </div>
          <div className="fs-plate">
            <span className="fs-plate-name">{FORMATS[value].label}</span>
            <span className="fs-plate-blurb">{FORMATS[value].blurb}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormatSelect;
