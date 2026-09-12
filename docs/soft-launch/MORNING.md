# Marshall morning — soft-launch (one page)

**Done when:** `keptapp.ca` HTTPS works · Pixel events show in TikTok · 1 soft post live · tiny ad delivering.

**Status (2026-09-12):** Pixel **live** (`DAINOAJC77UDHLL3UCVG`) · Traffic ads **Under review** (4 ads, LPV, TikTok-only) on `https://kept-eosin.vercel.app/welcome` · Domain **not bought yet** (`keptapp.ca` still unresolved). Remaining: ads → Active + buy/attach domain.

**Do not wait on the domain to start spending.** Pixel + soft post + Traffic ads can run today on production. Buy/attach the domain in parallel (or right after).

**Launcher:** local [`LAUNCH.html`](./LAUNCH.html) (preferred), or gated `/soft-launch?key=…` after you set `SOFT_LAUNCH_KEY` on Vercel. Bare `/soft-launch` 404s on purpose — it is not a public product page.

## 0. Product stack — done

https://github.com/MarshallBuchner/kept/pull/25–#30 + [#38](https://github.com/MarshallBuchner/kept/pull/38) are **merged** (paper **Welcome** + paper **Home**, full-bleed sage home-screen icon, Archive folders, CompleteRegistration + `ttclid`, Get Started → `/?welcome=1`, creatives/runbook, Pixel create path, Checkout header forced to **Kept**). Production already serves `/welcome`.

**Ads URL rule:** until DNS is live use **`https://kept-eosin.vercel.app/welcome`**. After DNS switch to `https://keptapp.ca/welcome`. Never a `*-git-*.vercel.app` preview — those are SSO-gated and will break ad clicks.

---

## 1. TikTok Pixel first (~10 min) → [PIXEL.md](./PIXEL.md)

Unblocks measurement for the first ad.

1. Ads Manager (not the TikTok app) → **Tools → Events Manager → Connect Data Source → Web → Manual Setup**  
   Site URL: `https://kept-eosin.vercel.app` → copy Pixel ID (skip installing TikTok’s snippet — app already has it).  
2. [Env → Production](https://vercel.com/powr4/kept/settings/environment-variables): `NEXT_PUBLIC_TIKTOK_PIXEL_ID=<id>` → **Redeploy**.  
   Or: `PIXEL_ID=<id> VERCEL_TOKEN=… ./scripts/wire-soft-launch-env.sh` · Or GitHub **Actions → Wire soft-launch env** (repo secret `VERCEL_TOKEN` + `pixel_id` input).  
3. Test Events on `https://kept-eosin.vercel.app`: `/welcome` Get Started → `CompleteRegistration`; paywall → `ViewContent`; checkout → `InitiateCheckout`; paid → `CompletePayment`; scan → `ClickButton`.

```bash
PIXEL_ID=YOUR_ID ./scripts/verify-soft-launch.sh https://kept-eosin.vercel.app
```

## 2. Soft post + tiny ad (~20 min) → [ADS.md](./ADS.md)

Upload: `creative/tiktok-paper-live-demo-9x16.mp4`  

**Caption (use until DNS):**  
`Messy receipts → clean files in seconds. Kept — Scan it. Clean it. Keep it. https://kept-eosin.vercel.app/welcome`

Ads Manager → **Create → Auction → Traffic** → Website → optimize **Landing Page View** → destination **`https://kept-eosin.vercel.app/welcome`** · Canada · CAD $5–20/day · 3–5 days · creatives from `creative/`. Full click path: [ADS.md](./ADS.md).

After `keptapp.ca` is live: edit the ad destination + bio link to `https://keptapp.ca/welcome` (no need to rebuild creatives).

## 3. Domain in parallel (~15–30 min) → [DOMAIN.md](./DOMAIN.md)

1. Buy **`keptapp.ca`** — still **available ~USD $11.98/yr** on [Namecheap](https://www.namecheap.com/domains/registration/results/?domain=keptapp.ca) (`.ca` needs Canadian presence). Fallback: `keptscan.ca` same price.  
2. [Vercel → kept → Domains](https://vercel.com/powr4/kept/settings/domains) → add → DNS until **Valid** + HTTPS.  
3. [Env → Production](https://vercel.com/powr4/kept/settings/environment-variables): `NEXT_PUBLIC_APP_URL=https://keptapp.ca` → **Redeploy**.  
4. Point the live ad + soft-post caption at `https://keptapp.ca/welcome`.

```bash
./scripts/verify-soft-launch.sh https://keptapp.ca
```

## 4. Stripe (optional before spend)

Hosted Checkout **header** already forces **Kept** in app.  
Still do once in Dashboard → Settings → **Public details / Branding**: account name **Kept** (receipts/statements). Contact `keptscan@gmail.com`.

## Env (Vercel Production)

| Var | When | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | Step 1 | Pixel ID from Ads Manager |
| `NEXT_PUBLIC_APP_URL` | Step 3 (after DNS) | `https://keptapp.ca` |

## Remaining gates (agent cannot do these)

| Gate | Evidence |
| --- | --- |
| Pixel | Test Events show `CompleteRegistration` |
| Soft post | Live on Kept TikTok (or personal) |
| Tiny ad | Ads Manager delivering to `/welcome` |
| Domain | `curl -I https://keptapp.ca/welcome` → 200 |
| Stripe account name | Dashboard Public details = Kept (Checkout header already forced in app) |
