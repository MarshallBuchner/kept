"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import {
  FREE_EXPORTS_PER_MONTH,
  FREE_SCANS_PER_MONTH,
  getUsage,
} from "@/lib/billing";
import { startProCheckout } from "@/lib/checkout";

export type PaywallReason = "scan_limit" | "export_limit" | "upgrade";

export function PaywallSheet({
  reason,
  onClose,
  onUnlocked,
}: {
  reason: PaywallReason;
  onClose: () => void;
  onUnlocked?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usage = getUsage();

  useEffect(() => {
    track("paywall_viewed", { reason, scans: usage.scans, exports: usage.exports });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per open
  }, [reason]);

  const headline =
    reason === "scan_limit"
      ? "You've used this month's free scans"
      : reason === "export_limit"
        ? "Free PDF export used for this month"
        : "Upgrade to Kept Pro";

  const detail =
    reason === "scan_limit"
      ? `Free includes ${FREE_SCANS_PER_MONTH} scans / month. Pro unlocks unlimited scanning and exports.`
      : reason === "export_limit"
        ? `Free includes ${FREE_EXPORTS_PER_MONTH} PDF export / month. Pro unlocks unlimited exports.`
        : "Unlimited scans, unlimited PDF exports, and the full Kept toolkit.";

  async function upgrade() {
    setBusy(true);
    setError(null);
    const result = await startProCheckout();
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Checkout failed.");
      return;
    }
    if (result.message === "demo") {
      onUnlocked?.();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 print:hidden">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Dismiss" onClick={onClose} />
      <div className="relative w-full max-w-[430px] rounded-t-[22px] bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-lg">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-rule" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Kept Pro</p>
        <h2 className="mt-2 text-[20px] font-semibold text-ink">{headline}</h2>
        <p className="mt-2 text-[14px] leading-5 text-muted">{detail}</p>

        <ul className="mt-4 space-y-2 text-[14px] text-ink">
          <li className="flex gap-2">
            <span className="text-accent">✓</span> Unlimited scans
          </li>
          <li className="flex gap-2">
            <span className="text-accent">✓</span> Unlimited itemized + photo PDFs
          </li>
          <li className="flex gap-2">
            <span className="text-accent">✓</span> Priority extraction improvements
          </li>
        </ul>

        <p className="mt-4 text-[13px] text-muted">
          This month on Free: {usage.scans}/{FREE_SCANS_PER_MONTH} scans · {usage.exports}/
          {FREE_EXPORTS_PER_MONTH} exports
        </p>

        {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => void upgrade()}
          className="mt-4 w-full rounded-[16px] bg-accent px-4 py-[15px] text-[16px] font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Starting checkout…" : "Upgrade to Pro"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-[14px] bg-chip px-4 py-3 text-[15px] font-medium text-ink"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
