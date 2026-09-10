/** Free monthly allowances for monetizable beta. */
export const FREE_SCANS_PER_MONTH = 5;
export const FREE_EXPORTS_PER_MONTH = 1;

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

export function planLabel(): "Kept Pro" | "Free" {
  return isPro() ? "Kept Pro" : "Free";
}

export function stripeConfigured(): boolean {
  return process.env.NEXT_PUBLIC_STRIPE_ENABLED === "1";
}
