"use client";

import Link from "next/link";
import { FORMATS, type FormatKey } from "@/lib/formats";

/**
 * "READ AS —" — the reader-facing format switch, and the growth surface.
 * Each option is a real URL (?as=<key>) so the state is shareable: a link
 * to a story-as-poster lands a stranger directly in that format. Prominent
 * on purpose — flipping the same words between media is the "whoa" moment.
 */
export function FormatSwitcher({
  formats, active, basePath,
}: { formats: FormatKey[]; active: FormatKey; basePath: string }) {
  if (formats.length < 2) return null;
  const sep = basePath.includes("?") ? "&" : "?";
  return (
    <nav className="fmt-switch" aria-label="Read this story as">
      <span className="fmt-lead">Read as</span>
      {formats.map((k) => (
        <Link
          key={k}
          href={k === "standard" ? basePath : `${basePath}${sep}as=${k}`}
          className={`fmt-opt${k === active ? " is-active" : ""}`}
          aria-current={k === active ? "true" : undefined}
          scroll={false}
        >
          {FORMATS[k].label}
        </Link>
      ))}
    </nav>
  );
}

export default FormatSwitcher;
