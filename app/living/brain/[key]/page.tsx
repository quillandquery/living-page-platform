import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { LivingStory } from "@/components/living/LivingStory";
import { CoastStorm } from "@/components/living/scenes/CoastStorm";
import { NoirRoom } from "@/components/living/scenes/NoirRoom";
import { livingSceneFromBrain, coastStormInput, noirRoomInput, RICH_WORLDS, type BrainScene } from "@/lib/living/cast";

/**
 * DEV ONLY — render a story the BRAIN cast (world chosen from the semantic
 * profile, not keyword cues). Generate with:
 *   cd brain && python cast.py --file samples/*.txt --out living/
 * then open /living/brain/<key>.
 */
export default async function BrainLiving({ params }: { params: Promise<{ key: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { key } = await params;
  if (!/^[\w-]+$/.test(key)) notFound();
  let json: string;
  try {
    json = await fs.readFile(path.join(process.cwd(), "brain", "living", `${key}.json`), "utf8");
  } catch {
    notFound();
  }
  const scene = livingSceneFromBrain(JSON.parse(json) as BrainScene);
  if (scene.world.key === "noir-room") return <NoirRoom {...noirRoomInput(scene)} />;
  if (RICH_WORLDS.has(scene.world.key)) return <CoastStorm {...coastStormInput(scene)} />;
  return <LivingStory scene={scene} />;
}
