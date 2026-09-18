"use client";

import { useEffect, useState } from "react";
import { FormatRender } from "@/components/living/formats/render";
import { isFormatKey, type FormatKey } from "@/lib/formats";
import type { StoryViewData } from "@/components/living/StoryView";

/**
 * A single format rendered in isolation, fed the current draft from
 * same-origin sessionStorage. Robust to the parent writing the draft after
 * this iframe has loaded: it re-reads on the `storage` event and briefly
 * polls, so the preview never lands blank.
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
    } catch { /* no-op */ }

    let done = false;
    const read = () => {
      try {
        const raw = sessionStorage.getItem("lp-preview");
        if (raw) { setData(JSON.parse(raw) as StoryViewData); done = true; return true; }
      } catch { /* no-op */ }
      return false;
    };
    if (read()) return;
    const onStorage = (e: StorageEvent) => { if (e.key === "lp-preview") read(); };
    window.addEventListener("storage", onStorage);
    let tries = 0;
    const t = window.setInterval(() => { if (done || read() || ++tries > 30) window.clearInterval(t); }, 100);
    return () => { window.removeEventListener("storage", onStorage); window.clearInterval(t); };
  }, []);

  if (!data) return null;
  return <FormatRender format={format} veil={false} chrome={chrome} {...data} />;
}
