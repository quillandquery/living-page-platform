import { readFileSync, readdirSync } from "node:fs";
import { artDirectionFromVisualProfile, describeVisualDecision } from "../lib/art-direction/from-visual-profile";
import { describeArtDirection } from "../lib/art-direction/generate";

for (const j of readdirSync("brain/out").filter(f => f.endsWith(".json")).sort()) {
  const key = j.replace(/\.json$/, "");
  const vp = JSON.parse(readFileSync(`brain/out/${j}`, "utf8"));
  const text = readFileSync(`brain/samples/${key}.txt`, "utf8").trim();
  const ad = artDirectionFromVisualProfile(vp, text);
  console.log("\n==================== " + key + " ====================");
  console.log(describeVisualDecision(vp));
  console.log("----");
  console.log(describeArtDirection(ad));
}
