import type { MDXComponents } from "mdx/types";
import { Beat } from "@/components/living/Beat";
import { Speak, Whisper, Shout, Thought, Drift, Listen, Echo, Ledger } from "@/components/living/voices";
import { Scene, StoryH2, Hold, Margin } from "@/components/living/Scene";
import { Mark, Press, Drag } from "@/components/living/Marks";

/**
 * The whole point of the MDX layer: a bare paragraph is already a beat,
 * in the SPEAK voice. Prose reads as prose in the source file, and only
 * the lines that need a different voice get wrapped — which is what
 * keeps the animation ratio (README, "Animation ratio") a default rather
 * than a discipline.
 *
 * Every vocabulary component is in scope automatically, so a story file
 * opens with writing rather than a stack of imports.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    p: ({ children }) => <Speak>{children}</Speak>,
    h2: ({ children }) => <StoryH2>{children}</StoryH2>,
    hr: () => <Hold beats={2} />,
    em: ({ children }) => <em>{children}</em>,
    Beat, Speak, Whisper, Shout, Thought, Drift, Listen, Echo, Ledger,
    Scene, Hold, Margin, Mark, Press, Drag,
    ...components,
  };
}
