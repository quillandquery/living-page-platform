import { ImageResponse } from "next/og";

/**
 * Default share-card image for the homepage and any page that doesn't set
 * its own (SEO strategy doc: "no metadataBase/OG image on the homepage" —
 * finding #1/#2). Copy is the locked hero copy from docs/COPY.md
 * (`[HERO.EYEBROW]`, `[HERO.H1]`) — never improvised.
 */
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
          A new way to tell a story
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 66,
            fontWeight: 500,
            lineHeight: 1.18,
            color: "#1A1816",
            maxWidth: 980,
          }}
        >
          <span>You have a story.</span>
          <span>It shouldn&apos;t look like a blog post.</span>
        </div>
        <div style={{ marginTop: 48, fontSize: 30, color: "#2D6BF0" }}>
          Living Page
        </div>
      </div>
    ),
    { ...size },
  );
}
