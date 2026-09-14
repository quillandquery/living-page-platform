import Link from "next/link";
import { notFound } from "next/navigation";
import { TEST_STORIES } from "@/lib/dev/test-stories";
import { extractStoryProfile } from "@/lib/semantic-profile";
import { generateArtDirection } from "@/lib/art-direction/generate";

/**
 * DEVELOPMENT-ONLY visual QA index (§45/§40) — the Story Visual System 2.0
 * test suite, rendered without the database so it works in any environment.
 * Never linked from the product; not for a reader.
 */
export default function DevPreviewIndex() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4vh 1.5rem", fontFamily: "ui-monospace, monospace" }}>
      <h1 style={{ fontSize: "1.1rem" }}>Art-direction test suite</h1>
      <p style={{ color: "#666", fontSize: ".85rem" }}>
        Ten stories chosen to exercise every environment/mood/narrative combination (§40). Dev-only —
        not seeded, not linked from the product.
      </p>
      <ul style={{ padding: 0, listStyle: "none", display: "grid", gap: ".6rem", marginTop: "2rem" }}>
        {TEST_STORIES.map((s) => {
          const profile = extractStoryProfile(s.text);
          const ad = generateArtDirection(s.text, profile);
          return (
            <li key={s.key} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
              <Link href={`/dev/preview/${s.key}`} style={{ fontWeight: 700 }}>{s.place}</Link>
              <div style={{ fontSize: ".78rem", color: "#666", marginTop: ".3rem" }}>
                {ad.environment.label} · {ad.atmosphere.mood} · {ad.artStyle.label} · {ad.composition.label} · signature: {ad.signature.doodle}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
