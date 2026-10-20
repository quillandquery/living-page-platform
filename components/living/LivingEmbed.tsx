"use client";

/**
 * LIVING EMBED (parent side) — an iframe of `/living/embed` that shows the real
 * living page for a draft at full fidelity, updating live as the writer types.
 * The iframe is its own viewport, so CoastStorm / NoirRoom / LivingStory render
 * exactly as they will when published (not a boxed-down generic substitute).
 * We debounce the draft and postMessage it once the embed says it's ready.
 */

import { useEffect, useRef, useState } from "react";

export type PaletteMsg = { scheme?: "light" | "dark"; ground?: string; accent?: string; warm?: string };
export type LivingEmbedProps = {
  text: string;
  title?: string;
  eyebrow?: string;
  world?: string; // a WorldKey to pin, a medium key, or undefined for auto
  palette?: PaletteMsg | null; // the brain's per-story tint (Stage 1)
  html?: string | null;        // a bespoke Opus-generated page (Stage 4) — rendered sandboxed
  className?: string;
};

export function LivingEmbed({ text, title, eyebrow, world, palette, html, className }: LivingEmbedProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source === ref.current?.contentWindow && e.data === "lp-embed-ready") setReady(true);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (!ready || html) return;
    const t = setTimeout(() => {
      ref.current?.contentWindow?.postMessage(
        { type: "lp-embed", text, title, eyebrow, world, palette: palette ?? undefined },
        window.location.origin,
      );
    }, 160);
    return () => clearTimeout(t);
  }, [ready, text, title, eyebrow, world, palette, html]);

  // Stage-4 bespoke page: render the generated HTML in a sandboxed iframe —
  // allow-scripts but NOT allow-same-origin, so it can't reach the app or the
  // network (also locked by the CSP injected into the HTML). Branch AFTER all
  // hooks so the hook order never changes (rules of hooks).
  if (html) {
    return (
      <iframe
        title="living page"
        className={className}
        sandbox="allow-scripts"
        srcDoc={html}
        style={{ border: 0, width: "100%", height: "100%", display: "block", background: "#0a0912" }}
      />
    );
  }

  return (
    <iframe
      ref={ref}
      src="/living/embed"
      title="living preview"
      className={className}
      style={{ border: 0, width: "100%", height: "100%", display: "block", background: "#0a0912" }}
    />
  );
}
export default LivingEmbed;
