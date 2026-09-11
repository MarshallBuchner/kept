# TikTok Pixel (Ads Manager — not the TikTok app profile)

Code is already on production (`TikTokPixel` + funnel → `ttq.track`). It **no-ops** until the env var is set.

Official path (TikTok help, June 2026): [Set up and Verify Pixel](https://ads.tiktok.com/help/article/get-started-pixel).

## Create Pixel

1. Open [TikTok Ads Manager](https://ads.tiktok.com/) (Business Center — **not** the consumer TikTok app).
2. **Tools** → **Events Manager**.
3. **Connect Data Source** → **Web**.
4. Enter site URL: `https://keptapp.ca` (or `https://kept-eosin.vercel.app` until the domain is live).
5. Choose **Manual Setup** (skip Partner Integration — Shopify/GTM/etc. do not apply).
6. Name the pixel (e.g. `Kept` or `keptapp.ca`) → create.
7. Copy the **Pixel ID** (digits). **Skip installing TikTok’s base-code snippet** — Kept already loads it via `TikTokPixel` when the env var is set. You only need the ID.

If you already have a Web Pixel for Kept, reuse it — just copy its Pixel ID.

## Wire on Vercel

Vercel → **kept** → [Settings → Environment Variables](https://vercel.com/powr4/kept/settings/environment-variables) → **Production**:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | `<paste Pixel ID>` |

**Redeploy** Production (required — `NEXT_PUBLIC_*` is baked at build time).

## Smoke-test (Events Manager → Test Events)

On the live origin (`https://keptapp.ca` or `https://kept-eosin.vercel.app`):

| Action in Kept | TikTok event |
| --- | --- |
| `/welcome` → Get Started | `CompleteRegistration` |
| Open paywall | `ViewContent` |
| Start Checkout | `InitiateCheckout` |
| Finish payment | `CompletePayment` |
| Tap Scan | `ClickButton` |

Also confirm a `PageView` / `ttq.page()` on first load. Optional: Chrome [TikTok Pixel Helper](https://ads.tiktok.com/help/article/tiktok-pixel-helper).

```bash
PIXEL_ID=YOUR_ID ./scripts/verify-soft-launch.sh https://keptapp.ca
```

## Ads note

Day-one: **Traffic → Landing page views** to `/welcome` is fine. Switch to Conversions after the Pixel has real event volume.
