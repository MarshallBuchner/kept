import { NextResponse } from "next/server";
import { isLifetimePromoCode } from "@/lib/promo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let code = "";
  try {
    const body = (await request.json()) as { code?: string };
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    return NextResponse.json({ error: "Send { code }." }, { status: 400 });
  }

  if (!code.trim()) {
    return NextResponse.json({ error: "Enter a promo code." }, { status: 400 });
  }

  if (!isLifetimePromoCode(code)) {
    return NextResponse.json({ error: "That code isn’t valid." }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    lifetime: true,
    source: "promo" as const,
  });
}
