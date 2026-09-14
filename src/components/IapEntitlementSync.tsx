"use client";

import { useEffect } from "react";
import { syncProFromStoreKit } from "@/lib/iap";
import { isNativeIOS } from "@/lib/platform";

/** On native iOS, refresh Kept Pro from StoreKit current entitlements. */
export function IapEntitlementSync() {
  useEffect(() => {
    if (!isNativeIOS()) return;
    void syncProFromStoreKit();
  }, []);

  return null;
}
