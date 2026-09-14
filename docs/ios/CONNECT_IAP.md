# App Store Connect — Kept Pro IAP (do this now)

Short path: **[SHIP_NOW.md](./SHIP_NOW.md)**.

Bundle ID: **`ca.keptapp.app`**  
App record: **Kept Scan** (or **Kept**)

## Progress checklist

- [x] Web IAP code deployed (PR #50)
- [x] Connect runbook + StoreKit config (PR #51)
- [x] Xcode **In-App Purchase** capability + CapgoNativePurchases (declared in project.pbxproj; confirm Team on Mac before Archive)
- [ ] **Paid Apps** agreement Active (Business → Agreements)
- [ ] Subscription group **Kept Pro** + 2 products (price + localization + review screenshot)
- [ ] Group localization + Privacy Policy URL
- [ ] Sandbox tester created
- [ ] Archive build **5+** → TestFlight
- [ ] Sandbox purchase (Apple sheet, not Stripe)
- [ ] Submit for Review (attach IAP products)

Code expects these product IDs **exactly**:

| Product ID | Plan | Suggested CA price |
| --- | --- | --- |
| `ca.keptapp.app.pro.monthly` | Monthly | CA$2.99 |
| `ca.keptapp.app.pro.yearly` | Yearly | CA$19.99 |

### Paste-ready (monthly)

```
Reference Name: Kept Pro Monthly
Product ID: ca.keptapp.app.pro.monthly
Duration: 1 Month
Display Name: Kept Pro Monthly
Description: Unlimited scans and PDF exports, billed monthly.
```

### Paste-ready (yearly)

```
Reference Name: Kept Pro Yearly
Product ID: ca.keptapp.app.pro.yearly
Duration: 1 Year
Display Name: Kept Pro Yearly
Description: Unlimited scans and PDF exports, billed yearly. Best value.
```

---

## 0) Paid Apps Agreement (blockers if missing)

1. [App Store Connect](https://appstoreconnect.apple.com) → **Business** / **Agreements, Tax, and Banking**
2. Accept **Paid Applications** agreement if shown
3. Complete **Banking** + **Tax** (Canada) until status is Active

IAP products won’t work in sandbox/review without this.

---

## 1) Create the subscription group

1. Apps → **Kept Scan** → **Monetization** → **Subscriptions**
2. **+** create group  
   - Reference name: **Kept Pro**
3. Open the group

### Group localization + Privacy Policy (required)

On the **Kept Pro** group page:

1. Add localization (English Canada / English US):  
   - Subscription Group Display Name: `Kept Pro`
2. **Subscription Group Privacy Policy URL:**  
   `https://kept-eosin.vercel.app/privacy`
3. Save

---

## 2) Add monthly product

**Create dialog** (no price field yet — that’s normal):

1. **+** / **Create** subscription under the Kept Pro group  
2. Reference Name: `Kept Pro Monthly` (or `Monthly`)  
3. Product ID: `ca.keptapp.app.pro.monthly` (**copy-paste; cannot change later**)  
4. Duration: **1 month**  
5. Click **Create**

**On the product page that opens next:**

6. **Subscription Prices** → set base price **CA$2.99** (Canada / all storefronts as needed)  
7. **Localization** (English Canada / English US):  
   - Display Name: `Kept Pro Monthly`  
   - Description: `Unlimited scans and PDF exports, billed monthly.`  
8. **Image (Optional)** — skip (1024×1024 promo art; not required)  
9. **Tax Category** — leave **Match to parent app**  
10. **Review Information** (required before first IAP submit):  
    - **Screenshot**: upload `docs/ios/screenshots/iap-review-paywall.png` from the repo (or any clear iPhone capture of the paywall)  
    - **Review Notes** (optional): `Open Settings → Kept Pro, or hit the paywall after free limit. Buy uses Apple IAP.`  
11. **Save** if enabled. Do **not** click **Add for Review** yet — finish yearly + sandbox first.

Status moves toward **Ready to Submit** once price + localization (+ review screenshot) exist.

---

## 3) Add yearly product

Same flow as monthly:

**Create dialog:**

- Reference Name: `Kept Pro Yearly` (or `Yearly`)  
- Product ID: `ca.keptapp.app.pro.yearly`  
- Duration: **1 year** → **Create**

**Then on the product page:**

- Price: **CA$19.99**  
- Display Name: `Kept Pro Yearly`  
- Description: `Unlimited scans and PDF exports, billed yearly. Best value.`  
- **Review Information** screenshot: same file `docs/ios/screenshots/iap-review-paywall.png` (or yearly selected)  
- Skip optional promo image; leave tax matched  
- Save; defer **Add for Review** until both products + sandbox are done

---

## 4) Sandbox tester

1. **Users and Access** → **Sandbox** → **Testers** → **+**
2. Create a tester with a **new email** (not your main Apple ID)
3. On iPhone: **Settings → Developer** (or **App Store → Sandbox Account**) → sign in with that tester  
   (Do this **before** tapping Buy in Kept.)

---

## 5) Mac rebuild (after products exist)

One-shot (recommended):

```bash
cd ~/Desktop/kept
git pull
./scripts/ios-iap-sync.sh
```

Or manually:

```bash
cd ~/Desktop/kept
git checkout main
git pull
npm ci
npx cap sync ios
npx cap open ios
```

In Xcode:

1. Target **App** → **Signing & Capabilities** → **In-App Purchase** should already be present (project declares `com.apple.InAppPurchase`). Confirm Team / signing.
2. Optional local test: **Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration** → select `App/Products.storekit`
3. **Any iOS Device (arm64)** → **Product → Archive** → upload to TestFlight
4. Install **new** build → open paywall → confirm Apple sheet (not Stripe) → buy with Sandbox → Restore works

---

## 6) Submit for Review

Only after:

- [ ] New build with IAP capability uploaded  
- [ ] Both products Ready to Submit  
- [ ] Sandbox purchase succeeded once  
- [ ] Version metadata + screenshots already filled  

Attach the IAP products to the iOS version when Connect asks (or use **Add for Review** on each subscription once the version is ready).

**Do not submit the old Stripe-only binary.**

### App Review notes (paste into Connect → App Review Information)

```
Kept is a receipt/document scanner.
Core flow: Home → Scan/Import → Crop → Extract → Save → Export PDF.
Demo: import any receipt photo from Photos. No login required.
Free tier: limited monthly scans/exports.
Pro: unlock via Apple In-App Purchase (auto-renewable).
Product IDs: ca.keptapp.app.pro.monthly , ca.keptapp.app.pro.yearly
Sandbox: use any Sandbox Apple ID; Restore Purchases is on the paywall.
Support: keptscan@gmail.com
Privacy: https://kept-eosin.vercel.app/privacy
Terms: https://kept-eosin.vercel.app/terms
```

Uncheck **Sign-in required** unless you added an account system.
