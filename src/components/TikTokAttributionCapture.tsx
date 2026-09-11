"use client";

import { useEffect } from "react";
import { captureTikTokAttributionFromLocation } from "@/lib/tiktokAttribution";

/** Captures ?ttclid= / UTM on first paint so SPA navigations keep ad attribution. */
export function TikTokAttributionCapture() {
  useEffect(() => {
    captureTikTokAttributionFromLocation();
  }, []);

  return null;
}
