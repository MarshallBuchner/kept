import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export type CheckoutPlan = "monthly" | "yearly";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function priceForPlan(plan: CheckoutPlan): string | undefined {
  if (plan === "yearly") {
    return process.env.STRIPE_PRICE_ID_YEARLY || undefined;
  }
  return process.env.STRIPE_PRICE_ID || undefined;
}

function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://kept-eosin.vercel.app";
}

export async function POST(request: Request) {
  const stripe = stripeClient();
  const appUrl = appBaseUrl();

  let plan: CheckoutPlan = "monthly";
  try {
    const body = (await request.json()) as { plan?: string };
    if (body.plan === "yearly" || body.plan === "monthly") {
      plan = body.plan;
    }
  } catch {
    // Empty body → monthly default
  }

  const priceId = priceForPlan(plan);

  if (!stripe || !priceId) {
    // Opt-in only — never silently grant Pro on production/preview.
    if (process.env.ALLOW_DEMO_PRO === "1") {
      return NextResponse.json({ demo: true, plan });
    }
    const missing =
      plan === "yearly"
        ? "Yearly checkout isn’t set up yet. Add STRIPE_PRICE_ID_YEARLY."
        : "Checkout isn’t set up yet. Add Stripe keys, or set ALLOW_DEMO_PRO=1 for local testing.";
    return NextResponse.json({ error: missing }, { status: 503 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/settings?checkout=cancel`,
      allow_promotion_codes: true,
      // Override leftover Dashboard business name (e.g. CRYPTO/NFT) on hosted Checkout header.
      // Account Settings → Public details still needed for receipts / statements.
      branding_settings: {
        display_name: "Kept",
        button_color: "#516a57",
      },
      metadata: { product: "kept_pro", plan },
    });

    return NextResponse.json({ url: session.url, plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
