import type { Metadata } from "next";
import Script from "next/script";
import { Newsreader, Instrument_Serif, Caveat, Space_Mono } from "next/font/google";
import "./globals.css";
import { metadataBaseUrl, SITE_NAME } from "@/lib/site";
import { GA_MEASUREMENT_ID } from "@/lib/analytics/ga";
import { Providers } from "./providers";

const body = Newsreader({ subsets: ["latin"], weight: ["200", "300", "400", "500"], style: ["normal", "italic"], variable: "--font-body", display: "swap" });
const disp = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-disp", display: "swap" });
const hand = Caveat({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-hand", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap" });

/**
 * ROOT METADATA — the repositioned copy (Decision D3: Living Page is a
 * general storytelling product; travel stories are the flagship EXAMPLE
 * content, not the product's identity). Before this, the site-wide title
 * and description still shipped the pre-repositioning "a place for travel
 * writing" copy, which is what Google indexes for any page that sets
 * nothing of its own (SEO strategy doc, finding #1).
 *
 * `metadataBase` (finding #2) is what lets every other page's relative OG
 * image / canonical URL resolve to an absolute one — without it, social
 * previews in Slack/iMessage/WhatsApp/X silently break.
 *
 * The `title.template` lets a leaf page set just its own bare title
 * (`"I hated Paris"`) and get "I hated Paris — Living Page" for free,
 * instead of every page hand-appending the site name — see `lib/metadata.ts`
 * and the module's "do not duplicate metadata logic across files" rule.
 */
export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: {
    default: "Living Page — A new way to tell a story",
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "You have a story. It shouldn't look like a blog post. Write it normally — Living Page works out the typography, motion and colour it wants, automatically.",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${disp.variable} ${hand.variable} ${mono.variable}`}>
      <body>
        {/* Google Analytics — a silent no-op when NEXT_PUBLIC_GA_MEASUREMENT_ID
            isn't set, same "optional, unset in local dev/CI" pattern as the
            PostHog init in lib/analytics/client.ts. Loaded with next/script's
            afterInteractive strategy (Next's recommended approach for
            analytics tags) rather than a raw <script> in <head>, so it never
            blocks hydration. Route-change pageviews for the App Router are
            fired separately from app/providers.tsx (see GaPageview there) —
            this only covers the very first page load. */}
        {GA_MEASUREMENT_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        ) : null}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
