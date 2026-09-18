"use client";

import { FORMATS, type FormatKey } from "@/lib/formats";
import { FormatCover } from "@/components/living/FormatCover";

/**
 * CIRCLE WHEEL — layouts arranged around a hub. The selected spoke enlarges
 * and glows; the hub is "or let us decide" (the engine's pick). Kept to the
 * story's curated few so the wheel never crowds.
 */
export function FormatWheel({
  formats, value, autoKey, onSelect,
}: { formats: FormatKey[]; value: FormatKey; autoKey: FormatKey; onSelect: (k: FormatKey) => void }) {
  const n = formats.length;
  return (
    <div className="fs-wheel">
      {formats.map((k, i) => {
        const a = (-90 + (i * 360) / n) * (Math.PI / 180);
        const x = 50 + Math.cos(a) * 40;
        const y = 50 + Math.sin(a) * 40;
        return (
          <button key={k} type="button" onClick={() => onSelect(k)}
            className={`fs-spoke${k === value ? " is-active" : ""}`} style={{ left: `${x}%`, top: `${y}%` }}
            aria-pressed={k === value}>
            <span className="fs-spoke-face"><FormatCover k={k} /></span>
            <span className="fs-spoke-name">{FORMATS[k].label}</span>
          </button>
        );
      })}
      <button type="button" className="fs-hub" onClick={() => onSelect(autoKey)}>
        <span className="fs-hub-t">Choose<br/>a layout</span>
        <span className="fs-hub-s">or let us decide</span>
      </button>
    </div>
  );
}

export default FormatWheel;
