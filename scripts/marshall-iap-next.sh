#!/usr/bin/env bash
# Prints the remaining human gates for Kept StoreKit IAP ship.
# Does not talk to App Store Connect.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Kept IAP — Marshall next steps =="
echo
if [[ -f scripts/verify-iap-ready.mjs ]]; then
  echo "0) Repo gate"
  npm run ios:iap:verify --silent 2>/dev/null || node scripts/verify-iap-ready.mjs
  echo
fi

cat <<'EOF'
1) Merge PR #65 (ios:iap:verify + IAP capability + privacy manifest)
   https://github.com/MarshallBuchner/kept/pull/65

2) App Store Connect API → GitHub secrets, then run ASC upsert
   Settings → Secrets → Actions:
     ASC_ISSUER_ID
     ASC_KEY_ID
     ASC_PRIVATE_KEY   (full .p8 PEM)
   Actions → ASC upsert Kept Pro IAP → Run workflow
   Or Connect UI: monthly+yearly + review screenshot + group Privacy URL
   Product IDs (exact):
     ca.keptapp.app.pro.monthly
     ca.keptapp.app.pro.yearly
   Keep both at subscription level 1. Group Privacy:
     https://kept-eosin.vercel.app/privacy

3) Business → Agreements → Paid Apps = Active (tax + banking)

4) Users and Access → Sandbox → Testers → create tester

5) Mac Archive → TestFlight
   git checkout main && git pull
   ./scripts/ios-iap-sync.sh
   Xcode: Team selected, In-App Purchase present → Archive (build 5+)

6) Sandbox buy on device
   Settings → App Store → Sandbox Account → tester
   TestFlight build → paywall → Buy → Apple sheet (not Stripe) → Restore

7) Submit for Review with both IAP products attached
   Paste review notes from docs/ios/CONNECT_IAP.md
   Do NOT submit a Stripe-only binary.

Canonical: docs/ios/SHIP_NOW.md
EOF
