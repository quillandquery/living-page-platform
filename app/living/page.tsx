import { notFound } from "next/navigation";
import Link from "next/link";
import { LIVING_DEMOS } from "@/lib/dev/living-demos";

/** DEV ONLY — index of living-page demos (the D9 renderer in the product). */
export default function LivingIndex() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main style={{ maxWidth: 640, margin: "10vh auto", padding: "0 1.4rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "1.5rem" }}>Living pages</h1>
      <p style={{ color: "#555" }}>
        The living-page renderer (D9) in the app: raw text → <code>castLivingScene</code> → <code>LivingStory</code>.
        No <code>annotate</code> 70% cap, no <code>Look</code> system, no legacy <code>StoryView</code>.
      </p>
      <p style={{ margin: "1rem 0 0" }}>
        <Link href="/living/try" style={{ fontWeight: 600, background: "#111", color: "#fff", padding: ".5rem .9rem", borderRadius: 7, textDecoration: "none" }}>
          ✍️ Paste your own story →
        </Link>
      </p>
      <ul style={{ listStyle: "none", padding: 0, marginTop: "1.5rem", display: "grid", gap: ".6rem" }}>
        {LIVING_DEMOS.map((d) => (
          <li key={d.key} style={{ border: "1px solid #e4e4e4", borderRadius: 8, padding: ".9rem 1rem" }}>
            <Link href={`/living/${d.key}`} style={{ fontSize: "1.05rem", fontWeight: 600 }}>{d.title}</Link>
            <span style={{ color: "#888", marginLeft: ".6rem", fontSize: ".85rem" }}>{d.eyebrow} · world: {d.world ?? "(auto)"}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
