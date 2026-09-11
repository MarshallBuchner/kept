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
      <p className="mt-2 text-[13px] text-muted">Last updated: September 11, 2026</p>

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
            via a Stripe subscription (shown in CAD on checkout). When online, free limits are also
            metered on our servers (device/network fingerprint) so deleting and re-adding the home-screen
            app does not reset them. Offline use still meters on-device until the next sync.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold">Billing and cancellation</h2>
          <p className="mt-2 text-muted">
            Kept Pro is billed through Stripe on the plan you choose (monthly or yearly). You can
            cancel anytime in the Stripe customer portal or by emailing{" "}
            <a className="text-accent underline" href="mailto:keptscan@gmail.com">
              keptscan@gmail.com
            </a>
            ; access continues through the end of the paid period. For refund questions during beta,
            contact that address — we review case by case.
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
