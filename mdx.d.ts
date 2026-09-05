/**
 * A compiled story is only a component now. Its metadata lives in the
 * frontmatter and is read off the filesystem by lib/stories.ts, so nothing
 * imports it from the module any more.
 */
declare module "*.mdx" {
  const Component: React.ComponentType<Record<string, unknown>>;
  export default Component;
}
