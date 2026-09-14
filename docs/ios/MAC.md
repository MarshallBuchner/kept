# Kept iOS — Mac steps (Marshall)

Cloud agents can scaffold the Capacitor project; **only your Mac** can open Xcode, sign, and ship to TestFlight / App Store.

## What’s already in the repo

- Capacitor config → `capacitor.config.ts`
- Bundle ID: **`ca.keptapp.app`**
- App name: **Kept**
- Home-screen icon + launch splash: sage **Kept** mark (`public/brand/kept-icon-1024.png` → `ios/.../AppIcon` + `Splash`)
- Shell loads production web: `https://kept-eosin.vercel.app`  
  (switch to `https://keptapp.ca` after DNS — set `CAPACITOR_SERVER_URL` or edit config, then re-sync)
- Fallback page: `mobile/www/`
- Native project: `ios/` (after first `npx cap add ios` / sync)

### After pulling icon/splash updates

iOS caches icons aggressively. On the Mac:

```bash
cd ~/Desktop/kept   # or your clone
git pull
npx cap sync ios
npx cap open ios
```

Then delete the old **Kept** app from the iPhone → **Product → Clean Build Folder** → Run again (or Archive). You should see the green **K** on the Home Screen, not the blue Capacitor logo.

## One-time Mac setup

1. Install **Xcode** (App Store) → open once → install extra components.
2. Install **CocoaPods** if needed: `sudo gem install cocoapods` (or Homebrew `brew install cocoapods`).
3. Apple Developer account (you said this is done) → note Team ID in [developer.apple.com/account](https://developer.apple.com/account).
4. Clone Kept, use Node 20+:

```bash
cd kept
npm ci
npx cap sync ios
npx cap open ios
```

## Xcode (first run)

1. Select target **App** → **Signing & Capabilities**.
2. Team: your Apple Developer team.
3. Bundle Identifier must stay **`ca.keptapp.app`** (create the App ID in the developer portal if Xcode doesn’t auto-create it).
4. Run on a simulator or your iPhone (cable / wireless debug).

### Permissions already declared

Info.plist should include camera / photo library usage strings (receipt scanning). If Xcode warns they’re missing, add:

- `NSCameraUsageDescription` — “Kept needs the camera to scan receipts and documents.”
- `NSPhotoLibraryUsageDescription` — “Kept needs photo access to import receipts.”

## App Store Connect

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → **+** → New App.
2. Platform iOS, name **Kept**, bundle ID **`ca.keptapp.app`**, SKU e.g. `kept-ios`.
3. In Xcode: **Product → Archive** → **Distribute App** → App Store Connect → Upload.
4. Enable **TestFlight** internal testing for yourself first.

## Payments (important before App Review)

| Stage | Payment rail |
|-------|----------------|
| Web / PWA | Stripe Checkout |
| Capacitor iOS (TestFlight + App Store) | **StoreKit IAP only** (Stripe gated off) |

**Full click-path (Connect products + Sandbox + Archive):** [`CONNECT_IAP.md`](./CONNECT_IAP.md)

Product IDs (must match App Store Connect):

- `ca.keptapp.app.pro.monthly`
- `ca.keptapp.app.pro.yearly`

Local StoreKit file for Xcode testing: `ios/App/App/Products.storekit`

Mac one-shot: `./scripts/ios-iap-sync.sh`

After pulling IAP code on the Mac:

```bash
cd ~/Desktop/kept   # or your clone
git pull
npm ci
npx cap sync ios
npx cap open ios
```

In Xcode: target **App** → **Signing & Capabilities** → **+ Capability** → **In-App Purchase**.

Test with a Sandbox Apple ID (Settings → App Store → Sandbox Account). Use **Restore purchases** on the paywall if needed.

Owner promo `KEPT-OWNER` remains Settings / paywall in-app (not Stripe, not IAP).

## Soft-launch vs App Store

Domain buy (`keptapp.ca`) is **frozen** — not required for TestFlight.  
Use `https://kept-eosin.vercel.app` for the shell until Marshall resumes domain work.  
Listing copy + Connect fields: [`APP_STORE.md`](./APP_STORE.md).

## Useful commands

```bash
npm run cap:sync          # copy web + update native projects
npm run cap:open:ios      # open Xcode
# Later, if domain is live:
# CAPACITOR_SERVER_URL=https://keptapp.ca npx cap sync ios
```

## If something breaks

- White screen: production URL down, or ATS blocking a host — check `server.allowNavigation` in `capacitor.config.ts`.
- Camera noop: confirm Info.plist usage strings + grant permission on device.
- Signing errors: Bundle ID mismatch or Team not selected.
