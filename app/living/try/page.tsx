"use client";

import { useState } from "react";
import { LivingStory } from "@/components/living/LivingStory";
import { CoastStorm } from "@/components/living/scenes/CoastStorm";
import { NoirRoom } from "@/components/living/scenes/NoirRoom";
import { castLivingScene, coastStormInput, noirRoomInput, RICH_WORLDS } from "@/lib/living/cast";
import { WORLDS, type WorldKey } from "@/lib/living/worlds";

/**
 * DEV ONLY — paste any story and see it in the living-page architecture.
 * Pure client: raw text → castLivingScene → LivingStory. No annotate, no Look.
 * Separate paragraphs with a blank line.
 */
const SAMPLE = `Paste a story here. Separate paragraphs with a blank line.

The engine chooses a world from the words, keeps most of the page quiet, lets a
couple of genuine peaks swell, and makes the words assemble as you reach them.

Try something with a place in it — a coast, a city street at night, a kitchen —
and watch which world it picks.`;

export default function LivingTry() {
  const [text, setText] = useState(SAMPLE);
  const [title, setTitle] = useState("Untitled");
  const [eyebrow, setEyebrow] = useState("A living page");
  const [world, setWorld] = useState<"auto" | WorldKey>("auto");
  const [rendered, setRendered] = useState(0);
  const [editing, setEditing] = useState(true);

  const scene = castLivingScene(text, {
    title: title || undefined,
    eyebrow: eyebrow || undefined,
    world: world === "auto" ? undefined : world,
  });

  return (
    <>
      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          style={{ position: "fixed", top: 12, right: 12, zIndex: 100, padding: ".4rem .8rem",
            background: "rgba(20,20,20,.8)", color: "#fff", border: "none", borderRadius: 6,
            fontFamily: "system-ui", fontSize: ".8rem", cursor: "pointer" }}
        >✏️ edit</button>
      ) : null}

      {editing ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(12,12,16,.92)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "4vh 1rem" }}>
          <div style={{ width: "min(680px,94vw)", maxHeight: "92vh", overflow: "auto",
            background: "#17171c", border: "1px solid #2a2a33", borderRadius: 12, padding: "1.4rem",
            fontFamily: "system-ui, sans-serif", color: "#e8e8ea" }}>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 1rem" }}>Test a story in the living page</h2>
            <div style={{ display: "grid", gap: ".7rem" }}>
              <label style={{ fontSize: ".8rem", color: "#aaa" }}>Eyebrow
                <input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)}
                  style={ipt} /></label>
              <label style={{ fontSize: ".8rem", color: "#aaa" }}>Title
                <input value={title} onChange={(e) => setTitle(e.target.value)} style={ipt} /></label>
              <label style={{ fontSize: ".8rem", color: "#aaa" }}>World
                <select value={world} onChange={(e) => setWorld(e.target.value as "auto" | WorldKey)} style={ipt}>
                  <option value="auto">auto (chosen from the words)</option>
                  {Object.values(WORLDS).map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
                </select></label>
              <label style={{ fontSize: ".8rem", color: "#aaa" }}>Story (blank line between paragraphs)
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14}
                  style={{ ...ipt, resize: "vertical", lineHeight: 1.5, fontFamily: "Georgia, serif" }} /></label>
            </div>
            <div style={{ marginTop: "1rem", display: "flex", gap: ".6rem", alignItems: "center" }}>
              <button onClick={() => { setRendered((n) => n + 1); setEditing(false); }}
                style={{ padding: ".55rem 1.1rem", background: "#5ED0E6", color: "#06121a",
                  border: "none", borderRadius: 7, fontWeight: 600, cursor: "pointer" }}>Render →</button>
              <span style={{ color: "#888", fontSize: ".78rem" }}>
                picks world: <b style={{ color: "#bbb" }}>{scene.world.label}</b> ·
                {" "}{scene.beats.length} beats ·
                {" "}{scene.beats.filter((b) => b.loud).length} loud ·
                {" "}{scene.beats.filter((b) => b.behavior !== "unveil").length} performing
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {scene.world.key === "noir-room"
        ? <NoirRoom key={rendered} {...noirRoomInput(scene)} />
        : RICH_WORLDS.has(scene.world.key)
        ? <CoastStorm key={rendered} {...coastStormInput(scene)} />
        : <LivingStory key={rendered} scene={scene} />}
    </>
  );
}

const ipt: React.CSSProperties = {
  display: "block", width: "100%", marginTop: ".3rem", padding: ".5rem .6rem",
  background: "#0f0f13", color: "#e8e8ea", border: "1px solid #33333d", borderRadius: 6,
  fontSize: ".9rem", fontFamily: "system-ui, sans-serif",
};
