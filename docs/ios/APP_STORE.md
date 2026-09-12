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
| Price | Free (Pro via IAP later; Stripe OK for internal TestFlight only) |

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

Declare based on current Kept behavior (device-first + Stripe + TikTok Pixel on web shell):

| Data type | Used for | Linked to identity? | Tracking? |
| --- | --- | --- | --- |
| Photos / Camera (user content) | App functionality | No | No |
| Product interaction / usage (if analytics fire) | Analytics | No (unless you later add accounts) | Yes if TikTok Pixel used for ads attribution |
| Purchases (Stripe email / payment) | App functionality | Yes (email via Stripe) | No |

**Tracking:** If the iOS shell loads the production site with TikTok Pixel, answer the tracking questionnaire honestly (ATT may apply). For TestFlight-only internal builds you can still ship; for public release decide: keep pixel + ATT prompt, or disable pixel inside native wrapper later.

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
Free tier has monthly scan/export limits; Pro unlock is currently web Stripe for TestFlight —
public release will use Apple IAP (in progress).
Support: keptscan@gmail.com
Privacy: https://kept-eosin.vercel.app/privacy
```

---

## Ship order

1. Merge Capacitor PR → Mac: `npm ci && npm run cap:sync:ios && npm run cap:open:ios`  
2. Sign with your Team → Run on device  
3. Create App Store Connect record (table above)  
4. Archive → Upload → **TestFlight internal**  
5. Fill metadata + screenshots  
6. Before **Submit for Review**: StoreKit IAP for Pro (or approved external-link path)

Domain purchase is **not** blocking this path.
