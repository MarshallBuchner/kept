# Ship Kept iOS with StoreKit IAP — do now

## Status split (read this before Archive)

**Already on `main` / live web** (`https://kept-eosin.vercel.app`):
- Xcode Cloud **Archive - iOS** green; iOS build **5** (`CURRENT_PROJECT_VERSION`; Cloud auto-bumps via `CI_BUILD_NUMBER`)
- Capgo Native Purchases + Stripe gated off in the native shell; Settings Restore + Manage
- Paywall Apple auto-renew disclosure; Terms/Privacy mention App Store billing
- ASC upsert workflow (manual **Run workflow**) — needs GitHub `ASC_*` secrets

**Only on PR [#65](https://github.com/MarshallBuchner/kept/pull/65) — merge before Archive/TestFlight:**
- **In-App Purchase** capability (`com.apple.InAppPurchase`) + StoreKit.framework linked
- Quiet StoreKit entitlement sync (launch + foreground + Capgo `transactionUpdated`)
- App Privacy Manifest (`PrivacyInfo.xcprivacy`)
- Hardened ASC upsert (equalizations, all-territory availability, screenshot replace/size gates) + auto-run on `main` when secrets exist
- `npm run ios:iap:verify` gate + review PNG 1290×2796 + scheme → `Products.storekit`

Do **not** Archive from current `main` expecting IAP capability — that lands with #65.

## 0) Confirm repo is ready

```bash
git pull
npm run ios:iap:verify            # product IDs, Stripe gate, restore UI, build ≥5, live legal
# Optional ASC dry-run (needs secrets or .p8):
npm run ios:iap:asc -- --dry-run
```

CI also runs `ios:iap:verify` on pushes/PRs that touch the repo (`Verify IAP repo readiness`).

## A) App Store Connect (you)

Product IDs (must match code exactly):

| Product ID | Duration | Price |
| --- | --- | --- |
| `ca.keptapp.app.pro.monthly` | 1 Month | CA$2.99 |
| `ca.keptapp.app.pro.yearly` | 1 Year | CA$19.99 |

1. **Monthly** (`ca.keptapp.app.pro.monthly`) Review Information → upload the local file  
   `docs/ios/screenshots/iap-review-paywall.png` (must be ~1290×2796 — after merge + `git pull`).  
   Prefer **Actions → ASC upsert Kept Pro IAP** so the size-validated PNG is uploaded for both products.  
   Save. Do **not** Add for Review yet.
2. **‹ Kept Pro** → create **Yearly**  
   - Product ID: `ca.keptapp.app.pro.yearly`  
   - Duration: 1 Year → Create → price **CA$19.99** → localization → same local screenshot
3. Group: display name **Kept Pro** + Privacy URL `https://kept-eosin.vercel.app/privacy`  
   Put monthly + yearly at the **same subscription level** (level 1) so plan switches are crossgrades.
4. **Business → Agreements**: Paid Apps **Active** (tax + banking)
5. **Users and Access → Sandbox → Testers**: create a tester


## Optional: create products via API (instead of Connect UI)

### Option 1 — GitHub Actions (recommended)

1. Create an App Store Connect API key (Users and Access → Integrations)
2. Repo **Settings → Secrets and variables → Actions** → add:
   - `ASC_ISSUER_ID`
   - `ASC_KEY_ID`
   - `ASC_PRIVATE_KEY` (full `.p8` PEM text)
3. **Actions → ASC upsert Kept Pro IAP → Run workflow** (works on `main` today)  
   After this PR merges, the same workflow also **auto-runs** on relevant pushes to `main` when secrets exist.
4. Still merge this PR before Archive/TestFlight (adds In-App Purchase capability + hardened StoreKit sync).

### Option 2 — local Mac

```bash
export ASC_ISSUER_ID='…'
export ASC_KEY_ID='…'
export ASC_PRIVATE_KEY_PATH="$HOME/AuthKey_XXX.p8"
# Optional if defaults wrong:
# export ASC_APP_ID='6811619551'
# export ASC_GROUP_ID='22382931'
npm run ios:iap:asc
```

Either path creates/updates monthly+yearly, localizations, CAN price + **equalized storefront prices**, **all-territory availability**, **review screenshots**, review notes, group display name, and **app** privacy URL.

Still finish in Connect UI after API/UI create:
- Subscription group **Privacy Policy URL** (`https://kept-eosin.vercel.app/privacy`)
- Paid Apps Active + sandbox tester

## B) TestFlight (prefer Xcode Cloud) — only after #65 is on `main`

**Preferred:** App Store Connect → Xcode Cloud → Archive workflow on post-merge `main` → **Post-Actions → Deploy to TestFlight** (see `docs/ios/MAC.md`). Enable the post-action if missing, then install the Cloud build.

**Else Mac Archive:**

```bash
cd ~/Desktop/kept   # or your clone path
git checkout main && git pull   # must include #65
./scripts/ios-iap-sync.sh
```

In Xcode:
1. Signing & Capabilities → **In-App Purchase** should already be listed (from #65). Confirm your Team is selected.
2. Any iOS Device (arm64) → **Product → Archive** → Distribute → App Store Connect
3. Wait for TestFlight build **1.0 (5)** (or higher)

## C) Sandbox purchase (required before Submit)

1. iPhone: Settings → Developer / App Store → **Sandbox Account** → sign in tester
2. Install TestFlight build → open paywall → Buy
3. Confirm **Apple** sheet (not Stripe) → purchase succeeds → **Restore purchases** works

## D) Submit for Review

1. Connect → app version → select build 5+
2. Attach both IAP products (or Add for Review on each)
3. Paste App Review notes from `docs/ios/CONNECT_IAP.md`
4. Submit — **not** a Stripe-only binary

Full detail: `docs/ios/CONNECT_IAP.md`, `docs/ios/MAC.md`, `docs/ios/APP_STORE.md`.
