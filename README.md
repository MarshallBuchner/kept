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

### Soft-launch checklist (tomorrow runbook)

PR #20 is merged — production already has `/privacy`, `/terms`, `/welcome`, and `/og.png`. Soft-launch only from `https://kept-eosin.vercel.app` (or your new domain). Never use a `*.vercel.app` preview URL (usage counters + SSO).

1. **Buy domain** — RDAP still showed available: **`keptapp.ca`** (preferred), else `keptscan.ca` / `keptscan.com`.  
   Fast path: [Cloudflare Registrar](https://developers.cloudflare.com/registrar/get-started/register-domain/) (search `keptapp.ca` → Purchase; `.ca` needs Canadian presence). Or any [CIRA-certified registrar](https://www.cira.ca/en/ca-domains/find-a-ca-registrar/).

2. **Attach in Vercel**  
   Project → Settings → Domains → Add `keptapp.ca` (and `www` if you want).  
   - If registrar allows Vercel nameservers: use the NS values Vercel shows.  
   - If bought on Cloudflare Registrar (CF nameservers required): keep CF DNS and add the A/CNAME records Vercel shows for the domain.  
   Wait for HTTPS → set Vercel Production env `NEXT_PUBLIC_APP_URL=https://keptapp.ca` → Redeploy.  
   Align Stripe Checkout success/cancel URLs to that same origin (or rely on `NEXT_PUBLIC_APP_URL` in code).

3. **Brand socials (do once)** — create Kept profiles (not personal) where handles are free: TikTok, Instagram, Facebook Page, X.  
   Same logo + tagline **Scan it. Clean it. Keep it.** Bio link = production URL for now, swap to `keptapp.ca` after DNS.

4. **TikTok Ads Manager + Pixel** (required to spend)  
   This is **Ads Manager / Business Center**, separate from the TikTok profile.  
   TikTok Ads → **Assets → Events** → Web Events → create Pixel → copy Pixel ID.  
   Vercel → Production env `NEXT_PUBLIC_TIKTOK_PIXEL_ID=<id>` → Redeploy.  
   Smoke-test: open paywall (`ViewContent`), start checkout (`InitiateCheckout`), complete payment (`CompletePayment`), tap scan (`ClickButton`). Leave empty until ready — pixel code is already merged-safe.

5. **Soft posts (before paid ads)** — 1–2 organics on Kept TikTok/IG (personal OK for day one) with production URL only:  
   - Before/after: messy receipt photo → Kept cleaned text/PDF  
   - 10–15s screen recording: camera → crop → clean → Save/PDF  
   - Static: Kept mark + “Scan it. Clean it. Keep it.” + link  
   Paste-ready caption: `Messy receipts → clean files in seconds. Kept — Scan it. Clean it. Keep it. https://kept-eosin.vercel.app` (swap URL after DNS).

6. **Paid TikTok test** — small budget from Ads Manager to production or custom domain; creative from step 5. Landing must show Privacy/Terms (Welcome + Settings). You can run the first test with Ads Manager + Pixel + landing even if IG/X are still empty.

7. **Stripe public details** — rename Checkout business name off leftover CRYPTO/NFT text before spend.

Pixel stays off until the env var is set — safe to ship without it.

