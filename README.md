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

### Soft-launch checklist (Marshall morning playbook)

**Goal:** custom domain live → TikTok Pixel firing → 1 soft post → tiny paid test.

PR #20 is already on production (`/privacy`, `/terms`, `/welcome`, `/og.png`). Soft-launch only from `https://kept-eosin.vercel.app` or your new domain — never a `*.vercel.app` preview URL.

RDAP still shows **available:** `keptapp.ca` (preferred), `keptscan.ca`.

#### 0) Merge ready product PRs (2 min)

Merge in any order, then wait for production deploy:

- https://github.com/MarshallBuchner/kept/pull/21 — this runbook (socials vs Ads Manager)
- https://github.com/MarshallBuchner/kept/pull/22 — Archive folders open documents
- https://github.com/MarshallBuchner/kept/pull/23 — full sage Home + large Kept mark

#### 1) Buy + attach domain (~15–30 min)

1. Buy **`keptapp.ca`** via [Cloudflare Registrar](https://developers.cloudflare.com/registrar/get-started/register-domain/) (`.ca` needs Canadian presence) or a [CIRA registrar](https://www.cira.ca/en/ca-domains/find-a-ca-registrar/). Fallback: `keptscan.ca` / `keptscan.com`.
2. Vercel → Project → Settings → **Domains** → Add `keptapp.ca` (+ `www` optional).
   - Vercel nameservers OK at registrar → paste the NS values Vercel shows.
   - Cloudflare Registrar (CF NS required) → keep CF DNS; add the A/CNAME records Vercel shows.
3. Wait until domain shows **Valid** + HTTPS.
4. Vercel → Settings → Environment Variables → Production:
   - `NEXT_PUBLIC_APP_URL=https://keptapp.ca`
5. **Redeploy** Production. Stripe success/cancel URLs follow this env (no manual Stripe URL edit required if that var is set).

**Done when:** `https://keptapp.ca/welcome`, `/privacy`, `/terms`, `/og.png` all return 200.

#### 2) TikTok Ads Manager + Pixel (required to spend)

Profile ≠ Ads. You need **TikTok Ads Manager / Business Center** to create a Pixel and run ads.

1. TikTok Ads → **Assets → Events** → Web Events → Create Pixel → copy Pixel ID.
2. Vercel Production env: `NEXT_PUBLIC_TIKTOK_PIXEL_ID=<id>` → Redeploy.
3. Smoke-test on the live domain (TikTok Events Manager → Test Events):
   - open paywall → `ViewContent`
   - start checkout → `InitiateCheckout`
   - complete payment → `CompletePayment`
   - tap scan → `ClickButton`

Pixel code is already merged-safe; leaving the env empty keeps it off.

#### 3) Brand socials (once)

Create Kept profiles (not personal) where free: TikTok, Instagram, Facebook Page, X.  
Logo + tagline **Scan it. Clean it. Keep it.** Bio link = production URL, then swap to `keptapp.ca` after DNS.

First paid test can run with **Ads Manager + Pixel + landing** even if IG/X are still empty. Kept TikTok profile is strongly preferred for creative.

#### 4) Soft posts (before spend) — paste-ready

Use production URL until DNS is live, then swap.

**Caption A (receipt):**  
`Messy receipts → clean files in seconds. Kept — Scan it. Clean it. Keep it. https://kept-eosin.vercel.app`

**Caption B (screen record):**  
`Camera → crop → clean → PDF. Local on your phone. Kept. https://kept-eosin.vercel.app`

**Caption C (static brand):**  
`Scan it. Clean it. Keep it. — Kept https://kept-eosin.vercel.app`

Creative ideas: before/after receipt photo; 10–15s screen recording of scan→PDF; static Kept mark + tagline.

#### 5) Tiny paid TikTok test

1. Ads Manager → Traffic or Website Conversions → destination = custom domain (or production until DNS).
2. Budget: start tiny (e.g. daily CAD $5–20) — learn, don’t scale.
3. Creative: reuse the soft-post video/static; landing must show Privacy/Terms (Welcome + Settings).
4. Paste-ready ad text:  
   `Tired of crumpled receipts? Scan, clean, and keep them as tidy files — on your device. Kept.`  
   CTA: **Learn more** / **Download** → your live URL.

#### 6) Stripe public details (before spend)

Stripe Dashboard → Settings → Public details / Branding: rename Checkout business name off leftover CRYPTO/NFT text. Contact stays `keptscan@gmail.com`.

#### Env checklist (Vercel Production)

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://keptapp.ca` (after DNS) |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | Pixel ID from Ads Manager |
| Stripe keys / price IDs | already used for Checkout |

**Launch is done when:** domain HTTPS works, Pixel events show in TikTok, one soft post is live, and a small ad is delivering.

