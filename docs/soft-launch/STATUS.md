# Soft-launch status — frozen domain

**2026-09-12 (Marshall):** Custom domain (`keptapp.ca`) purchase/attach is **frozen**. Do not nag or alert about buying/attaching it.

### Soft-launch checklist — treated complete for now

| Gate | Status |
| --- | --- |
| TikTok Pixel | Done (live in production) |
| Ads / traffic | Running or submitted on `https://kept-eosin.vercel.app/welcome` |
| Domain buy/attach | **Deferred** — not required for current ship path |

### Current production URL (ads, bio, App Store links)

`https://kept-eosin.vercel.app`  
Landing for ads: `/welcome` · Privacy: `/privacy` · Terms: `/terms`

### Resume domain later

When ready: buy → Vercel Domains → `NEXT_PUBLIC_APP_URL=https://keptapp.ca` → redeploy → point ads/bio → update App Store metadata URLs (see `docs/ios/APP_STORE.md`).
