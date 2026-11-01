"use client";

import { useId } from "react";
import type { StoryVisibility } from "@/lib/types";
import { VISIBILITIES, VISIBILITY_COPY } from "@/lib/visibility";

/**
 * PUBLIC / PRIVATE — the choice made at the moment of publishing.
 *
 * Two plain cards, one decision, no permissions vocabulary. Native radios
 * underneath (keyboard + screen-reader behaviour for free); the card is the
 * label. The copy lives in lib/visibility.ts so every surface says the same
 * thing. `data-no-flip` tells the publish overlay's arrow-key handler (which
 * flips formats) to leave arrow keys alone while focus is in here.
 */
export function VisibilityIcon({ kind }: { kind: StoryVisibility }) {
  return kind === "public" ? (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" />
      <path d="M2.75 10h14.5M10 2.75c2.2 2.1 3.3 4.5 3.3 7.25S12.2 15.15 10 17.25C7.8 15.15 6.7 12.75 6.7 10S7.8 4.85 10 2.75Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="8.75" width="11" height="8" rx="1.8" />
      <path d="M7 8.75V6.5a3 3 0 0 1 6 0v2.25" />
    </svg>
  );
}

export function VisibilityPicker({
  value, onChange, disabled = false, legend = "Who can read this?",
}: {
  value: StoryVisibility;
  onChange: (v: StoryVisibility) => void;
  disabled?: boolean;
  legend?: string;
}) {
  const name = useId();
  return (
    <fieldset className="vis-picker" disabled={disabled} data-no-flip>
      <legend className="vis-legend">{legend}</legend>
      {VISIBILITIES.map((v) => (
        <label key={v} className={`vis-opt${value === v ? " is-on" : ""}`}>
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
          <span className="vis-ico"><VisibilityIcon kind={v} /></span>
          <span className="vis-txt">
            <span className="vis-name">{VISIBILITY_COPY[v].label}</span>
            <span className="vis-blurb">{VISIBILITY_COPY[v].blurb}</span>
          </span>
          <span className="vis-dot" aria-hidden="true" />
        </label>
      ))}
    </fieldset>
  );
}

export default VisibilityPicker;
