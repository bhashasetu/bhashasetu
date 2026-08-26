import type { Metadata } from "next";
import { Geist_Mono, Inter, Poppins } from "next/font/google";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

// Display face for headings and the wordmark; body face for running text.
const poppins = Poppins({
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Without metadataBase, relative canonical and Open Graph URLs are dropped
  // rather than resolved, so every page's generateMetadata needs this set.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Bhasha Setu",
    template: "%s | Bhasha Setu",
  },
  description: "Learn Warli and Katkari",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
