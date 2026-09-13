import { Capacitor } from "@capacitor/core";

/** True when running inside the Capacitor native shell (not mobile Safari). */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** App Store builds must use StoreKit — never Stripe Checkout. */
export function isNativeIOS(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}
