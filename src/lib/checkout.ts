import { track } from "@/lib/analytics";
import { setPro } from "@/lib/billing";

export async function startProCheckout(): Promise<{ ok: boolean; message?: string }> {
  track("checkout_started", { plan: "pro_monthly" });

  try {
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
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
      track("paid", { plan: "pro_monthly", source: "demo" });
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
    track("paid", { plan: "pro_monthly", source: "stripe" });
    return true;
  } catch {
    return false;
  }
}
