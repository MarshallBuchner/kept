# Ship Kept iOS with StoreKit IAP — do now

Status on code/main (already done):
- Web IAP + Stripe gated off in native shell (live on `https://kept-eosin.vercel.app`)
- Terms/Privacy mention App Store billing
- Paywall Apple auto-renew disclosure + Restore
- Capgo Native Purchases + In-App Purchase capability
- iOS build **4** (`CURRENT_PROJECT_VERSION`)
- Review screenshot: `docs/ios/screenshots/iap-review-paywall.png`

## A) App Store Connect (you)

1. **Monthly** Review Information → upload  
   https://raw.githubusercontent.com/MarshallBuchner/kept/main/docs/ios/screenshots/iap-review-paywall.png  
   Save. Do **not** Add for Review yet.
2. **‹ Kept Pro** → create **Yearly**  
   - Product ID: `ca.keptapp.app.pro.yearly`  
   - Duration: 1 Year → Create → price **CA$19.99** → localization → same screenshot
3. Group: display name **Kept Pro** + Privacy URL `https://kept-eosin.vercel.app/privacy`
4. **Business → Agreements**: Paid Apps **Active** (tax + banking)
5. **Users and Access → Sandbox → Testers**: create a tester

## B) Mac Archive → TestFlight

```bash
cd ~/Desktop/kept   # or your clone path
git checkout main && git pull
./scripts/ios-iap-sync.sh
```

In Xcode:
1. Signing & Capabilities → confirm **In-App Purchase**
2. Any iOS Device (arm64) → **Product → Archive** → Distribute → App Store Connect
3. Wait for TestFlight build **1.0 (4)** (or higher)

## C) Sandbox purchase (required before Submit)

1. iPhone: Settings → Developer / App Store → **Sandbox Account** → sign in tester
2. Install TestFlight build → open paywall → Buy
3. Confirm **Apple** sheet (not Stripe) → purchase succeeds → **Restore purchases** works

## D) Submit for Review

1. Connect → app version → select build 4+
2. Attach both IAP products (or Add for Review on each)
3. Paste App Review notes from `docs/ios/CONNECT_IAP.md`
4. Submit — **not** a Stripe-only binary

Full detail: `docs/ios/CONNECT_IAP.md`, `docs/ios/MAC.md`, `docs/ios/APP_STORE.md`.
