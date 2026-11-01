"use client";

/**
 * SIDE-BY-SIDE COMPARE  (/compare) — an internal harness to judge the two
 * bespoke pipelines on the SAME story:
 *   LEFT  — Opus free-form HTML     (/api/brain/generate, ~1–2 min)
 *   RIGHT — spec-driven Experience  (/api/brain → LivingExperience, instant)
 * Paste a story, hit Run both, watch them render next to each other. Not linked
 * from the product; a tool for deciding which pipeline wins.
 */

import { useState } from "react";
import { LivingEmbed } from "@/components/living/LivingEmbed";
import type { ExperienceSpec } from "@/lib/living/experience";

const SAMPLE = `I booked the trip to prove I could still do things alone.

The first two days I barely spoke to anyone. I ate dinner with a book propped against the water glass and told myself this was peace, not hiding.

Then I got on the wrong bus. It got stuck behind some kind of festival, and by the time I got off I was in a neighbourhood I couldn't pronounce, hungry, a bit angry at myself, phone at 9%.

There was a tiny temple at the end of the street. No sign in English, no tourists. Just a gravel path and moss everywhere, that deep wet green you only see in places no one is trying to show you.

I sat there until the battery died. I have never felt less alone in my life.

I never made it to the famous shrine. I still don't know what that temple was called. I've looked.

I think about it more than any place I actually planned.`;

export default function ComparePage() {
  const [text, setText] = useState(SAMPLE);
  const [title, setTitle] = useState("the wrong bus");
  const [exp, setExp] = useState<ExperienceSpec | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [expNote, setExpNote] = useState("");
  const [htmlNote, setHtmlNote] = useState("");
  const [expBusy, setExpBusy] = useState(false);
  const [htmlBusy, setHtmlBusy] = useState(false);

  const runExp = async () => {
    setExpBusy(true); setExp(null); setExpNote("reading…");
    const t0 = Date.now();
    try {
      const r = await fetch("/api/brain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, title }) });
      const d = await r.json();
      if (d.ok && d.cast?.experience) { setExp(d.cast.experience); setExpNote(`${d.cast.style} · ${((Date.now() - t0) / 1000).toFixed(1)}s — ${d.cast.rationale || ""}`); }
      else setExpNote(`failed: ${d.reason || "no experience"} ${d.detail || ""}`);
    } catch (e) { setExpNote(`error: ${e instanceof Error ? e.message : ""}`); }
    finally { setExpBusy(false); }
  };

  const runHtml = async () => {
    setHtmlBusy(true); setHtml(null); setHtmlNote("composing (Opus, ~1–2 min)…");
    const t0 = Date.now();
    try {
      const r = await fetch("/api/brain/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, title, mode: "single", tier: "opus" }) });
      const d = await r.json();
      if (d.ok && d.html) { setHtml(d.html); setHtmlNote(`${((Date.now() - t0) / 1000).toFixed(1)}s · ${(d.html.length / 1000).toFixed(0)}kb`); }
      else setHtmlNote(`failed: ${d.reason || "no html"} ${(d.detail || "").slice(0, 120)}`);
    } catch (e) { setHtmlNote(`error: ${e instanceof Error ? e.message : ""}`); }
    finally { setHtmlBusy(false); }
  };

  const runBoth = () => { runExp(); runHtml(); };

  return (
    <main style={{ minHeight: "100vh", background: "#0b0d12", color: "#e7e8ec", fontFamily: "ui-monospace, Menlo, monospace" }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid #23262e", display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title"
            style={{ width: "100%", marginBottom: 6, padding: "6px 8px", background: "#14171d", color: "#e7e8ec", border: "1px solid #2a2e38", borderRadius: 6 }} />
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6}
            style={{ width: "100%", padding: "8px", background: "#14171d", color: "#e7e8ec", border: "1px solid #2a2e38", borderRadius: 6, fontFamily: "inherit", fontSize: 12, lineHeight: 1.5 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={runBoth} disabled={!text.trim()} style={btn}>▶ Run both</button>
          <button onClick={runExp} disabled={!text.trim() || expBusy} style={btnSm}>right only</button>
          <button onClick={runHtml} disabled={!text.trim() || htmlBusy} style={btnSm}>left only</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "calc(100vh - 150px)" }}>
        <section style={{ borderRight: "1px solid #23262e", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <header style={hdr}><b>LEFT — Opus free-form HTML</b><span style={note}>{htmlBusy ? "⏳ " : ""}{htmlNote}</span></header>
          <div style={{ flex: 1, minHeight: 0, background: "#0a0912" }}>
            {html ? <LivingEmbed text={text} title={title} html={html} className="cmp-frame" />
              : <Empty label={htmlBusy ? "composing… Opus takes ~1–2 min" : "left pane — the current live Bespoke (Opus HTML)"} />}
          </div>
        </section>
        <section style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <header style={hdr}><b>RIGHT — spec Experience</b><span style={note}>{expBusy ? "⏳ " : ""}{expNote}</span></header>
          <div style={{ flex: 1, minHeight: 0, background: "#0a0912" }}>
            {exp ? <LivingEmbed text={text} title={title} experience={exp} className="cmp-frame" />
              : <Empty label={expBusy ? "reading…" : "right pane — the new per-story Experience"} />}
          </div>
        </section>
      </div>
      <style>{`.cmp-frame{width:100%;height:100%;border:0;display:block}`}</style>
    </main>
  );
}

function Empty({ label }: { label: string }) {
  return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a5f6a", fontSize: 12, textAlign: "center", padding: 20 }}>{label}</div>;
}

const btn: React.CSSProperties = { padding: "10px 16px", background: "#2d6bf0", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" };
const btnSm: React.CSSProperties = { padding: "6px 12px", background: "#1b1f27", color: "#aeb3bd", border: "1px solid #2a2e38", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "inherit" };
const hdr: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid #23262e", display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, alignItems: "baseline" };
const note: React.CSSProperties = { color: "#8a8f99", fontSize: 10, textAlign: "right", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
