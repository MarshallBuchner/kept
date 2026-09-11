# Attach `keptapp.ca` (click path)

Live check (2026-09-11): **`keptapp.ca` and `keptscan.ca` still available** on Namecheap at **USD $11.98/yr** each (renewal same).  
Screenshots: `creative/keptapp-ca-namecheap.webp`, `creative/keptapp-ca-namecheap-2026-09-11.webp`, `creative/keptscan-ca-namecheap.webp`.

**Soft-launch tip:** Pixel + Traffic ads can run on `https://kept-eosin.vercel.app/welcome` while you buy/attach the domain ([MORNING.md](./MORNING.md)).

## A) Buy (fast path)

1. Open [Namecheap — keptapp.ca](https://www.namecheap.com/domains/registration/results/?domain=keptapp.ca) → **Add to Cart** → Checkout.  
   - Prefer **`keptapp.ca`**. Fallback: [keptscan.ca](https://www.namecheap.com/domains/registration/results/?domain=keptscan.ca) (same price) or `keptscan.com`.  
   - **If Add to Cart does nothing:** use a fresh private window, sign in to Namecheap first, or try Cloudflare / another CIRA registrar (automation sessions sometimes hit a dead cart).  
2. Or [Cloudflare Registrar](https://dash.cloudflare.com/?to=/:account/domains/register) if you already have a CF account (at-cost pricing; CF nameservers required).  
3. Any [CIRA-certified registrar](https://www.cira.ca/en/ca-domains/find-a-ca-registrar/) also works.

### CIRA Canadian presence (required for `.ca`)

At checkout you’ll pick a **Canadian Presence Requirements (CPR)** category. Common choices:

| If you are… | Pick roughly… |
| --- | --- |
| Canadian citizen (age of majority) | Canadian citizen |
| Permanent resident living in Canada | Permanent resident |
| Canadian corp (federal/provincial) | Corporation |

Full policy: [CIRA CPR](https://www.cira.ca/en/legal-policy-and-compliance/canadian-presence-requirements/). CIRA may later ask for proof (passport / PR card / corp profile) via Registrant Information Validation — use your real legal name.

## B) Attach on Vercel

1. Vercel → **kept** project → [Settings → Domains](https://vercel.com/powr4/kept/settings/domains) → Add `keptapp.ca` (and `www.keptapp.ca` if you want).
2. DNS:
   - **Namecheap / most registrars:** set nameservers to the values Vercel shows, **or** keep registrar DNS and add the **A / CNAME** records Vercel lists.
   - **Cloudflare Registrar (CF NS locked):** keep CF DNS → add the A/CNAME records Vercel shows.
3. Wait until status is **Valid** and HTTPS works in the browser.

## C) Env + redeploy

Vercel → [Settings → Environment Variables](https://vercel.com/powr4/kept/settings/environment-variables) → **Production**:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://keptapp.ca` |

Redeploy Production (Deployments → … → Redeploy). Stripe Checkout return URLs follow this env.  
Or one-command: `APP_URL=https://keptapp.ca VERCEL_TOKEN=… ./scripts/wire-soft-launch-env.sh` (combine with `PIXEL_ID=…` if wiring both).  
Then point the live TikTok ad + bio at `https://keptapp.ca/welcome`.

## D) Prove it

```bash
./scripts/verify-soft-launch.sh https://keptapp.ca
```

Expect `/`, `/welcome`, `/privacy`, `/terms`, `/og.png` → **200**.
