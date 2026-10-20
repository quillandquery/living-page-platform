"use client";

import { useEffect, useState } from "react";
import { LivingStory } from "@/components/living/LivingStory";
import { NoirRoom } from "@/components/living/scenes/NoirRoom";
import { CoastStorm } from "@/components/living/scenes/CoastStorm";
import { castLivingScene, coastStormInput, noirRoomInput, RICH_WORLDS, type LivingScene } from "@/lib/living/cast";
import type { WorldKey } from "@/lib/living/worlds";

/**
 * Living preview — renders whatever the editor stashed in sessionStorage
 * ("lp-living") as a full living page, so the scroll-driven world evolving and
 * the bespoke rich worlds (noir / coast-storm) look exactly as they will when
 * published. Opened from the editor's "Full preview →" button.
 */
export default function LivingPreview() {
  const [scene, setScene] = useState<LivingScene | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lp-living");
      if (!raw) return;
      const d = JSON.parse(raw) as { text: string; title?: string; eyebrow?: string; world?: WorldKey };
      if (d.text?.trim()) {
        setScene(castLivingScene(d.text, { title: d.title, eyebrow: d.eyebrow, world: d.world }));
      }
    } catch { /* nothing to preview */ }
  }, []);

  if (!scene) {
    return (
      <main style={{ maxWidth: 520, margin: "20vh auto", padding: "0 1.4rem", fontFamily: "system-ui, sans-serif", color: "#555", textAlign: "center" }}>
        Nothing to preview yet. Write a story in the editor and press <b>Full preview →</b>.
      </main>
    );
  }
  if (scene.world.key === "noir-room") return <NoirRoom {...noirRoomInput(scene)} />;
  if (RICH_WORLDS.has(scene.world.key)) return <CoastStorm {...coastStormInput(scene)} />;
  return <LivingStory scene={scene} />;
}
