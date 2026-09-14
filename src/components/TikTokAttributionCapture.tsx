"use client";

import { useEffect } from "react";
import { captureTikTokAttributionFromLocation } from "@/lib/tiktokAttribution";
import { isNativeIOS } from "@/lib/platform";

/** Captures ?ttclid= / UTM on first paint so SPA navigations keep ad attribution. */
export function TikTokAttributionCapture() {
  useEffect(() => {
    if (isNativeIOS()) return;
    captureTikTokAttributionFromLocation();
  }, []);

  return null;
}
