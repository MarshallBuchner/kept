import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for Kept.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-full w-full max-w-[430px] bg-paper px-5 pb-16 pt-6 text-ink">
      <Link href="/settings" className="text-[14px] font-medium text-accent">
        ← Settings
      </Link>
      <h1 className="mt-6 text-[28px] font-bold tracking-tight">Terms of use</h1>
      <p className="mt-2 text-[13px] text-muted">Last updated: September 13, 2026</p>

      <div className="mt-8 space-y-6 text-[14px] leading-6 text-ink">
        <section>
          <h2 className="text-[16px] font-semibold">The service</h2>
          <p className="mt-2 text-muted">
            Kept helps you scan receipts and documents, clean extracted text, and keep files on your
            device. Features may change while we are in beta.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold">Free and Pro</h2>
          <p className="mt-2 text-muted">
            Free use includes limited scans and PDF exports per month. Kept Pro unlocks higher limits
            on a monthly or yearly plan (prices shown in CAD where applicable). When online, free
            limits are also metered on our servers (device/network fingerprint) so deleting and
            re-adding the home-screen app does not reset them. Offline use still meters on-device
            until the next sync.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold">Billing and cancellation</h2>
          <p className="mt-2 text-muted">
            <strong className="font-semibold text-ink">Website:</strong> Kept Pro is billed through
            Stripe on the plan you choose. You can cancel in the Stripe customer portal or by
            emailing{" "}
            <a className="text-accent underline" href="mailto:keptscan@gmail.com">
              keptscan@gmail.com
            </a>
            ; access continues through the end of the paid period.
          </p>
          <p className="mt-2 text-muted">
            <strong className="font-semibold text-ink">iOS app:</strong> Kept Pro is an
            auto-renewable App Store subscription purchased with your Apple ID (StoreKit). Payment
            is charged to your Apple ID account at confirmation of purchase. Subscriptions renew
            automatically unless cancelled at least 24 hours before the end of the current period.
            Manage or cancel anytime in iPhone{" "}
            <strong className="font-semibold text-ink">Settings → Apple ID → Subscriptions</strong>.
            Stripe checkout is not used inside the iOS app.
          </p>
          <p className="mt-2 text-muted">
            For refund questions during beta, contact{" "}
            <a className="text-accent underline" href="mailto:keptscan@gmail.com">
              keptscan@gmail.com
            </a>{" "}
            — we review case by case. Apple may also handle App Store refund requests under Apple’s
            policies.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold">Your content</h2>
          <p className="mt-2 text-muted">
            You are responsible for the documents you scan and how you use exported files. OCR can
            make mistakes — always review totals and line items before relying on them for taxes or
            expenses.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold">No warranties</h2>
          <p className="mt-2 text-muted">
            Kept is provided as-is during beta. We do not guarantee uninterrupted service or perfect
            extraction accuracy.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold">Contact</h2>
          <p className="mt-2 text-muted">
            <a className="text-accent underline" href="mailto:keptscan@gmail.com">
              keptscan@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
