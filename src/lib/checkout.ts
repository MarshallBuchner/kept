import { track } from "@/lib/analytics";
import { setPro } from "@/lib/billing";

export type CheckoutPlan = "monthly" | "yearly";

/** Redeem a server-validated lifetime promo (owner / staff). */
export async function redeemLifetimePromo(
  code: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch("/api/promo/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      lifetime?: boolean;
      source?: string;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, message: data.error ?? "Invalid promo code." };
    }
    setPro({ source: "promo" });
    track("paid", { plan: "lifetime", source: "promo" });
    return { ok: true, message: "lifetime" };
  } catch {
    return { ok: false, message: "Could not redeem code." };
  }
}

export async function startProCheckout(
  plan: CheckoutPlan = "monthly",
): Promise<{ ok: boolean; message?: string }> {
  track("checkout_started", { plan: plan === "yearly" ? "pro_yearly" : "pro_monthly" });

  try {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = (await res.json()) as {
      url?: string;
      demo?: boolean;
      error?: string;
    };

    if (!res.ok) {
      return { ok: false, message: data.error ?? "Checkout unavailable." };
    }

    // No Stripe keys in this environment → local demo unlock for beta testing.
    if (data.demo) {
      setPro({ source: "demo" });
      track("paid", {
        plan: plan === "yearly" ? "pro_yearly" : "pro_monthly",
        source: "demo",
      });
      return { ok: true, message: "demo" };
    }

    if (data.url) {
      window.location.assign(data.url);
      return { ok: true };
    }

    return { ok: false, message: "No checkout URL returned." };
  } catch {
    return { ok: false, message: "Could not start checkout." };
  }
}

export async function confirmCheckoutSession(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`);
    const data = (await res.json()) as {
      paid?: boolean;
      customerId?: string;
      error?: string;
    };
    if (!res.ok || !data.paid) return false;
    setPro({
      source: "stripe",
      sessionId,
      customerId: data.customerId,
    });
    track("paid", { plan: "pro", source: "stripe" });
    return true;
  } catch {
    return false;
  }
}
