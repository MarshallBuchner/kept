# Marshall morning — soft-launch (one page)

**Done when:** `keptapp.ca` HTTPS works · Pixel events show in TikTok · 1 soft post live · tiny ad delivering.

## 0. Merge (2 min)

**Fast path (recommended):** merge https://github.com/MarshallBuchner/kept/pull/25 — already stacks #22+#23+#24+#21 with the WelcomeScreen conflict resolved.

**Or one-by-one:** [#22](https://github.com/MarshallBuchner/kept/pull/22) → [#23](https://github.com/MarshallBuchner/kept/pull/23) → [#24](https://github.com/MarshallBuchner/kept/pull/24) → [#21](https://github.com/MarshallBuchner/kept/pull/21)  
(#24 now includes green Welcome, so #23→#24 is clean.)

Wait for production deploy before buying domain / setting Pixel.

**Ads URL rule:** only `https://keptapp.ca` (after DNS) or `https://kept-eosin.vercel.app` until then. Never a `*-git-*.vercel.app` preview — those are SSO-gated and will break ad clicks.

## 1. Domain (~15–30 min) → [DOMAIN.md](./DOMAIN.md)

1. Buy **`keptapp.ca`** (still available) — [Cloudflare Registrar](https://dash.cloudflare.com/?to=/:account/domains/register) or CIRA.  
2. [Vercel → kept → Domains](https://vercel.com/powr4/kept/settings/domains) → add → DNS until **Valid** + HTTPS.  
3. [Env → Production](https://vercel.com/powr4/kept/settings/environment-variables): `NEXT_PUBLIC_APP_URL=https://keptapp.ca` → **Redeploy**.

```bash
./scripts/verify-soft-launch.sh https://keptapp.ca
```

## 2. TikTok Pixel → [PIXEL.md](./PIXEL.md)

1. Ads Manager (not the TikTok app) → Assets → Events → Web → Create Pixel.  
2. [Env → Production](https://vercel.com/powr4/kept/settings/environment-variables): `NEXT_PUBLIC_TIKTOK_PIXEL_ID=<id>` → **Redeploy**.  
3. Test Events: `/welcome` Get Started → `CompleteRegistration`; paywall → `ViewContent`; checkout → `InitiateCheckout`; paid → `CompletePayment`; scan → `ClickButton`.

## 3. Soft post + tiny ad

Upload: `creative/tiktok-green-live-demo-9x16.mp4`  
Caption: `Messy receipts → clean files in seconds. Kept — Scan it. Clean it. Keep it. https://keptapp.ca/welcome`

Ads Manager → **Traffic** → destination **`https://keptapp.ca/welcome`** (or `https://kept-eosin.vercel.app/welcome` until DNS) · Canada · CAD $5–20/day · 3–5 days · creatives from `creative/`.

## 4. Stripe

Dashboard → Public details / Branding: rename Checkout off CRYPTO/NFT text. Contact `keptscan@gmail.com`.

## Env (Vercel Production)

| Var | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://keptapp.ca` |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | Pixel ID from Ads Manager |

## Remaining gates (agent cannot do these)

| Gate | Evidence |
| --- | --- |
| Merge #25 | PR merged + production deploy |
| Domain | `curl -I https://keptapp.ca/welcome` → 200 |
| Pixel | Test Events show `CompleteRegistration` |
| Soft post | Live on Kept TikTok (or personal) |
| Tiny ad | Ads Manager delivering to `/welcome` |
