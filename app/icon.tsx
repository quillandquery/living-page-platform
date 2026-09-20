import { ImageResponse } from "next/og";

/**
 * SITE ICON (SEO audit, Sept 2026 — no favicon existed anywhere in the repo,
 * so every browser tab, bookmark and search result showed a generic globe).
 * Generated, not a shipped PNG: a bold serif "L" monogram on the paper
 * ground, in keeping with Decision D2 (no photography — identity is
 * hand-drawn / typographic) and the palette in docs/DESIGN-TOKENS.md.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1A1816",
          borderRadius: 7,
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 22,
            color: "#FBF6EC",
            lineHeight: 1,
            transform: "translateY(-1px)",
          }}
        >
          L
        </span>
      </div>
    ),
    { ...size },
  );
}
