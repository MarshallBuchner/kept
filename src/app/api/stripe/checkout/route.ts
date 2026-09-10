import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST() {
  const stripe = stripeClient();
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!stripe || !priceId) {
    // Opt-in only — never silently grant Pro on production/preview.
    if (process.env.ALLOW_DEMO_PRO === "1") {
      return NextResponse.json({ demo: true });
    }
    return NextResponse.json(
      { error: "Checkout isn’t set up yet. Add Stripe keys, or set ALLOW_DEMO_PRO=1 for local testing." },
      { status: 503 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/settings?checkout=cancel`,
      allow_promotion_codes: true,
      metadata: { product: "kept_pro" },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
