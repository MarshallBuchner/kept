"use client";

import Script from "next/script";

declare global {
  interface Window {
    ttq?: {
      load: (pixelId: string) => void;
      page: () => void;
      track: (event: string, props?: Record<string, unknown>) => void;
      instance: (pixelId: string) => {
        track: (event: string, props?: Record<string, unknown>) => void;
      };
    };
    TiktokAnalyticsObject?: string;
  }
}

/**
 * Loads TikTok Pixel when NEXT_PUBLIC_TIKTOK_PIXEL_ID is set in Vercel.
 * No-ops locally / when the env var is missing.
 */
export function TikTokPixel() {
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim();
  if (!pixelId) return null;

  return (
    <Script
      id="tiktok-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
!function (w, d, t) {
  w.TiktokAnalyticsObject = t;
  var ttq = w[t] = w[t] || [];
  ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
  ttq.setAndDefer = function (t, e) {
    t[e] = function () {
      t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
    };
  };
  for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
  ttq.instance = function (t) {
    for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
    return e;
  };
  ttq.load = function (e, n) {
    var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
    var o = d.createElement("script");
    o.type = "text/javascript";
    o.async = true;
    o.src = r + "?sdkid=" + e + "&lib=" + t;
    var a = d.getElementsByTagName("script")[0];
    a.parentNode.insertBefore(o, a);
  };
  ttq.load(${JSON.stringify(pixelId)});
  ttq.page();
}(window, document, "ttq");
        `,
      }}
    />
  );
}
