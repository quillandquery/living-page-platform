import { notFound } from "next/navigation";
import { LivingStory } from "@/components/living/LivingStory";
import { castLivingScene } from "@/lib/living/cast";
import { getLivingDemo } from "@/lib/dev/living-demos";

/**
 * DEV ONLY — a story rendered as a living page through the NEW path:
 *   raw text → castLivingScene() → LivingStory
 * No annotate (no 70% cap), no Look system, no legacy StoryView. This is the
 * living-page design language (D9) running in the product.
 */
export default async function LivingDemoPage({ params }: { params: Promise<{ key: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { key } = await params;
  const demo = getLivingDemo(key);
  if (!demo) notFound();

  const scene = castLivingScene(demo.text, {
    eyebrow: demo.eyebrow,
    title: demo.title,
    world: demo.world,
  });

  return <LivingStory scene={scene} />;
}
