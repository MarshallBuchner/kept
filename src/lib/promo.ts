import { createHash, timingSafeEqual } from "crypto";

/**
 * Owner lifetime promo. Override on Vercel with KEPT_LIFETIME_PROMO_CODE.
 * Default is for Marshall's personal device unlock (not a public offer).
 */
const DEFAULT_OWNER_CODE = "KEPT-OWNER";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function expectedCode(): string {
  const fromEnv = process.env.KEPT_LIFETIME_PROMO_CODE?.trim();
  return normalizeCode(fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_OWNER_CODE);
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Server-only: true when `code` matches the configured lifetime promo. */
export function isLifetimePromoCode(code: string): boolean {
  const submitted = normalizeCode(code);
  if (!submitted) return false;
  const a = digest(submitted);
  const b = digest(expectedCode());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
