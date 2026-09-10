import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Stripe webhook endpoint for Kept Pro subscriptions.
 * For the local-first beta, entitlement is primarily activated on the success
 * redirect via /api/stripe/session. This webhook is ready for server-side
 * entitlement later (e.g. syncing customer IDs).
 */
export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!key || !secret) {
    return NextResponse.json({ received: true, mode: "unconfigured" });
  }

  const stripe = new Stripe(key);
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);

    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // Hook for future server-side entitlement store.
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
