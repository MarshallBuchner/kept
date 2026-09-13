# App Store Connect — Kept Pro IAP (do this now)

Bundle ID: **`ca.keptapp.app`**  
App record: **Kept Scan** (or **Kept**)

Code expects these product IDs **exactly**:

| Product ID | Plan | Suggested CA price |
| --- | --- | --- |
| `ca.keptapp.app.pro.monthly` | Monthly | CA$2.99 |
| `ca.keptapp.app.pro.yearly` | Yearly | CA$19.99 |

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

---

## 2) Add monthly product

1. **+** create subscription  
2. Reference Name: `Kept Pro Monthly`  
3. Product ID: `ca.keptapp.app.pro.monthly` (**copy-paste; cannot change later**)  
4. Duration: **1 month**  
5. Price: **CA$2.99** (or equivalent)  
6. Localization (English Canada / English US):  
   - Display Name: `Kept Pro Monthly`  
   - Description: `Unlimited scans and PDF exports, billed monthly.`  
7. Save → set availability → mark **Ready to Submit** when asked

---

## 3) Add yearly product

Same as monthly, with:

- Reference Name: `Kept Pro Yearly`  
- Product ID: `ca.keptapp.app.pro.yearly`  
- Duration: **1 year**  
- Price: **CA$19.99**  
- Display Name: `Kept Pro Yearly`  
- Description: `Unlimited scans and PDF exports, billed yearly. Best value.`

---

## 4) Sandbox tester

1. **Users and Access** → **Sandbox** → **Testers** → **+**
2. Create a tester with a **new email** (not your main Apple ID)
3. On iPhone: **Settings → Developer** (or **App Store → Sandbox Account**) → sign in with that tester  
   (Do this **before** tapping Buy in Kept.)

---

## 5) Mac rebuild (after products exist)

```bash
cd ~/Desktop/kept
git checkout main
git pull
npm ci
npx cap sync ios
npx cap open ios
```

In Xcode:

1. Target **App** → **Signing & Capabilities** → **+** → **In-App Purchase**
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

Attach the IAP products to the iOS version when Connect asks.

**Do not submit the old Stripe-only binary.**
