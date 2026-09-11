import { FREE_EXPORTS_PER_MONTH, FREE_SCANS_PER_MONTH } from "@/lib/billing-limits";

export { FREE_EXPORTS_PER_MONTH, FREE_SCANS_PER_MONTH };

/** Free monthly allowances for monetizable beta. */
const USAGE_KEY = "kept:usage:v1";
const PRO_KEY = "kept:pro:v1";

export type UsageSnapshot = {
  month: string; // YYYY-MM
  scans: number;
  exports: number;
};

export type ProEntitlement = {
  active: boolean;
  source: "stripe" | "demo" | "none";
  customerId?: string;
  sessionId?: string;
  activatedAt?: string;
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function emptyUsage(month = currentMonth()): UsageSnapshot {
  return { month, scans: 0, exports: 0 };
}

export function getUsage(): UsageSnapshot {
  if (typeof window === "undefined") return emptyUsage();
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return emptyUsage();
    const parsed = JSON.parse(raw) as UsageSnapshot;
    if (!parsed?.month || parsed.month !== currentMonth()) return emptyUsage();
    return {
      month: parsed.month,
      scans: Number(parsed.scans) || 0,
      exports: Number(parsed.exports) || 0,
    };
  } catch {
    return emptyUsage();
  }
}

function saveUsage(usage: UsageSnapshot) {
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}

/** Prefer the higher of local + remote so reinstall can't under-report. */
export function mergeUsage(local: UsageSnapshot, remote: UsageSnapshot | null | undefined): UsageSnapshot {
  if (!remote || remote.month !== currentMonth()) return local.month === currentMonth() ? local : emptyUsage();
  if (local.month !== currentMonth()) {
    return {
      month: remote.month,
      scans: remote.scans,
      exports: remote.exports,
    };
  }
  return {
    month: currentMonth(),
    scans: Math.max(local.scans, remote.scans),
    exports: Math.max(local.exports, remote.exports),
  };
}

export function applyRemoteUsage(remote: UsageSnapshot) {
  const merged = mergeUsage(getUsage(), remote);
  saveUsage(merged);
  return merged;
}

export async function refreshUsageFromServer(): Promise<UsageSnapshot> {
  const local = getUsage();
  if (isPro()) return local;
  try {
    const res = await fetch("/api/usage", { method: "GET", cache: "no-store" });
    if (!res.ok) return local;
    const data = (await res.json()) as { usage?: UsageSnapshot; remote?: boolean };
    if (!data.usage) return local;
    return applyRemoteUsage(data.usage);
  } catch {
    return local;
  }
}

export function getPro(): ProEntitlement {
  if (typeof window === "undefined") {
    return { active: false, source: "none" };
  }
  try {
    const raw = localStorage.getItem(PRO_KEY);
    if (!raw) return { active: false, source: "none" };
    const parsed = JSON.parse(raw) as ProEntitlement;
    return {
      active: Boolean(parsed.active),
      source: parsed.source ?? (parsed.active ? "stripe" : "none"),
      customerId: parsed.customerId,
      sessionId: parsed.sessionId,
      activatedAt: parsed.activatedAt,
    };
  } catch {
    return { active: false, source: "none" };
  }
}

export function isPro(): boolean {
  return getPro().active;
}

export function setPro(entitlement: Omit<ProEntitlement, "active"> & { active?: boolean }) {
  const next: ProEntitlement = {
    active: entitlement.active ?? true,
    source: entitlement.source,
    customerId: entitlement.customerId,
    sessionId: entitlement.sessionId,
    activatedAt: entitlement.activatedAt ?? new Date().toISOString(),
  };
  localStorage.setItem(PRO_KEY, JSON.stringify(next));
  return next;
}

export function clearPro() {
  localStorage.removeItem(PRO_KEY);
}

export function canScan(): boolean {
  if (isPro()) return true;
  return getUsage().scans < FREE_SCANS_PER_MONTH;
}

export function canExport(): boolean {
  if (isPro()) return true;
  return getUsage().exports < FREE_EXPORTS_PER_MONTH;
}

export function scansRemaining(): number {
  if (isPro()) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_SCANS_PER_MONTH - getUsage().scans);
}

export function exportsRemaining(): number {
  if (isPro()) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_EXPORTS_PER_MONTH - getUsage().exports);
}

export function recordScan(): UsageSnapshot {
  const usage = getUsage();
  usage.scans += 1;
  saveUsage(usage);
  return usage;
}

export function recordExport(): UsageSnapshot {
  const usage = getUsage();
  usage.exports += 1;
  saveUsage(usage);
  return usage;
}

/** Gate + meter a scan with server when Stripe metering is available. */
export async function consumeScan(): Promise<{ allowed: boolean; usage: UsageSnapshot }> {
  if (isPro()) return { allowed: true, usage: getUsage() };
  await refreshUsageFromServer();
  if (!canScan()) return { allowed: false, usage: getUsage() };

  try {
    const res = await fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "scan" }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        allowed?: boolean;
        usage?: UsageSnapshot;
        remote?: boolean;
      };
      if (data.usage) applyRemoteUsage(data.usage);
      if (data.allowed === false) return { allowed: false, usage: getUsage() };
      if (data.remote) return { allowed: true, usage: getUsage() };
    }
  } catch {
    /* offline — fall through to local */
  }

  return { allowed: true, usage: recordScan() };
}

/** Gate + meter a PDF export with server when Stripe metering is available. */
export async function consumeExport(): Promise<{ allowed: boolean; usage: UsageSnapshot }> {
  if (isPro()) return { allowed: true, usage: getUsage() };
  await refreshUsageFromServer();
  if (!canExport()) return { allowed: false, usage: getUsage() };

  try {
    const res = await fetch("/api/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "export" }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        allowed?: boolean;
        usage?: UsageSnapshot;
        remote?: boolean;
      };
      if (data.usage) applyRemoteUsage(data.usage);
      if (data.allowed === false) return { allowed: false, usage: getUsage() };
      if (data.remote) return { allowed: true, usage: getUsage() };
    }
  } catch {
    /* offline — fall through to local */
  }

  return { allowed: true, usage: recordExport() };
}

export function planLabel(): "Kept Pro" | "Free" {
  return isPro() ? "Kept Pro" : "Free";
}

export function stripeConfigured(): boolean {
  return process.env.NEXT_PUBLIC_STRIPE_ENABLED === "1";
}
