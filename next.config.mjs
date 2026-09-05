import createMDX from "@next/mdx";
import remarkFrontmatter from "remark-frontmatter";

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
};

/**
 * remark-frontmatter only teaches the parser to recognise the `---` block so
 * it stops being part of the document. Nothing exports it: the metadata is
 * read off the filesystem by lib/stories.ts. Without this the fence would
 * parse as an <hr>, and mdx-components.tsx turns an <hr> into a two-beat
 * silence — every story would open on a pause it never asked for.
 */
const withMDX = createMDX({ options: { remarkPlugins: [remarkFrontmatter] } });

export default withMDX(nextConfig);
