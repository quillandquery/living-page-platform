/** @type {import('next').NextConfig} */
const nextConfig = {
  // Stories are rows now, rendered at request time from their blocks, so the
  // app no longer compiles .mdx files and needs no MDX loader.

  // The share/OG image routes read vendored .ttf bytes off disk
  // (lib/share-fonts). Trace them into every route bundle so the files
  // exist in the serverless function at render time.
  outputFileTracingIncludes: {
    "/**": ["./lib/share-fonts/**"],
  },
};

export default nextConfig;
