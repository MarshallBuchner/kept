# App Store listing — Kept (draft for App Store Connect)

Use this when creating the app record and filling metadata.  
Native shell: Capacitor · Bundle ID **`ca.keptapp.app`** · Mac steps: [`MAC.md`](./MAC.md).

**Domain `keptapp.ca` is frozen for now.** Listing and TestFlight use production Vercel:  
`https://kept-eosin.vercel.app`

---

## App information

| Field | Value |
| --- | --- |
| Name | Kept |
| Subtitle (30 chars) | Scan it. Clean it. Keep it. |
| Bundle ID | `ca.keptapp.app` |
| SKU | `kept-ios` |
| Primary language | English (Canada) |
| Category | Productivity (primary) · Finance (secondary, optional) |
| Age rating | 4+ (no unrestricted web, no violence) — confirm in questionnaire |
| Price | Free (Pro via App Store IAP: `ca.keptapp.app.pro.monthly` / `ca.keptapp.app.pro.yearly`) |

---

## Description (paste-ready)

**Promotional text** (170 chars, updatable anytime):

```
Turn messy receipts into clean files in seconds. Scan, tidy, and keep everything on your device — built for Canada.
```

**Description:**

```
Kept turns crumpled receipts and paper clutter into clean, organized files.

• Scan with your camera or import from Photos
• Clean up and export tidy PDFs
• Keep documents on your device
• Free monthly scans & exports — unlock Kept Pro when you need unlimited

Scan it. Clean it. Keep it.
```

**Keywords** (100 chars max, comma-separated, no spaces after commas preferred):

```
receipt,scanner,pdf,document,expense,ocr,scan,organize,paperless,invoice
```

**What's New** (1.0.0):

```
First release — scan receipts, clean them up, and keep tidy PDFs on your device.
```

---

## URLs (App Store Connect)

| Field | URL |
| --- | --- |
| Privacy Policy (required) | `https://kept-eosin.vercel.app/privacy` |
| Support / Marketing | `https://kept-eosin.vercel.app/welcome` |
| Terms (optional link in app) | `https://kept-eosin.vercel.app/terms` |

When a custom domain is bought later, swap these to `https://keptapp.ca/...` and ship a metadata update (no binary required for URL-only changes in many cases — still re-check Connect).

---

## Screenshots (you capture on Mac / Simulator)

App Store requires device-size screenshots. Minimum for iPhone:

1. **6.7"** (iPhone 15 Pro Max / 16 Plus class) — required
2. **6.5"** or **6.1"** as needed for current Connect checklist

Suggested 3–5 frames (paper UI, no fake chrome):

1. Welcome / Get Started  
2. Home — scan entry  
3. Capture / camera prompt  
4. Cleaned result / document  
5. Settings or Pro paywall (honest)

Save under `docs/ios/screenshots/` (git-lfs optional) or keep local until upload.

---

## Privacy Nutrition Labels (App Privacy)

Declare based on current Kept behavior (device-first + App Store IAP in the iOS shell; Stripe + TikTok Pixel on the **website only**):

| Data type | Used for | Linked to identity? | Tracking? |
| --- | --- | --- | --- |
| Photos / Camera (user content) | App functionality | No | No |
| Product interaction / usage (if analytics fire) | Analytics | No (unless you later add accounts) | No in the native iOS shell (TikTok Pixel is disabled there) |
| Purchases (App Store / Apple ID) | App functionality | Yes (via Apple; Kept does not collect card numbers) | No |

**Tracking:** The Capacitor iOS shell disables TikTok Pixel / attribution capture (`isNativeIOS()`). For the App Store build, answer the tracking questionnaire for the **native app** (typically no tracking). The marketing website may still use TikTok Pixel separately.

---

## Export compliance

In App Store Connect / Xcode: app uses only standard HTTPS.  
Typical answer: **exempt** (no custom encryption).  
`ITSAppUsesNonExemptEncryption` = `false` is set in Info.plist.

---

## Review notes (for App Reviewer)

```
Kept is a receipt/document scanner. Core flow: Welcome → scan/import → clean → export PDF.
Demo: use any sample receipt photo from the library.
Free tier has monthly scan/export limits; Pro unlocks via Apple In-App Purchase (StoreKit).
Support: keptscan@gmail.com
Privacy: https://kept-eosin.vercel.app/privacy
```

---

## In-App Purchases (required before Submit for Review)

Create an Auto-Renewable Subscription group **Kept Pro** in App Store Connect:

| Product ID | Reference name | Duration | Price (CA suggested) |
| --- | --- | --- | --- |
| `ca.keptapp.app.pro.monthly` | Kept Pro Monthly | 1 month | CA$2.99 |
| `ca.keptapp.app.pro.yearly` | Kept Pro Yearly | 1 year | CA$19.99 |

Also add localized subscription display name + description, and a Privacy Policy URL on the subscription group.

The iOS shell (`@capgo/native-purchases`) loads these IDs at runtime. Stripe Checkout remains for the **web** app only and is gated off inside Capacitor iOS.

Step-by-step Connect + Sandbox + Archive: [`CONNECT_IAP.md`](./CONNECT_IAP.md).  
Local Xcode StoreKit config: `ios/App/App/Products.storekit`.

---

## Ship order

1. Merge Capacitor / IAP PR → deploy web to Vercel (shell loads prod URL)  
2. Mac: `npm ci && npx cap sync ios && npx cap open ios` (or `./scripts/ios-iap-sync.sh`)  
3. Xcode → Signing & Capabilities → confirm **In-App Purchase** is present + Team selected  
4. Archive → Upload → TestFlight (Sandbox Apple ID to buy) — or Xcode Cloud Deploy to TestFlight  
5. Fill metadata + screenshots  
6. **Submit for Review** only after IAP products are Ready to Submit

Domain purchase is **not** blocking this path.
