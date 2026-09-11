# Attach `keptapp.ca` (click path)

Live check (2026-09-11): **`keptapp.ca` and `keptscan.ca` still available** on Namecheap at **USD $11.98/yr** each.  
Screenshots: `creative/keptapp-ca-namecheap.webp`, `creative/keptscan-ca-namecheap.webp`.

## A) Buy (fast path)

1. Open [Namecheap — keptapp.ca](https://www.namecheap.com/domains/registration/results/?domain=keptapp.ca) → **Add to Cart** → Checkout.  
   - `.ca` needs **Canadian presence** (CIRA nexus — citizen, PR, or Canadian org). The warning usually appears at checkout.  
   - Prefer **`keptapp.ca`**. Fallback: [keptscan.ca](https://www.namecheap.com/domains/registration/results/?domain=keptscan.ca) (same price) or `keptscan.com`.  
2. Or [Cloudflare Registrar](https://dash.cloudflare.com/?to=/:account/domains/register) if you already have a CF account (at-cost pricing; CF nameservers required).  
3. Any [CIRA-certified registrar](https://www.cira.ca/en/ca-domains/find-a-ca-registrar/) also works.

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

## D) Prove it

```bash
./scripts/verify-soft-launch.sh https://keptapp.ca
```

Expect `/`, `/welcome`, `/privacy`, `/terms`, `/og.png` → **200**.
