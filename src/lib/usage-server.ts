import { createHash } from "crypto";
import Stripe from "stripe";
import { FREE_EXPORTS_PER_MONTH, FREE_SCANS_PER_MONTH } from "@/lib/billing-limits";

export type RemoteUsage = {
  month: string;
  scans: number;
  exports: number;
};

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

export function currentUsageMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Stable-enough free-tier key: survives home-screen delete/reinstall on same network+device UA. */
export function usageFingerprint(ip: string, userAgent: string, month: string): string {
  const ua = userAgent.slice(0, 120);
  return createHash("sha256").update(`${ip}|${ua}|${month}|kept-usage-v1`).digest("hex").slice(0, 32);
}

function usageEmail(fp: string): string {
  return `${fp}@usage.kept.local`;
}

function parseUsage(meta: Stripe.Metadata | null | undefined, month: string): RemoteUsage {
  if (!meta || meta.kept_month !== month) {
    return { month, scans: 0, exports: 0 };
  }
  return {
    month,
    scans: Math.max(0, Number(meta.kept_scans) || 0),
    exports: Math.max(0, Number(meta.kept_exports) || 0),
  };
}

async function findUsageCustomer(stripe: Stripe, fp: string): Promise<Stripe.Customer | null> {
  const email = usageEmail(fp);
  const listed = await stripe.customers.list({ email, limit: 1 });
  return listed.data[0] ?? null;
}

export async function readRemoteUsage(ip: string, userAgent: string): Promise<RemoteUsage | null> {
  const stripe = stripeClient();
  if (!stripe) return null;
  const month = currentUsageMonth();
  const fp = usageFingerprint(ip, userAgent, month);
  const customer = await findUsageCustomer(stripe, fp);
  if (!customer) return { month, scans: 0, exports: 0 };
  return parseUsage(customer.metadata, month);
}

export async function recordRemoteUsage(
  ip: string,
  userAgent: string,
  action: "scan" | "export",
): Promise<{ allowed: boolean; usage: RemoteUsage } | null> {
  const stripe = stripeClient();
  if (!stripe) return null;

  const month = currentUsageMonth();
  const fp = usageFingerprint(ip, userAgent, month);
  let customer = await findUsageCustomer(stripe, fp);
  let usage = customer ? parseUsage(customer.metadata, month) : { month, scans: 0, exports: 0 };

  const limit = action === "scan" ? FREE_SCANS_PER_MONTH : FREE_EXPORTS_PER_MONTH;
  const used = action === "scan" ? usage.scans : usage.exports;
  if (used >= limit) {
    return { allowed: false, usage };
  }

  if (action === "scan") usage = { ...usage, scans: usage.scans + 1 };
  else usage = { ...usage, exports: usage.exports + 1 };

  const metadata = {
    kept_usage_fp: fp,
    kept_month: usage.month,
    kept_scans: String(usage.scans),
    kept_exports: String(usage.exports),
  };

  if (customer) {
    await stripe.customers.update(customer.id, { metadata });
  } else {
    await stripe.customers.create({
      email: usageEmail(fp),
      name: "Kept free-tier usage",
      metadata,
      description: "Metering only — not a Kept Pro subscriber",
    });
  }

  return { allowed: true, usage };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "0.0.0.0";
  return request.headers.get("x-real-ip")?.trim() || "0.0.0.0";
}
