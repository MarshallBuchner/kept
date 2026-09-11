# Attach `keptapp.ca` (click path)

RDAP still showed **available** for `keptapp.ca` / `keptscan.ca` at last check.

## A) Buy

1. [Cloudflare Registrar](https://dash.cloudflare.com/?to=/:account/domains/register) → search **`keptapp.ca`** → Purchase.  
   - `.ca` requires Canadian presence (individual or corp).  
   - Fallback: `keptscan.ca` or `keptscan.com` via any [CIRA registrar](https://www.cira.ca/en/ca-domains/find-a-ca-registrar/).

## B) Attach on Vercel

1. Vercel → **kept** project → [Settings → Domains](https://vercel.com/powr4/kept/settings/domains) → Add `keptapp.ca` (and `www.keptapp.ca` if you want).
2. DNS:
   - **If registrar allows custom NS:** set nameservers to the values Vercel shows.
   - **If Cloudflare Registrar (CF NS locked):** stay on Cloudflare DNS → add the **A / CNAME** records Vercel lists for the domain.
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
