"use client";

import { App } from "@capacitor/app";
import { useEffect } from "react";
import { syncProFromStoreKit } from "@/lib/iap";
import { isNativeIOS } from "@/lib/platform";

/** On native iOS, refresh Kept Pro from StoreKit on launch and foreground. */
export function IapEntitlementSync() {
  useEffect(() => {
    if (!isNativeIOS()) return;

    void syncProFromStoreKit();

    let handle: { remove: () => Promise<void> } | undefined;
    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void syncProFromStoreKit();
    }).then((listener) => {
      handle = listener;
    });

    return () => {
      void handle?.remove();
    };
  }, []);

  return null;
}
