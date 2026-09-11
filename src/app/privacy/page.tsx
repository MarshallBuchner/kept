import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Kept handles photos, OCR text, billing, and analytics.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-full w-full max-w-[430px] bg-paper px-5 pb-16 pt-6 text-ink">
      <Link href="/settings" className="text-[14px] font-medium text-accent">
        ← Settings
      </Link>
      <h1 className="mt-6 text-[28px] font-bold tracking-tight">Privacy</h1>
      <p className="mt-2 text-[13px] text-muted">Last updated: September 11, 2026</p>

      <div className="mt-8 space-y-6 text-[14px] leading-6 text-ink">
        <section>
          <h2 className="text-[16px] font-semibold">What Kept does on your device</h2>
          <p className="mt-2 text-muted">
            Kept is built local-first. Receipt photos, OCR text, notes, and your document archive are
            processed and stored on this device (browser storage). We do not operate a Kept account
            database for your scans today.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold">Payments</h2>
          <p className="mt-2 text-muted">
            If you upgrade to Kept Pro, payment is handled by Stripe. Card details go to Stripe, not
            Kept servers. Stripe may process your email and payment metadata under their privacy
            policy.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold">Analytics</h2>
          <p className="mt-2 text-muted">
            On our hosted site we may use Vercel Analytics / Speed Insights for traffic and
            performance. If advertising is enabled, we may also load a TikTok Pixel (or similar) to
            measure ad results such as visits, paywall views, and completed checkouts. These tools
            can use cookies or device identifiers.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold">What we don’t sell</h2>
          <p className="mt-2 text-muted">
            We do not sell your receipt contents. Scans stay on-device unless you export/share them
            yourself.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold">Contact</h2>
          <p className="mt-2 text-muted">
            Questions:{" "}
            <a className="text-accent underline" href="mailto:keptscan@gmail.com">
              keptscan@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
