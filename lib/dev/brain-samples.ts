import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { VisualProfile } from "@/lib/art-direction/from-visual-profile";
import type { SceneGraph } from "@/lib/art-direction/scene-to-blocks";

/**
 * DEV ONLY — bridges the standalone Python brain to the renderer.
 *
 * The brain writes one VisualProfile JSON per story into `brain/out/<key>.json`
 * (see `python run.py --file samples/*.txt --out out/`). The source prose lives
 * beside it in `brain/samples/<key>.txt`. This reads both off disk so the
 * `/brain-test` route can render a real page from the brain's output without a
 * database or a running Python process.
 */

const BRAIN = path.join(process.cwd(), "brain");
const OUT = path.join(BRAIN, "out");
const SAMPLES = path.join(BRAIN, "samples");
const SCENES = path.join(BRAIN, "scenes");

export type BrainSample = { key: string; text: string; profile: VisualProfile };

export async function listBrainSamples(): Promise<string[]> {
  let jsons: string[] = [];
  try {
    jsons = (await fs.readdir(OUT)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const keys: string[] = [];
  for (const j of jsons) {
    const key = j.replace(/\.json$/, "");
    try {
      await fs.access(path.join(SAMPLES, `${key}.txt`));
      keys.push(key);
    } catch {
      /* no matching source text — skip */
    }
  }
  return keys.sort();
}

export async function loadBrainSample(key: string): Promise<BrainSample | null> {
  if (!/^[\w-]+$/.test(key)) return null; // no path traversal
  try {
    const [raw, prof] = await Promise.all([
      fs.readFile(path.join(SAMPLES, `${key}.txt`), "utf8"),
      fs.readFile(path.join(OUT, `${key}.json`), "utf8"),
    ]);
    return { key, text: raw.trim(), profile: JSON.parse(prof) as VisualProfile };
  } catch {
    return null;
  }
}

/** The per-beat scene graph, if `python run.py --scene --out scenes/` has been
 *  run for this key. Null when it hasn't. */
export async function loadScene(key: string): Promise<SceneGraph | null> {
  if (!/^[\w-]+$/.test(key)) return null;
  try {
    const json = await fs.readFile(path.join(SCENES, `${key}.json`), "utf8");
    return JSON.parse(json) as SceneGraph;
  } catch {
    return null;
  }
}
