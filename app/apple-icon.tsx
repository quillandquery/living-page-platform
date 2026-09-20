import { ImageResponse } from "next/og";

/** Same monogram as app/icon.tsx, at the size iOS actually asks for
 *  (apple-touch-icon), so "add to home screen" doesn't fall back to a
 *  screenshot of the page. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 108,
            color: "#FBF6EC",
            lineHeight: 1,
            transform: "translateY(-4px)",
          }}
        >
          L
        </span>
      </div>
    ),
    { ...size },
  );
}
