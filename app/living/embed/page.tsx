"use client";

/**
 * LIVING EMBED — the real living page, in an iframe.
 *
 * The make canvas and the studio preview embed THIS route. Because it is its own
 * document, the bespoke worlds (CoastStorm, NoirRoom) and the generic
 * LivingStory render at full fidelity — their viewport-fraction layers, fixed
 * positioning and scroll-driven arc all work against the iframe's own viewport,
 * so a story that casts to coast-storm shows the real coast-storm, not a
 * degraded generic substitute. The parent posts the draft; we re-cast and
 * re-render. Same-origin only.
 */

import { useEffect, useState } from "react";
import { LivingStory } from "@/components/living/LivingStory";
import { NoirRoom } from "@/components/living/scenes/NoirRoom";
import { CoastStorm } from "@/components/living/scenes/CoastStorm";
import { Maximalist } from "@/components/living/mediums/Maximalist";
import { Postcard } from "@/components/living/mediums/Postcard";
import { EvidenceBoard } from "@/components/living/mediums/EvidenceBoard";
import { Manuscript } from "@/components/living/mediums/Manuscript";
import { castLivingScene, coastStormInput, noirRoomInput, maximalistInput, postcardInput, evidenceInput, manuscriptInput, RICH_WORLDS, MEDIUMS, type LivingScene } from "@/lib/living/cast";
import { WORLDS, type WorldKey } from "@/lib/living/worlds";

type PaletteMsg = { scheme?: "light" | "dark"; ground?: string; accent?: string; warm?: string };
type Msg = { type: "lp-embed"; text?: string; title?: string; eyebrow?: string; world?: string; palette?: PaletteMsg };

export default function LivingEmbed() {
  const [scene, setScene] = useState<LivingScene | null>(null);
  const [surface, setSurface] = useState<string | undefined>();
  const [palette, setPalette] = useState<PaletteMsg | undefined>();

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as Msg;
      if (!d || d.type !== "lp-embed") return;
      // `world` carries either a WorldKey (pin the world) or a medium key
      // (postcard, maximalist, …) — a different kind of surface.
      const medium = d.world && MEDIUMS.has(d.world) ? d.world : undefined;
      const world = d.world && d.world in WORLDS ? (d.world as WorldKey) : undefined;
      setSurface(medium);
      setPalette(d.palette);
      setScene(
        d.text && d.text.trim()
          ? castLivingScene(d.text, { title: d.title || undefined, eyebrow: d.eyebrow || undefined, world })
          : null,
      );
    };
    window.addEventListener("message", onMsg);
    // tell the parent we're ready to receive the draft
    try { window.parent?.postMessage("lp-embed-ready", window.location.origin); } catch {}
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const render = () => {
    if (!scene) return (
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,.4)", fontFamily: "var(--font-mono), ui-monospace, monospace",
        fontSize: ".72rem", letterSpacing: ".1em", textTransform: "uppercase", textAlign: "center", padding: "0 2rem" }}>
        your living page appears here
      </div>
    );
    if (surface === "maximalist") return <Maximalist {...maximalistInput(scene)} />;
    if (surface === "postcard") return <Postcard {...postcardInput(scene)} />;
    if (surface === "evidence") return <EvidenceBoard {...evidenceInput(scene)} />;
    if (surface === "manuscript") return <Manuscript {...manuscriptInput(scene)} />;
    if (scene.world.key === "noir-room") return <NoirRoom {...noirRoomInput(scene)} />;
    if (RICH_WORLDS.has(scene.world.key)) return <CoastStorm {...coastStormInput(scene)} />;
    return <LivingStory scene={scene} palette={palette} />;
  };

  return (
    <>
      <style>{"html,body{margin:0;padding:0;background:#0a0912;min-height:100vh}"}</style>
      {render()}
    </>
  );
}
