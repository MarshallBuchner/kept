# Pre-launch hygiene (lesson from Kept)

Before ads, soft-launch, or “share the link,” do a **clean sweep** for holes — not only broken features.

## Lesson (2026-09-12)

`/soft-launch` was labeled “Marshall-only — not indexed.”  
`noindex` ≠ private. Bing still found it; Vercel Analytics showed **8 visitors** (bing.com + vercel.com), not TikTok ads.

**Rule:** Anything on the production origin is public unless it **404s**, redirects away, or requires a real secret (auth / env key). Copy that says “internal” is not a lock.

## Sweep checklist (every app / site)

### Routes & pages
- [ ] List every route under `src/app` (or equivalent). Would you be fine if a stranger opened each one?
- [ ] Operator / debug / checklist / staging pages: **404 by default**, or gate with a secret, or keep them **local-only** (HTML in `docs/`).
- [ ] Confirm `robots: noindex` is extra, **not** the access control.
- [ ] Curl bare URLs on production: expect 404 for internals.

```bash
curl -sI https://YOUR_PROD/soft-launch   # want 404
curl -sI https://YOUR_PROD/welcome       # want 200
```

### Leaks in the HTML
- [ ] No staff checklists, “remaining gates,” deploy commands, or dashboard deep-links on public pages.
- [ ] Pixel / analytics IDs in client JS are expected; **API keys, tokens, webhook secrets** never are.
- [ ] Source maps / preview comments don’t expose private env names with values.

### Ads & share URLs
- [ ] Ad destination = product landing only (Kept: `/welcome`).
- [ ] Never git-preview / `*-git-*.vercel.app` URLs (SSO-gated → dead clicks).
- [ ] After the sweep, spot-check Vercel Analytics → Pages for unexpected paths.

### Auth & paywalls
- [ ] Promo / owner codes work **in-app**, not as Stripe Checkout coupons (unless you created real Stripe promos).
- [ ] Free limits and Pro gates still hold after a hard refresh / reinstall path.

## Kept specifics

| Surface | Expected |
| --- | --- |
| `/welcome` | Public landing for ads |
| `/soft-launch` | **404** unless `SOFT_LAUNCH_KEY` + `?key=…` |
| Local launcher | `docs/soft-launch/LAUNCH.html` |
| Verify | `./scripts/verify-soft-launch.sh` asserts `/soft-launch` → 404 |

Ship the sweep **before** spend. Finding this after traffic is luck; finding it before is the job.
