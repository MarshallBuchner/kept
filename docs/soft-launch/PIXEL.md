# TikTok Pixel (Ads Manager — not the TikTok app profile)

Code is already on production (`TikTokPixel` + funnel → `ttq.track`). It **no-ops** until the env var is set.

## Create Pixel

1. Open [TikTok Ads Manager](https://ads.tiktok.com/) / Business Center (separate from the consumer TikTok app).
2. **Assets → Events** → **Web Events** → **Create Pixel** (or connect an existing Web Pixel).
3. Copy the **Pixel ID** (digits).

## Wire on Vercel

Vercel → **kept** → **Settings → Environment Variables** → **Production**:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | `<paste Pixel ID>` |

**Redeploy** Production (required — `NEXT_PUBLIC_*` is baked at build time).

## Smoke-test (Events Manager → Test Events)

On the live origin (`keptapp.ca` or `https://kept-eosin.vercel.app`):

| Action in Kept | TikTok event |
| --- | --- |
| Open paywall | `ViewContent` |
| Start Checkout | `InitiateCheckout` |
| Finish payment | `CompletePayment` |
| Tap Scan | `ClickButton` |

Also confirm a `PageView` / `ttq.page()` on first load.

```bash
PIXEL_ID=YOUR_ID ./scripts/verify-soft-launch.sh https://keptapp.ca
```

## Ads note

Day-one: **Traffic → Landing page views** to `/welcome` is fine. Switch to Conversions after the Pixel has real event volume.
