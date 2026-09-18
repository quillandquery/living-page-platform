"use client";

import { useEffect } from "react";
import { FORMATS, type FormatKey } from "@/lib/formats";
import { FormatCover } from "@/components/living/FormatCover";
import type { StoryViewData } from "@/components/living/StoryView";

/**
 * CHARACTER-SELECT — the preview/publish moment. The story is the avatar,
 * the formats are the costumes: a rail of live mini-previews (each its own
 * iframe of the real draft) beside a big live preview of the chosen one.
 * Picking one sets the story's format; Publish keeps it.
 */
export function FormatSelect({
  data, formats, value, onSelect, onClose, onPublish, publishing, published,
}: {
  data: StoryViewData;
  formats: FormatKey[];
  value: FormatKey;
  onSelect: (k: FormatKey) => void;
  onClose: () => void;
  onPublish: () => void;
  publishing: boolean;
  published: boolean;
}) {
  // keep the draft the tiles read in sync
  useEffect(() => {
    try { sessionStorage.setItem("lp-preview", JSON.stringify(data)); } catch { /* no-op */ }
  }, [data]);

  const src = (k: FormatKey, chrome?: boolean) => `/preview-tile?as=${k}${chrome ? "&chrome=1" : ""}`;

  return (
    <div className="fs-wrap">
      <div className="fs-bar">
        <button className="fs-back" onClick={onClose}>← keep editing</button>
        <span className="fs-title">Choose how this is told</span>
        <button className="fs-pub" onClick={onPublish} disabled={publishing}>{published ? "Update" : "Publish"}</button>
      </div>
      <div className="fs-body">
        <div className="fs-rail" role="listbox" aria-label="Format">
          {formats.map((k) => (
            <button key={k} type="button" role="option" aria-selected={k === value}
              className={`fs-tile${k === value ? " is-active" : ""}`} onClick={() => onSelect(k)}>
              <span className="fs-tile-frame"><FormatCover k={k} /></span>
              <span className="fs-tile-name">{FORMATS[k].label}</span>
            </button>
          ))}
        </div>
        <div className="fs-stage">
          <iframe key={value} className="fs-stage-if" src={src(value, true)} title="Preview" />
        </div>
      </div>
    </div>
  );
}

export default FormatSelect;
