"use client";

import { App } from "@capacitor/app";
import { NativePurchases } from "@capgo/native-purchases";
import { useEffect } from "react";
import {
  handleStoreKitTransactionUpdate,
  syncProFromStoreKit,
} from "@/lib/iap";
import { isNativeIOS } from "@/lib/platform";

/** On native iOS, refresh Kept Pro from StoreKit on launch, foreground, and Transaction.updates. */
export function IapEntitlementSync() {
  useEffect(() => {
    if (!isNativeIOS()) return;

    void syncProFromStoreKit();

    const handles: Array<{ remove: () => Promise<void> }> = [];

    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void syncProFromStoreKit();
    }).then((listener) => {
      handles.push(listener);
    });

    void NativePurchases.addListener("transactionUpdated", (transaction) => {
      void handleStoreKitTransactionUpdate(transaction);
    }).then((listener) => {
      handles.push(listener);
    });

    return () => {
      for (const h of handles) void h.remove();
    };
  }, []);

  return null;
}
