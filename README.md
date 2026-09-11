This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Monetizable beta

Free plan (device-local monthly counters):

- **5 scans / month**
- **1 PDF export / month**

Kept Pro unlocks unlimited scans + exports via Stripe Checkout.

### Stripe setup

1. Copy `env.example` → `.env.local`
2. Add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_PRICE_ID_YEARLY`, `NEXT_PUBLIC_APP_URL`
3. Optional: set `NEXT_PUBLIC_STRIPE_ENABLED=1`
4. Point Stripe webhook to `/api/stripe/webhook` (subscription lifecycle)

Paywall lets users pick **monthly** or **yearly** (yearly highlighted by default).

Without Stripe keys, **Upgrade to Pro** unlocks a local **demo Pro** entitlement so you can test the paywall funnel.

### Funnel analytics events

`scan_started` → `scan_completed` → `export_clicked` → `paywall_viewed` → `checkout_started` → `paid`

Events queue in `localStorage` and forward to `window.keptAnalytics` / `dataLayer` / TikTok Pixel when present.

### Soft-launch checklist

1. **Merge** the TikTok / legal / OG PR, then use production only: `https://kept-eosin.vercel.app` (not preview URLs).
2. **Buy a domain** (RDAP 404 = likely available): prefer **`keptapp.ca`**, else `keptscan.ca` / `keptscan.com`.
3. **Attach in Vercel** → Domains → DNS → set `NEXT_PUBLIC_APP_URL=https://your-domain` → update Stripe Checkout success/cancel URLs to match → redeploy.
4. **TikTok Pixel**: Events Manager → create Pixel → set `NEXT_PUBLIC_TIKTOK_PIXEL_ID` on Vercel Production → redeploy → verify `ViewContent` / `InitiateCheckout` / `CompletePayment` / `ClickButton`.
5. **Ads**: soft post on personal socials first (before/after receipt, scan→PDF clip, logo + “Scan it. Clean it. Keep it.”), then a small TikTok test budget.
6. **Stripe public details**: rename business name away from leftover CRYPTO/NFT text before paid ads.

Pixel stays off until the env var is set — safe to merge code first.

