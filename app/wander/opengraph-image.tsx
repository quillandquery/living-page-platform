import { ImageResponse } from "next/og";

/** Share card for the /wander hub — same visual system as the homepage's
 *  default OG image, its own line so a shared Wander link doesn't reuse
 *  the homepage's hero copy. */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px 110px",
          background: "#FBF6EC",
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: "#8A837A",
            marginBottom: 28,
          }}
        >
          Living Page
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 66,
            fontWeight: 500,
            lineHeight: 1.18,
            color: "#1A1816",
            maxWidth: 980,
          }}
        >
          You don&apos;t have to know what you&apos;re looking for.
        </div>
        <div style={{ marginTop: 48, fontSize: 30, color: "#2D6BF0" }}>
          Wander
        </div>
      </div>
    ),
    { ...size },
  );
}
