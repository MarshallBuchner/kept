import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TikTokAttributionCapture } from "@/components/TikTokAttributionCapture";
import { TikTokPixel } from "@/components/TikTokPixel";
import "./globals.css";

const keptSans = Inter({
  variable: "--font-kept-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://kept-eosin.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kept — Scan it. Clean it. Keep it.",
    template: "%s · Kept",
  },
  description: "Turn messy receipts and documents into clean, organized files in seconds.",
  applicationName: "Kept",
  keywords: ["receipt scanner", "PDF export", "expense receipts", "document OCR", "Kept"],
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: "/",
    siteName: "Kept",
    title: "Kept — Scan it. Clean it. Keep it.",
    description: "Turn messy receipts and documents into clean, organized files in seconds.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Kept — Scan it. Clean it. Keep it." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kept — Scan it. Clean it. Keep it.",
    description: "Turn messy receipts and documents into clean, organized files in seconds.",
    images: ["/og.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Kept",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/kept-mark.svg?v=2", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#516a57",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${keptSans.variable} h-full antialiased`}>
      <body className={`${keptSans.className} min-h-full bg-paper text-ink`}>
        {children}
        <Analytics />
        <SpeedInsights />
        <TikTokAttributionCapture />
        <TikTokPixel />
      </body>
    </html>
  );
}
