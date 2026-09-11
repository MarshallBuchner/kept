import { NextResponse } from "next/server";
import { clientIp, readRemoteUsage, recordRemoteUsage } from "@/lib/usage-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const ip = clientIp(request);
  const ua = request.headers.get("user-agent") || "unknown";
  try {
    const usage = await readRemoteUsage(ip, ua);
    if (!usage) {
      return NextResponse.json({ remote: false, usage: null });
    }
    return NextResponse.json({ remote: true, usage });
  } catch (err) {
    console.error("usage GET failed", err);
    return NextResponse.json({ remote: false, usage: null }, { status: 200 });
  }
}

export async function POST(request: Request) {
  let action: "scan" | "export" | undefined;
  try {
    const body = (await request.json()) as { action?: string };
    if (body.action === "scan" || body.action === "export") action = body.action;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!action) {
    return NextResponse.json({ error: "action_required" }, { status: 400 });
  }

  const ip = clientIp(request);
  const ua = request.headers.get("user-agent") || "unknown";

  try {
    const result = await recordRemoteUsage(ip, ua, action);
    if (!result) {
      // Stripe not configured — client keeps local metering.
      return NextResponse.json({ remote: false, allowed: true, usage: null });
    }
    return NextResponse.json({
      remote: true,
      allowed: result.allowed,
      usage: result.usage,
    });
  } catch (err) {
    console.error("usage POST failed", err);
    return NextResponse.json({ remote: false, allowed: true, usage: null }, { status: 200 });
  }
}
