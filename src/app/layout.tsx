import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const keptSans = Inter({
  variable: "--font-kept-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kept — Scan it. Clean it. Keep it.",
  description: "Turn messy receipts and documents into clean, organized files in seconds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#516a57",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${keptSans.variable} h-full antialiased`}>
      <body className={`${keptSans.className} min-h-full bg-paper text-ink`}>{children}</body>
    </html>
  );
}
