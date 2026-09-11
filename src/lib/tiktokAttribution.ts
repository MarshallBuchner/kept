const ATTR_KEY = "kept:tiktok_attr:v1";

export type TikTokAttribution = {
  ttclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  landing?: string;
};

/**
 * Persist TikTok click id + UTM from the landing URL across client navigations.
 * Soft-launch ads hit /welcome?ttclid=… — Get Started then routes to / and must keep attribution.
 */
export function captureTikTokAttributionFromLocation(
  search = typeof window !== "undefined" ? window.location.search : "",
  href = typeof window !== "undefined" ? window.location.href : "",
): TikTokAttribution {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const next: TikTokAttribution = { ...readTikTokAttribution() };

  const ttclid = params.get("ttclid")?.trim();
  if (ttclid) next.ttclid = ttclid;

  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const) {
    const value = params.get(key)?.trim();
    if (value) next[key] = value;
  }

  if (ttclid || params.get("utm_source")) {
    next.landing = href.split("#")[0] || next.landing;
  }

  try {
    if (next.ttclid || next.utm_source) {
      sessionStorage.setItem(ATTR_KEY, JSON.stringify(next));
    }
  } catch {
    /* private mode */
  }

  return next;
}

export function readTikTokAttribution(): TikTokAttribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(ATTR_KEY);
    return raw ? (JSON.parse(raw) as TikTokAttribution) : {};
  } catch {
    return {};
  }
}

export function attributionAsProps(): Record<string, string> {
  const attr = readTikTokAttribution();
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attr)) {
    if (typeof value === "string" && value) out[key] = value;
  }
  return out;
}
