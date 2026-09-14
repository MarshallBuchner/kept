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
echo "Next in Xcode:"
echo "  1) Signing & Capabilities → + → In-App Purchase"
echo "  2) (Optional) Scheme → Run → Options → StoreKit Configuration → Products.storekit"
echo "  3) Any iOS Device → Product → Archive → Upload (build should be 4+)"
echo "  4) Connect: create $MONTHLY + $YEARLY if not done — see docs/ios/CONNECT_IAP.md"
echo
echo "Opening Xcode…"
npx cap open ios
