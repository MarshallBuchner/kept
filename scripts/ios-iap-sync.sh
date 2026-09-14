#!/usr/bin/env bash
# Mac helper: pull latest, verify IAP product IDs, sync Capacitor iOS, open Xcode.
# Usage: from repo root → ./scripts/ios-iap-sync.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MONTHLY="ca.keptapp.app.pro.monthly"
YEARLY="ca.keptapp.app.pro.yearly"

echo "== Kept iOS IAP sync =="
echo "Repo: $ROOT"

if ! command -v node >/dev/null; then
  echo "Node is required. Install Node 20+ first." >&2
  exit 1
fi

if [[ ! -f src/lib/iap.ts ]]; then
  echo "Missing src/lib/iap.ts — checkout main (or merge PR #50/#51) first." >&2
  exit 1
fi

if [[ -f scripts/verify-iap-ready.mjs ]]; then
  echo "Running ios:iap:verify (local checks; live URL fetch skipped)…"
  SKIP_LIVE_FETCH=1 node scripts/verify-iap-ready.mjs
else
  if ! grep -q "$MONTHLY" src/lib/iap.ts || ! grep -q "$YEARLY" src/lib/iap.ts; then
    echo "Product IDs in src/lib/iap.ts do not match expected:" >&2
    echo "  $MONTHLY" >&2
    echo "  $YEARLY" >&2
    exit 1
  fi
  echo "OK product IDs in src/lib/iap.ts"

  if [[ -f ios/App/App/Products.storekit ]]; then
    if ! grep -q "$MONTHLY" ios/App/App/Products.storekit || ! grep -q "$YEARLY" ios/App/App/Products.storekit; then
      echo "Products.storekit is missing expected product IDs." >&2
      exit 1
    fi
    echo "OK Products.storekit"
  else
    echo "WARN: ios/App/App/Products.storekit missing (optional for local StoreKit testing)"
  fi
fi

if [[ -f package-lock.json ]]; then
  echo "Running npm ci…"
  npm ci
else
  echo "Running npm install…"
  npm install
fi

if [[ ! -d node_modules/@capgo/native-purchases ]]; then
  echo "Missing @capgo/native-purchases after install." >&2
  exit 1
fi
echo "OK @capgo/native-purchases"

echo "Syncing Capacitor iOS…"
npx cap sync ios

echo
if grep -q 'com.apple.InAppPurchase' ios/App/App.xcodeproj/project.pbxproj 2>/dev/null; then
  echo "OK In-App Purchase capability declared in project.pbxproj"
else
  echo "WARN: com.apple.InAppPurchase not found in project — add capability in Xcode before Archive" >&2
fi

echo
echo "Next:"
echo "  0) Merge PR #65 if not on main yet, then git pull"
echo "  1) Connect: npm run ios:iap:next   (or Actions → ASC upsert Kept Pro IAP)"
echo "  2) Prefer: App Store Connect → Xcode Cloud → workflow → Post-Actions → TestFlight"
echo "     (Archive on main is already green — enable Deploy to TestFlight if missing)"
echo "  3) Else Mac: Xcode → Team selected → Product → Archive → TestFlight"
echo "  4) Sandbox buy (Apple sheet) → Restore → Submit with IAP"
echo "  Checklist: docs/ios/SHIP_NOW.md"
echo
echo "Opening Xcode…"
npx cap open ios
