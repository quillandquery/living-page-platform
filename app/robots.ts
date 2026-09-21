import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * SEO strategy doc, phase 1 item 3. Everything a reader or a search engine
 * should never land on: auth flows, the writer's own desk and editor, and
 * a couple of internal dev-preview routes (`/looks`, `/preview-tile`) that
 * exist only for building the format system, never as real content.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dev", "/dev/*",
        "/write", "/write/*",
        "/make",
        "/login", "/signup", "/onboarding", "/settings",
        "/auth", "/auth/*",
        "/looks",
        "/preview-tile",
        // An unchromed, per-story render target for the share-image
        // capture worker (Module 4 share/OG rework) — never a page a
        // reader or a search engine should land on.
        "/render", "/render/*",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
