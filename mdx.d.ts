declare module "*.mdx" {
  import type { StoryMeta } from "@/lib/vocabulary";
  const Component: React.ComponentType<Record<string, unknown>>;
  export const meta: StoryMeta;
  export default Component;
}
