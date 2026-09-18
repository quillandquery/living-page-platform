"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FORMATS, type FormatKey } from "@/lib/formats";

/* Tiny abstract glyph of each format's layout — the "portrait" in the
   character-select grid. 24×24, currentColor. */
function Glyph({ k }: { k: FormatKey }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const box = (p: React.ReactNode) => <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">{p}</svg>;
  switch (k) {
    case "standard":  return box(<><line x1="5" y1="8" x2="19" y2="8" {...s}/><line x1="5" y1="12" x2="19" y2="12" {...s}/><line x1="5" y1="16" x2="14" y2="16" {...s}/></>);
    case "scrapbook": return box(<><rect x="4" y="6" width="9" height="8" rx="1" transform="rotate(-6 8 10)" {...s}/><rect x="12" y="11" width="9" height="8" rx="1" transform="rotate(7 16 15)" {...s}/></>);
    case "letter":    return box(<><line x1="5" y1="7" x2="17" y2="7" {...s}/><line x1="5" y1="11" x2="19" y2="11" {...s}/><path d="M5 16c2-2 4 2 6 0s3-2 5 0" {...s}/></>);
    case "poster":    return box(<><rect x="5" y="5" width="14" height="9" rx="1" {...s}/><line x1="7" y1="18" x2="17" y2="18" {...s}/></>);
    case "ticket":    return box(<><rect x="4" y="8" width="16" height="8" rx="1.5" {...s}/><line x1="10" y1="8" x2="10" y2="16" strokeDasharray="1.5 1.5" {...s}/></>);
    case "notebook":  return box(<><rect x="4" y="5" width="16" height="14" rx="1" {...s}/><line x1="4" y1="10" x2="20" y2="10" {...s}/><line x1="4" y1="14" x2="20" y2="14" {...s}/><line x1="9" y1="5" x2="9" y2="19" {...s}/></>);
    case "gallery":   return box(<><rect x="4" y="6" width="9" height="9" rx="1" {...s}/><line x1="15" y1="8" x2="20" y2="8" {...s}/><line x1="15" y1="12" x2="20" y2="12" {...s}/></>);
    case "film":      return box(<><rect x="3" y="6" width="18" height="3" {...s}/><rect x="3" y="15" width="18" height="3" {...s}/><line x1="8" y1="12" x2="16" y2="12" {...s}/></>);
    case "ransom":    return box(<><rect x="4" y="7" width="6" height="5" rx="1" transform="rotate(-8 7 9)" {...s}/><rect x="12" y="6" width="6" height="5" rx="1" transform="rotate(6 15 8)" {...s}/><rect x="8" y="13" width="7" height="5" rx="1" transform="rotate(-4 11 15)" {...s}/></>);
    case "marquee":   return box(<><rect x="4" y="9" width="16" height="6" rx="3" {...s}/><circle cx="8" cy="12" r="0.9" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="0.9" fill="currentColor" stroke="none"/></>);
    case "postcard":  return box(<><rect x="4" y="7" width="16" height="10" rx="1" {...s}/><rect x="15" y="9" width="3" height="3" {...s}/><line x1="6" y1="10" x2="12" y2="10" {...s}/><line x1="6" y1="13" x2="12" y2="13" {...s}/></>);
    default:          return box(<circle cx="12" cy="12" r="6" {...s}/>);
  }
}

/**
 * "READ AS —" as a character-select. A single trigger opens a grid of format
 * portraits; picking one navigates to its ?as= URL (shareable, the growth
 * lever). Only the formats that fit this story are offered.
 */
export function FormatPicker({
  formats, active, basePath,
}: { formats: FormatKey[]; active: FormatKey; basePath: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (formats.length < 2) return null;
  const sep = basePath.includes("?") ? "&" : "?";
  const href = (k: FormatKey) => (k === "standard" ? basePath : `${basePath}${sep}as=${k}`);

  return (
    <>
      <button className="fp-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <span className="fp-tg"><Glyph k={active} /></span>
        <span className="fp-tl"><small>Read as</small>{FORMATS[active].label}</span>
        <span className="fp-tc" aria-hidden="true">⌄</span>
      </button>

      {open ? (
        <div className="fp-scrim" onClick={() => setOpen(false)}>
          <div className="fp-panel" role="dialog" aria-label="Read this story as" onClick={(e) => e.stopPropagation()}>
            <div className="fp-head"><span>Read this as —</span><button className="fp-x" onClick={() => setOpen(false)} aria-label="Close">✕</button></div>
            <div className="fp-grid">
              {formats.map((k) => (
                <Link key={k} href={href(k)} scroll={false} onClick={() => setOpen(false)}
                  className={`fp-card${k === active ? " is-active" : ""}`} aria-current={k === active ? "true" : undefined}>
                  <span className="fp-card-g"><Glyph k={k} /></span>
                  <span className="fp-card-n">{FORMATS[k].label}</span>
                  <span className="fp-card-b">{FORMATS[k].blurb}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default FormatPicker;
