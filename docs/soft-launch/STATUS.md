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
Quick reminder: `npm run ios:iap:next`

**Blocked on Marshall (repo is ready — PR [#65](https://github.com/MarshallBuchner/kept/pull/65)):**

| Step | Status |
| --- | --- |
| Merge PR #65 | Open / needs merge |
| ASC secrets + upsert (or Connect UI products) | Not run from agent (no `.p8`) |
| Paid Apps Active + Sandbox tester | Human |
| TestFlight build + Apple-sheet sandbox buy | Human |
| Submit for Review with IAP | Human |

Repo gate (CI + local): `npm run ios:iap:verify` — product IDs, Stripe gate, restore/manage UI, IAP capability, privacy manifest, build ≥5, live Terms/Privacy. Does **not** prove Connect products or sandbox purchase.

Fast Connect path:

1. Merge [#65](https://github.com/MarshallBuchner/kept/pull/65)
2. Create ASC API key → add GitHub secrets `ASC_ISSUER_ID`, `ASC_KEY_ID`, `ASC_PRIVATE_KEY`
3. Actions → **ASC upsert Kept Pro IAP** → Run workflow
4. Paid Apps Active + Sandbox tester
5. Prefer Xcode Cloud **Deploy to TestFlight** post-action on `main` (Archive already green); else Mac Archive
6. Sandbox buy (Apple sheet) → Restore → Submit with IAP

Do **not** submit a Stripe-only binary.

### Current production URL (ads, bio, App Store links)

`https://kept-eosin.vercel.app`  
Landing for ads: `/welcome` · Privacy: `/privacy` · Terms: `/terms`

### Resume domain later

When ready: buy → Vercel Domains → `NEXT_PUBLIC_APP_URL=https://keptapp.ca` → redeploy → point ads/bio → update App Store metadata URLs (see `docs/ios/APP_STORE.md`).
