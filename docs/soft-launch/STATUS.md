# Soft-launch status — frozen domain

**2026-09-12 (Marshall):** Custom domain (`keptapp.ca`) purchase/attach is **frozen**. Do not nag or alert about buying/attaching it.

### Soft-launch checklist — treated complete for now

| Gate | Status |
| --- | --- |
| TikTok Pixel | Done (live in production) |
| Ads / traffic | Running or submitted on `https://kept-eosin.vercel.app/welcome` |
| Domain buy/attach | **Deferred** — not required for current ship path |

### Active ship priority — iOS App Store + StoreKit IAP

Follow **[`docs/ios/SHIP_NOW.md`](../ios/SHIP_NOW.md)** end-to-end.

Repo gate (CI + local): `npm run ios:iap:verify` — product IDs, Stripe gate, restore/manage UI, build ≥5, live Terms/Privacy. Does **not** prove Connect products or sandbox purchase.

Fast Connect path:

1. Create ASC API key → add GitHub secrets `ASC_ISSUER_ID`, `ASC_KEY_ID`, `ASC_PRIVATE_KEY`
2. Actions → **ASC upsert Kept Pro IAP** → Run workflow
3. Paid Apps Active + Sandbox tester
4. Mac: `git pull && ./scripts/ios-iap-sync.sh` → Archive → TestFlight sandbox buy (Apple sheet) → Submit with IAP

Do **not** submit a Stripe-only binary.

### Current production URL (ads, bio, App Store links)

`https://kept-eosin.vercel.app`  
Landing for ads: `/welcome` · Privacy: `/privacy` · Terms: `/terms`

### Resume domain later

When ready: buy → Vercel Domains → `NEXT_PUBLIC_APP_URL=https://keptapp.ca` → redeploy → point ads/bio → update App Store metadata URLs (see `docs/ios/APP_STORE.md`).
