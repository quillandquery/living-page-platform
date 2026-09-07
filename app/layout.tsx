import type { Metadata } from "next";
import { Newsreader, Instrument_Serif, Caveat, Space_Mono } from "next/font/google";
import "./globals.css";

const body = Newsreader({ subsets: ["latin"], weight: ["200", "300", "400", "500"], style: ["normal", "italic"], variable: "--font-body", display: "swap" });
const disp = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-disp", display: "swap" });
const hand = Caveat({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-hand", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "The Living Page",
  description: "A place for travel writing where the sentence decides how it looks, sounds and moves. Write plainly; it does the rest.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${disp.variable} ${hand.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
