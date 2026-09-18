"use client";

import { useEffect, useState } from "react";
import { FormatRender } from "@/components/living/formats/render";
import { isFormatKey, type FormatKey } from "@/lib/formats";
import type { StoryViewData } from "@/components/living/StoryView";

/**
 * A single format rendered in isolation, fed the current draft from
 * same-origin sessionStorage. Used as an <iframe> tile in the studio's
 * character-select so each format gets its own viewport (correct vh) and
 * its own :root (no palette collisions between previews).
 */
export default function PreviewTile() {
  const [data, setData] = useState<StoryViewData | null>(null);
  const [format, setFormat] = useState<FormatKey>("standard");
  const [chrome, setChrome] = useState(false);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const as = q.get("as");
      if (isFormatKey(as)) setFormat(as);
      setChrome(q.get("chrome") === "1");
      const raw = sessionStorage.getItem("lp-preview");
      if (raw) setData(JSON.parse(raw) as StoryViewData);
    } catch { /* no-op */ }
  }, []);

  if (!data) return null;
  return <FormatRender format={format} veil={false} chrome={chrome} {...data} />;
}
