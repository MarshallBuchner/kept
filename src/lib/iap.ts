import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";
import { track } from "@/lib/analytics";
import { clearPro, getPro, setPro } from "@/lib/billing";
import type { CheckoutPlan } from "@/lib/checkout";
import { isNativeIOS } from "@/lib/platform";

/**
 * Create these Auto-Renewable Subscriptions in App Store Connect
 * (Kept Scan → Monetization → Subscriptions) with the same product IDs.
 * Bundle ID: ca.keptapp.app
 */
export const IAP_PRODUCT_IDS = {
  monthly: "ca.keptapp.app.pro.monthly",
  yearly: "ca.keptapp.app.pro.yearly",
} as const;

export type IapProductInfo = {
  id: string;
  plan: CheckoutPlan;
  title: string;
  /** Localized price from StoreKit, e.g. "CA$2.99" */
  priceString: string;
};

function productIdForPlan(plan: CheckoutPlan): string {
  return plan === "yearly" ? IAP_PRODUCT_IDS.yearly : IAP_PRODUCT_IDS.monthly;
}

function planForProductId(productId: string): CheckoutPlan | null {
  if (productId === IAP_PRODUCT_IDS.yearly) return "yearly";
  if (productId === IAP_PRODUCT_IDS.monthly) return "monthly";
  return null;
}

function unlockFromIap(plan: CheckoutPlan, transactionId?: string) {
  setPro({
    source: "iap",
    sessionId: transactionId,
  });
  track("paid", {
    plan: plan === "yearly" ? "pro_yearly" : "pro_monthly",
    source: "iap",
  });
}

/** Load StoreKit products for the paywall (localized prices). */
export async function loadIapProducts(): Promise<{
  ok: boolean;
  products: IapProductInfo[];
  message?: string;
}> {
  if (!isNativeIOS()) {
    return { ok: false, products: [], message: "IAP is only available in the iOS app." };
  }

  try {
    const billing = await NativePurchases.isBillingSupported();
    if (!billing.isBillingSupported) {
      return {
        ok: false,
        products: [],
        message: "In-App Purchases aren’t available on this device.",
      };
    }

    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [IAP_PRODUCT_IDS.monthly, IAP_PRODUCT_IDS.yearly],
      productType: PURCHASE_TYPE.SUBS,
    });

    const mapped: IapProductInfo[] = [];
    for (const product of products) {
      const plan = planForProductId(product.identifier);
      if (!plan) continue;
      mapped.push({
        id: product.identifier,
        plan,
        title: product.title || (plan === "yearly" ? "Yearly" : "Monthly"),
        priceString: product.priceString || (plan === "yearly" ? "CA$19.99" : "CA$2.99"),
      });
    }

    if (mapped.length === 0) {
      return {
        ok: false,
        products: [],
        message:
          "Subscription products aren’t in App Store Connect yet (or this build isn’t signed for them).",
      };
    }

    mapped.sort((a, b) => Number(b.plan === "yearly") - Number(a.plan === "yearly"));
    return { ok: true, products: mapped };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load App Store products.";
    return { ok: false, products: [], message };
  }
}

/** Purchase Kept Pro via StoreKit (iOS native only). */
export async function purchaseProIap(
  plan: CheckoutPlan,
): Promise<{ ok: boolean; message?: string }> {
  if (!isNativeIOS()) {
    return { ok: false, message: "Use the App Store build to upgrade on iPhone." };
  }

  track("checkout_started", {
    plan: plan === "yearly" ? "pro_yearly" : "pro_monthly",
    source: "iap",
  });

  try {
    const billing = await NativePurchases.isBillingSupported();
    if (!billing.isBillingSupported) {
      return { ok: false, message: "In-App Purchases aren’t available on this device." };
    }

    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: productIdForPlan(plan),
      productType: PURCHASE_TYPE.SUBS,
    });

    unlockFromIap(plan, transaction.transactionId);
    return { ok: true, message: "iap" };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const lower = raw.toLowerCase();
    if (
      lower.includes("cancel") ||
      lower.includes("user cancelled") ||
      lower.includes("purchasecancelled")
    ) {
      return { ok: false, message: "Purchase canceled." };
    }
    return {
      ok: false,
      message: raw || "Purchase failed. Try again or Restore Purchases.",
    };
  }
}

/**
 * Restore previous App Store subscriptions and unlock Pro when an active
 * Kept subscription product is found.
 */
export async function restoreProIap(): Promise<{ ok: boolean; message?: string }> {
  if (!isNativeIOS()) {
    return { ok: false, message: "Restore is only available in the iOS app." };
  }

  try {
    await NativePurchases.restorePurchases();
    const { purchases } = await NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.SUBS,
      onlyCurrentEntitlements: true,
    });

    const kept = purchases.find((p) => planForProductId(p.productIdentifier));
    if (!kept) {
      return { ok: false, message: "No Kept Pro subscription found for this Apple ID." };
    }

    const plan = planForProductId(kept.productIdentifier) ?? "yearly";
    unlockFromIap(plan, kept.transactionId);
    return { ok: true, message: "restored" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not restore purchases.";
    return { ok: false, message };
  }
}

/** Opens Apple’s subscription management sheet (iOS native only). */
export async function manageProSubscriptions(): Promise<{ ok: boolean; message?: string }> {
  if (!isNativeIOS()) {
    return { ok: false, message: "Subscription management is only available in the iOS app." };
  }

  try {
    await NativePurchases.manageSubscriptions();
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not open subscription settings.";
    return { ok: false, message };
  }
}

/**
 * Quiet StoreKit entitlement sync for native iOS.
 * Unlocks Pro when an active Kept subscription exists; clears IAP Pro when none.
 * Does not call restorePurchases (no Apple sheet).
 */
export async function syncProFromStoreKit(): Promise<void> {
  if (!isNativeIOS()) return;

  try {
    const { purchases } = await NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.SUBS,
      onlyCurrentEntitlements: true,
    });

    const kept = purchases.find((p) => planForProductId(p.productIdentifier));
    if (kept) {
      const plan = planForProductId(kept.productIdentifier) ?? "yearly";
      unlockFromIap(plan, kept.transactionId);
      return;
    }

    const pro = getPro();
    if (pro.active && pro.source === "iap") {
      clearPro();
    }
  } catch {
    // Ignore StoreKit sync failures — Restore remains available on paywall/settings.
  }
}
