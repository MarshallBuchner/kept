"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PaywallSheet } from "@/components/PaywallSheet";
import { LogoMark } from "@/components/Logo";
import { feedbackSummary } from "@/lib/feedback";
import {
  FREE_EXPORTS_PER_MONTH,
  FREE_SCANS_PER_MONTH,
  clearPro,
  getPro,
  getUsage,
  isPro,
  planLabel,
  refreshUsageFromServer,
} from "@/lib/billing";
import { confirmCheckoutSession, redeemLifetimePromo } from "@/lib/checkout";
import { loadDocs, saveDocs } from "@/lib/storage";

export function SettingsScreen() {
  const searchParams = useSearchParams();
  const [count, setCount] = useState(0);
  const [feedback, setFeedback] = useState({ total: 0, confirmed: 0, needsFix: 0 });
  const [usage, setUsage] = useState(getUsage());
  const [pro, setProState] = useState(getPro());
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [checkoutNote, setCheckoutNote] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  function refreshBilling() {
    setUsage(getUsage());
    setProState(getPro());
  }

  useEffect(() => {
    setCount(loadDocs().length);
    setFeedback(feedbackSummary());
    refreshBilling();
    void refreshUsageFromServer().then(() => refreshBilling());
  }, []);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    if (checkout === "cancel") {
      setCheckoutNote("Checkout canceled — you can upgrade anytime.");
      return;
    }
    if (checkout === "success" && sessionId) {
      void (async () => {
        const ok = await confirmCheckoutSession(sessionId);
        refreshBilling();
        setCheckoutNote(ok ? "Welcome to Kept Pro — unlimited scans & exports." : "Could not confirm payment yet. Refresh in a moment.");
      })();
    }
  }, [searchParams]);

  function clearArchive() {
    if (!window.confirm("Delete every kept document on this device?")) return;
    saveDocs([]);
    setCount(0);
  }

  async function applyPromo() {
    setPromoBusy(true);
    setPromoError(null);
    const result = await redeemLifetimePromo(promoCode);
    setPromoBusy(false);
    if (!result.ok) {
      setPromoError(result.message ?? "Invalid code.");
      return;
    }
    setPromoCode("");
    refreshBilling();
    setCheckoutNote("Lifetime Pro unlocked on this device — no paywall.");
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-4 pt-3 animate-fade-up">
      <header>
        <h1 className="text-center text-[20px] font-semibold">Settings</h1>
      </header>

      {checkoutNote ? (
        <p className="rounded-[14px] bg-accent-soft px-4 py-3 text-[13px] text-accent-strong">{checkoutNote}</p>
      ) : null}

      <section className="rounded-[18px] bg-card p-5 ring-1 ring-rule">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Plan</p>
            <h2 className="mt-1 text-[18px] font-semibold">{planLabel()}</h2>
            <p className="mt-1 text-[13px] text-muted">
              {isPro()
                ? pro.source === "promo"
                  ? "Lifetime access on this device — scans & exports unlimited."
                  : "Unlimited scans and PDF exports on this device."
                : `${usage.scans}/${FREE_SCANS_PER_MONTH} scans · ${usage.exports}/${FREE_EXPORTS_PER_MONTH} exports this month`}
            </p>
            {!isPro() ? (
              <p className="mt-2 text-[12px] text-muted">
                Free limits sync online so clearing the home-screen app doesn&apos;t reset them.
              </p>
            ) : null}
          </div>
          {!isPro() ? (
            <button
              type="button"
              onClick={() => setPaywallOpen(true)}
              className="shrink-0 rounded-full bg-accent px-3 py-2 text-[13px] font-semibold text-white"
            >
              Upgrade
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Remove Pro on this device? (Testing only)")) {
                  clearPro();
                  refreshBilling();
                }
              }}
              className="shrink-0 rounded-full bg-chip px-3 py-2 text-[12px] font-medium text-muted"
            >
              {pro.source === "demo"
                ? "Clear demo Pro"
                : pro.source === "promo"
                  ? "Clear lifetime"
                  : "Pro"}
            </button>
          )}
        </div>

        {!isPro() ? (
          <div className="mt-4 border-t border-rule pt-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
              Promo code
            </p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void applyPromo();
                }}
                placeholder="Enter code"
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
            {promoError ? <p className="mt-2 text-[12px] text-danger">{promoError}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-[18px] bg-card p-5 ring-1 ring-rule">
        <div className="flex items-center gap-3">
          <LogoMark size={48} />
          <div>
            <p className="text-[16px] font-semibold">Kept</p>
            <p className="text-[13px] text-muted">Preferences & help</p>
          </div>
        </div>
        <dl className="mt-5 space-y-3 text-[14px]">
          <div className="flex justify-between border-t border-rule pt-3">
            <dt className="text-muted">Documents on device</dt>
            <dd className="font-medium">{count}</dd>
          </div>
          <div className="flex justify-between border-t border-rule pt-3">
            <dt className="text-muted">Account</dt>
            <dd className="font-medium">Local only</dd>
          </div>
          <div className="flex justify-between border-t border-rule pt-3">
            <dt className="text-muted">OCR</dt>
            <dd className="font-medium">On-device</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[18px] bg-card p-5 ring-1 ring-rule">
        <h2 className="text-[15px] font-semibold">Beta accuracy checks</h2>
        <p className="mt-2 text-[13px] leading-5 text-muted">
          After each scan, “Looks right” / “Fix this” is saved on this device only.
        </p>
        <dl className="mt-4 space-y-3 text-[14px]">
          <div className="flex justify-between border-t border-rule pt-3">
            <dt className="text-muted">Checks logged</dt>
            <dd className="font-medium">{feedback.total}</dd>
          </div>
          <div className="flex justify-between border-t border-rule pt-3">
            <dt className="text-muted">Looks right</dt>
            <dd className="font-medium text-accent">{feedback.confirmed}</dd>
          </div>
          <div className="flex justify-between border-t border-rule pt-3">
            <dt className="text-muted">Needed a fix</dt>
            <dd className="font-medium">{feedback.needsFix}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[18px] bg-card p-5 ring-1 ring-rule">
        <h2 className="text-[15px] font-semibold">Privacy</h2>
        <p className="mt-2 text-[14px] leading-6 text-muted">
          Photos and extracted text stay on this device. Payments go through Stripe. Hosted analytics
          / ad pixels may measure visits and upgrades — details in Privacy.
        </p>
        <div className="mt-4 flex gap-4 text-[14px] font-medium">
          <Link href="/privacy" className="text-accent">
            Privacy
          </Link>
          <Link href="/terms" className="text-accent">
            Terms
          </Link>
        </div>
      </section>

      <button
        type="button"
        onClick={clearArchive}
        className="rounded-[16px] bg-chip px-4 py-3 text-[14px] font-medium text-danger"
      >
        Clear local archive
      </button>

      {paywallOpen ? (
        <PaywallSheet
          reason="upgrade"
          onClose={() => {
            setPaywallOpen(false);
            refreshBilling();
          }}
          onUnlocked={() => {
            setPaywallOpen(false);
            refreshBilling();
            setCheckoutNote("Kept Pro unlocked on this device.");
          }}
        />
      ) : null}
    </div>
  );
}
