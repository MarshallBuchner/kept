import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  if (!key) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const ok = session.payment_status === "paid" || session.status === "complete";

    return NextResponse.json({
      paid: ok,
      customerId: typeof session.customer === "string" ? session.customer : undefined,
      status: session.status,
      payment_status: session.payment_status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
