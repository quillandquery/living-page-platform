import { notFound } from "next/navigation";
import Link from "next/link";
import { listBrainSamples } from "@/lib/dev/brain-samples";

/**
 * DEV ONLY — index of stories the new brain has profiled. Each links to a real
 * rendered page whose art direction is derived from the brain's VisualProfile.
 * Run the brain first:  cd brain && python run.py --file samples/*.txt --out out/
 */
export default async function BrainTestIndex() {
  if (process.env.NODE_ENV === "production") notFound();
  const keys = await listBrainSamples();

  return (
    <main style={{ maxWidth: 680, margin: "8vh auto", padding: "0 1.2rem", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: ".4rem" }}>Brain test</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Real pages rendered from the new brain&rsquo;s <code>VisualProfile</code>{" "}
        (<code>brain/out/*.json</code>) via the Visual Grammar Engine.
      </p>

      {keys.length === 0 ? (
        <div style={{ background: "#fff6f6", border: "1px solid #f0caca", padding: "1rem", borderRadius: 8, marginTop: "1.5rem" }}>
          <strong>No profiles found.</strong>
          <p style={{ margin: ".5rem 0 0" }}>Generate them first:</p>
          <pre style={{ background: "#111", color: "#dfd", padding: ".8rem", borderRadius: 6, overflowX: "auto" }}>
{`cd brain
source .venv/bin/activate
python run.py --file samples/*.txt --out out/`}
          </pre>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: "1.5rem", display: "grid", gap: ".6rem" }}>
          {keys.map((k) => (
            <li key={k} style={{ border: "1px solid #e4e4e4", borderRadius: 8, padding: ".9rem 1rem" }}>
              <Link href={`/brain-test/${k}`} style={{ fontSize: "1.05rem", fontWeight: 600 }}>{k}</Link>
              <span style={{ color: "#888", fontSize: ".85rem", marginLeft: ".6rem" }}>
                <Link href={`/brain-test/${k}?source=beats`}>per-beat</Link>
                {" · "}
                <Link href={`/brain-test/${k}?debug=1`}>debug</Link>
                {" · "}
                <Link href={`/brain-test/${k}?engine=old`}>old engine</Link>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p style={{ color: "#999", fontSize: ".82rem", marginTop: "2rem" }}>
        Append <code>?debug=1</code> to see the brain&rsquo;s decision and the resolved art
        direction. Append <code>?engine=old</code> to render the same story through the
        legacy regex engine for comparison.
      </p>
    </main>
  );
}
