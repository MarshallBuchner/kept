# TikTok Traffic ad (day-one soft launch)

Use **Traffic → Website → Landing Page View** until the Pixel has real event volume, then switch to Conversions.

Official notes: [Landing Page View](https://ads.tiktok.com/resources/help/article/landing-page-view?lang=en).

**Prerequisite:** prefer Pixel live first ([PIXEL.md](./PIXEL.md)) so Test Events work — Traffic LPV can still run without Pixel, but measurement for Get Started / paywall needs the ID in Vercel.

## Destination URL (copy)

Until DNS:

```
https://kept-eosin.vercel.app/welcome
```

After `keptapp.ca` is Valid:

```
https://keptapp.ca/welcome
```

Never a `*-git-*.vercel.app` preview URL (SSO-gated — ad clicks will fail).

## Create campaign

1. Open [TikTok Ads Manager](https://ads.tiktok.com/) → **Create**.
2. Buying type: **Auction**.
3. Objective: **Traffic**.
4. Campaign name: e.g. `Kept soft-launch traffic`.
5. Budget: campaign budget optional; day-one often sets budget at ad-group level.

## Ad group

1. Promotion type / destination: **Website**.
2. Placement: **Automatic** (or TikTok-only if you prefer).
3. Optimization goal: **Landing Page View** (not default Clicks — LPV only counts when the page actually loads).
4. Bid: **Lowest cost** / automatic.
5. Budget: **CAD $5–20/day** · Schedule: **3–5 days**.
6. Location: **Canada** (or your city). Age ~22–54. Leave interest narrow until you have volume.
7. Website URL: paste the destination above (`…/welcome`).

## Ad creative

1. Upload `creative/tiktok-green-live-demo-9x16.mp4` (preferred). Alts: `tiktok-demo-slideshow.mp4`, `tiktok-static-9x16.png`.
2. Primary text:

```
Tired of crumpled receipts? Scan, clean, and keep them as tidy files — on your device. Kept.
```

3. CTA: **Learn more** (or **Shop now** if required by UI — Learn more is fine for Traffic).
4. Display/landing URL: same `/welcome` destination.
5. Identity: Kept TikTok account if available; otherwise Ads Manager identity is OK for the first test.

## Soft post (before or with the ad)

Upload the same MP4 organically with caption:

```
Messy receipts → clean files in seconds. Kept — Scan it. Clean it. Keep it. https://kept-eosin.vercel.app/welcome
```

Swap the URL to `https://keptapp.ca/welcome` after DNS.

## After it delivers

- Confirm Ads Manager shows spend + Landing Page Views.
- In Events Manager → Test Events / overview: `CompleteRegistration` from Get Started, then `ViewContent` / `InitiateCheckout` as people explore.
- When Pixel has steady events (≥ ~50), create a **Web Conversions** campaign optimizing to `ViewContent` or `InitiateCheckout`.
- When domain is live: edit this ad’s website URL (and bio) to `https://keptapp.ca/welcome` — no creative rebuild required.
