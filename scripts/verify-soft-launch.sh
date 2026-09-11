#!/usr/bin/env bash
# Soft-launch smoke checks for Kept (domain + optional Pixel).
# Usage:
#   ./scripts/verify-soft-launch.sh
#   ./scripts/verify-soft-launch.sh https://keptapp.ca
#   PIXEL_ID=CXXXX ./scripts/verify-soft-launch.sh https://keptapp.ca

set -euo pipefail

BASE="${1:-https://kept-eosin.vercel.app}"
BASE="${BASE%/}"
FAIL=0
NOTES=()

ok() { printf '  OK  %s\n' "$1"; }
bad() { printf '  FAIL %s\n' "$1"; FAIL=1; }
note() { NOTES+=("$1"); printf '  NOTE %s\n' "$1"; }

echo "Soft-launch verify → $BASE"

for path in / /welcome /privacy /terms /og.png; do
  code=$(curl -sL -o /dev/null -w '%{http_code}' "$BASE$path" || true)
  if [[ "$code" == "200" ]]; then
    ok "$path → $code"
  else
    bad "$path → $code (want 200)"
  fi
done

html=$(curl -sL "$BASE/" || true)
welcome=$(curl -sL "$BASE/welcome" || true)

if echo "$html" | grep -qi 'Scan it. Clean it. Keep it\|Kept'; then
  ok "brand/tagline present on /"
else
  bad "brand/tagline missing on /"
fi

if echo "$welcome" | grep -qi 'Get Started\|Privacy\|Terms'; then
  ok "/welcome has Get Started + legal links"
else
  bad "/welcome missing Get Started or Privacy/Terms"
fi

if [[ -n "${PIXEL_ID:-}" ]]; then
  if echo "$html$welcome" | grep -q "$PIXEL_ID"; then
    ok "Pixel ID $PIXEL_ID found in HTML/JS payload"
  elif echo "$html$welcome" | grep -qi 'TikTokPixel\|analytics.tiktok.com\|TiktokAnalyticsObject\|ttq.load'; then
    ok "TikTok pixel loader referenced (confirm ID in TikTok Test Events)"
  else
    bad "Pixel ID not visible — set NEXT_PUBLIC_TIKTOK_PIXEL_ID on Vercel Production and redeploy"
  fi
else
  if echo "$html$welcome" | grep -qi 'analytics.tiktok.com\|ttq.load'; then
    ok "TikTok analytics script present"
  else
    note "Pixel still off (set PIXEL_ID=... to assert; empty env keeps pixel off)"
  fi
fi

host=$(echo "$BASE" | sed -E 's#https?://##; s#/.*##')
if [[ "$host" == *vercel.app* ]]; then
  note "still on vercel.app — buy/attach keptapp.ca, set NEXT_PUBLIC_APP_URL, redeploy, re-run"
fi

if [[ "$host" == "keptapp.ca" || "$host" == "www.keptapp.ca" ]]; then
  ok "checking custom domain origin"
fi

echo
echo "Remaining Marshall gates (if any NOTE/FAIL above):"
echo "  1. Ads Manager Pixel → NEXT_PUBLIC_TIKTOK_PIXEL_ID → redeploy"
echo "  2. Soft post + Traffic ad to /welcome (never a git-preview URL)"
echo "  3. Buy+attach keptapp.ca → NEXT_PUBLIC_APP_URL → redeploy (parallel OK)"
echo "  4. Stripe Dashboard Public details → Kept (Checkout header already forced in app)"

if [[ "$FAIL" -ne 0 ]]; then
  echo "Result: FAIL"
  exit 1
fi
echo "Result: PASS"
exit 0
