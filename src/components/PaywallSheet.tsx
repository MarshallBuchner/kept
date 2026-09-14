"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import {
  FREE_EXPORTS_PER_MONTH,
  FREE_SCANS_PER_MONTH,
  getUsage,
} from "@/lib/billing";
import { startProCheckout, redeemLifetimePromo, type CheckoutPlan } from "@/lib/checkout";
import {
  loadIapProducts,
  manageProSubscriptions,
  restoreProIap,
  type IapProductInfo,
} from "@/lib/iap";
import { isNativeIOS } from "@/lib/platform";

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
  const nativeIOS = isNativeIOS();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<CheckoutPlan>("yearly");
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [iapProducts, setIapProducts] = useState<IapProductInfo[]>([]);
  const [iapLoading, setIapLoading] = useState(nativeIOS);
  const usage = getUsage();

  useEffect(() => {
    track("paywall_viewed", {
      reason,
      scans: usage.scans,
      exports: usage.exports,
      rail: nativeIOS ? "iap" : "stripe",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per open
  }, [reason]);

  useEffect(() => {
    if (!nativeIOS) return;
    let cancelled = false;
    void (async () => {
      setIapLoading(true);
      const result = await loadIapProducts();
      if (cancelled) return;
      setIapLoading(false);
      if (!result.ok) {
        setError(result.message ?? "Could not load App Store prices.");
        return;
      }
      setIapProducts(result.products);
      if (result.products.some((p) => p.plan === "yearly")) setPlan("yearly");
      else if (result.products[0]) setPlan(result.products[0].plan);
    })();
    return () => {
      cancelled = true;
    };
  }, [nativeIOS]);

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

  function priceFor(planChoice: CheckoutPlan, fallback: string): string {
    const fromStore = iapProducts.find((p) => p.plan === planChoice)?.priceString;
    return fromStore || fallback;
  }

  async function upgrade() {
    setBusy(true);
    setError(null);
    const result = await startProCheckout(plan);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Checkout failed.");
      return;
    }
    // Stripe redirects away; demo + IAP unlock in-place.
    if (result.message === "demo" || result.message === "iap") {
      onUnlocked?.();
      onClose();
    }
  }

  async function restore() {
    setBusy(true);
    setError(null);
    const result = await restoreProIap();
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Restore failed.");
      return;
    }
    onUnlocked?.();
    onClose();
  }

  async function applyPromo() {
    setPromoBusy(true);
    setError(null);
    const result = await redeemLifetimePromo(promoCode);
    setPromoBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Invalid code.");
      return;
    }
    onUnlocked?.();
    onClose();
  }

  const yearlyPrice = priceFor("yearly", "CA$19.99");
  const monthlyPrice = priceFor("monthly", "CA$2.99");
  const ctaBusyLabel = nativeIOS ? "Contacting App Store…" : "Starting checkout…";
  const ctaLabel =
    plan === "yearly" ? `Upgrade · ${yearlyPrice}/yr` : `Upgrade · ${monthlyPrice}/mo`;

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

        <div className="mt-4 grid grid-cols-2 gap-2">
          <PlanChoice
            title="Yearly"
            price={iapLoading ? "…" : yearlyPrice}
            detail="Best value · billed yearly"
            selected={plan === "yearly"}
            onSelect={() => setPlan("yearly")}
          />
          <PlanChoice
            title="Monthly"
            price={iapLoading ? "…" : monthlyPrice}
            detail="Billed every month"
            selected={plan === "monthly"}
            onSelect={() => setPlan("monthly")}
          />
        </div>

        <p className="mt-4 text-[13px] text-muted">
          This month on Free: {usage.scans}/{FREE_SCANS_PER_MONTH} scans · {usage.exports}/
          {FREE_EXPORTS_PER_MONTH} exports
        </p>
        {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}

        <button
          type="button"
          disabled={busy || iapLoading || (nativeIOS && iapProducts.length === 0)}
          onClick={() => void upgrade()}
          className="mt-4 w-full rounded-[16px] bg-accent px-4 py-[15px] text-[16px] font-semibold text-white disabled:opacity-60"
        >
          {busy ? ctaBusyLabel : ctaLabel}
        </button>

        {nativeIOS ? (
          <>
            <p className="mt-3 text-[11px] leading-4 text-muted">
              Kept Pro {plan === "yearly" ? "Yearly" : "Monthly"} is an auto-renewable subscription
              ({plan === "yearly" ? `${yearlyPrice} / year` : `${monthlyPrice} / month`}). Payment is
              charged to your Apple ID at confirmation. The subscription renews automatically unless
              cancelled at least 24 hours before the period ends. Manage or cancel in Settings →
              Apple ID → Subscriptions.{" "}
              <Link href="/terms" className="text-accent underline-offset-2 hover:underline">
                Terms
              </Link>
              {" · "}
              <Link href="/privacy" className="text-accent underline-offset-2 hover:underline">
                Privacy
              </Link>
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void restore()}
              className="mt-2 w-full py-2 text-[13px] font-medium text-muted underline-offset-2 hover:underline disabled:opacity-50"
            >
              Restore purchases
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  const result = await manageProSubscriptions();
                  if (!result.ok) {
                    setError(result.message ?? "Could not open subscription settings.");
                  }
                })();
              }}
              className="mt-1 w-full py-2 text-[13px] font-medium text-muted underline-offset-2 hover:underline disabled:opacity-50"
            >
              Manage subscription
            </button>
          </>
        ) : null}

        {!showPromo ? (
          <button
            type="button"
            onClick={() => setShowPromo(true)}
            className="mt-2 w-full py-2 text-[13px] font-medium text-muted underline-offset-2 hover:underline"
          >
            Have a promo code?
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-[12px] text-muted">
              {nativeIOS
                ? "Owner / staff lifetime codes apply here in Kept."
                : "Apply it here — not on the Stripe checkout page."}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void applyPromo();
                }}
                placeholder="Promo code"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-[12px] bg-chip px-3 py-2.5 text-[14px] text-ink outline-none ring-1 ring-rule focus:ring-accent"
              />
              <button
                type="button"
                disabled={promoBusy || !promoCode.trim()}
                onClick={() => void applyPromo()}
                className="shrink-0 rounded-[12px] bg-ink px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {promoBusy ? "…" : "Apply"}
              </button>
            </div>
          </div>
        )}

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

function PlanChoice({
  title,
  price,
  detail,
  selected,
  onSelect,
}: {
  title: string;
  price: string;
  detail: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-[14px] px-3 py-3 text-left ring-1 transition-colors ${
        selected ? "bg-accent-soft ring-accent" : "bg-chip/60 ring-rule"
      }`}
    >
      <p className={`text-[13px] font-semibold ${selected ? "text-accent" : "text-ink"}`}>{title}</p>
      <p className="mt-0.5 text-[16px] font-semibold text-ink">{price}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-muted">{detail}</p>
    </button>
  );
}
